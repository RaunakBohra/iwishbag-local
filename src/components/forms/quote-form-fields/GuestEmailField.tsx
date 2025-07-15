import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Control, UseFormSetValue } from "react-hook-form";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { QuoteFormValues } from "@/components/forms/quote-form-validation";

interface GuestEmailFieldProps {
  control: Control<QuoteFormValues>;
  setValue: UseFormSetValue<QuoteFormValues>;
  enableUserSearch?: boolean;
}

const fetchUserEmails = async () => {
  
  // First fetch registered users from profiles
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .not("email", "is", null)
    .order("email");


  if (profilesError) {
    console.error("Error fetching user profiles:", profilesError);
  }

  // Also fetch unique emails from quotes (for guest users)
  const { data: quoteEmails, error: quotesError } = await supabase
    .from("quotes")
    .select("email, user_id")
    .not("email", "is", null)
    .is("user_id", null); // Only get guest emails

  if (quotesError) {
    console.error("Error fetching quote emails:", quotesError);
  }

  const distinctUsers: { email: string; userId: string | null; name?: string }[] = [];
  const seenEmails = new Set<string>();

  // Add registered users first
  if (profiles) {
    profiles.forEach((profile) => {
      if (profile.email && !seenEmails.has(profile.email)) {
        seenEmails.add(profile.email);
        distinctUsers.push({ 
          email: profile.email, 
          userId: profile.id,
          name: profile.full_name 
        });
      }
    });
  }

  // Add guest emails from quotes
  if (quoteEmails) {
    quoteEmails.forEach((item) => {
      if (item.email && !seenEmails.has(item.email)) {
        seenEmails.add(item.email);
        distinctUsers.push({ 
          email: item.email, 
          userId: null 
        });
      }
    });
  }

  return distinctUsers;
};

export const GuestEmailField = ({
  control,
  setValue,
  enableUserSearch = false,
}: GuestEmailFieldProps) => {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["user-emails-for-quote"],
    queryFn: fetchUserEmails,
    enabled: enableUserSearch
  });

  const handleSelect = (email: string, userId: string | null) => {
    setValue("email", email, { shouldValidate: true });
    if (enableUserSearch) {
      setValue("userId", userId, { shouldValidate: true });
    }
    setOpen(false);
    setSearch("");
  };

  const filteredUsers = search
    ? users.filter((u) =>
        u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;
    

  return (
    <FormField
      control={control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Customer Email (Optional)</FormLabel>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "w-full justify-between",
                    !field.value && "text-muted-foreground"
                  )}
                  disabled={isLoading && enableUserSearch}
                >
                  {field.value
                    ? field.value
                    : isLoading && enableUserSearch
                    ? "Loading emails..."
                    : "Select email or leave empty..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[550px] p-0">
              <Command>
                <CommandInput
                  placeholder="Search or type new email..."
                  value={search}
                  onValueChange={setSearch}
                  onKeyDown={(e) => {
                    // Handle Enter key for new email
                    if (e.key === 'Enter' && 
                        search.length > 0 && 
                        search.includes('@') && 
                        search.includes('.') &&
                        !filteredUsers.some(u => u.email === search)) {
                      e.preventDefault();
                      handleSelect(search, null);
                      setSearch("");
                    }
                  }}
                />
                <CommandList>
                  {isLoading && (
                    <div className="p-2 text-sm text-center">Loading...</div>
                  )}
                  {!isLoading && search.length > 0 && !filteredUsers.some(u => u.email === search) && (
                     <>
                       {/* Show email validation hint if not valid */}
                       {search.includes('@') && search.includes('.') ? (
                         <CommandItem
                           value={search}
                           onSelect={() => {
                             handleSelect(search, null);
                             setSearch("");
                           }}
                           className="cursor-pointer"
                         >
                           Use new email: "{search}"
                         </CommandItem>
                       ) : (
                         <div className="p-2 text-sm text-muted-foreground text-center">
                           Type a valid email address (e.g., user@example.com)
                         </div>
                       )}
                     </>
                   )}
                  {filteredUsers.some(u => u.userId) && (
                    <CommandGroup heading="Registered Users">
                      {filteredUsers.filter(u => u.userId).map((user) => (
                        <CommandItem
                          value={user.email}
                          key={user.email}
                          onSelect={() => handleSelect(user.email, user.userId)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              field.value === user.email
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{user.email}</span>
                            {user.name && (
                              <span className="text-sm text-muted-foreground">{user.name}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {filteredUsers.some(u => !u.userId) && (
                    <CommandGroup heading="Guest Emails">
                      {filteredUsers.filter(u => !u.userId).map((user) => (
                        <CommandItem
                          value={user.email}
                          key={user.email}
                          onSelect={() => handleSelect(user.email, user.userId)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              field.value === user.email
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{user.email}</span>
                            <span className="text-xs text-muted-foreground">(Guest)</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
