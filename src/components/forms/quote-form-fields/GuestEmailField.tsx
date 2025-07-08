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

interface GuestEmailFieldProps {
  control: Control<any>;
  setValue: UseFormSetValue<any>;
  enableUserSearch?: boolean;
}

const fetchUserEmails = async () => {
  console.log("Fetching user emails...");
  
  // First fetch registered users from profiles
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .not("email", "is", null)
    .order("email");

  console.log("Profiles query result:", { profiles, profilesError });

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
    enabled: enableUserSearch,
    onSuccess: (data) => {
      console.log("Fetched user emails:", data);
    },
    onError: (error) => {
      console.error("Failed to fetch user emails:", error);
    }
  });

  const handleSelect = (email: string, userId: string | null) => {
    setValue("email", email, { shouldValidate: true });
    if (enableUserSearch) {
      setValue("userId", userId);
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
          <FormLabel>Customer Email</FormLabel>
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
                    : "Select or type an email..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[550px] p-0">
              <Command>
                <CommandInput
                  placeholder="Search email..."
                  value={search}
                  onValueChange={setSearch}
                />
                <CommandList>
                  {isLoading && (
                    <div className="p-2 text-sm text-center">Loading...</div>
                  )}
                  {!isLoading && filteredUsers.length === 0 && search.length > 0 && (
                     <CommandItem
                       onSelect={() => handleSelect(search, null)}
                       className="cursor-pointer"
                     >
                       Use new email: "{search}"
                     </CommandItem>
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
