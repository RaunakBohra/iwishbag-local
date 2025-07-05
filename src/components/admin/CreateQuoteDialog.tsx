import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import QuoteItem from "@/components/forms/quote-form-fields/QuoteItem";
import { Plus } from "lucide-react";
import { CountryField } from "@/components/forms/quote-form-fields/CountryField";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { GuestEmailField } from "@/components/forms/quote-form-fields/GuestEmailField";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormControl as SelectFormControl, FormItem, FormLabel } from "@/components/ui/form";
import { useStatusManagement } from "@/hooks/useStatusManagement";

interface CreateQuoteDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onQuoteCreated: (quoteId: string) => void;
}

const quoteItemSchema = z.object({
  productUrl: z.string().optional(),
  productName: z.string().optional(),
  quantity: z.coerce.number().min(1, { message: "Quantity must be at least 1." }),
  options: z.string().optional(),
  imageUrl: z.string().optional(),
}).superRefine((data, ctx) => {
  const { productUrl, imageUrl, productName } = data;
  
  if (productUrl && !z.string().url().safeParse(productUrl).success) {
    ctx.addIssue({
      code: z.ZodIssueCode.invalid_string,
      validation: 'url',
      message: "Please enter a valid URL.",
      path: ["productUrl"],
    });
  }

  if (!productUrl && !imageUrl && !productName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please provide a Product URL, Name, or upload an image.",
      path: ["productUrl"],
    });
  }
});


const formSchema = z.object({
  items: z.array(quoteItemSchema).min(1, "Please add at least one item."),
  countryCode: z.string().min(1, { message: "Please select a country." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  userId: z.string().optional(),
});


export const CreateQuoteDialog = ({ isOpen, onOpenChange, onQuoteCreated }: CreateQuoteDialogProps) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const { data: templates, isLoading: templatesLoading } = useQuery({
        queryKey: ['quote-templates'],
        queryFn: async () => {
            const { data, error } = await supabase.from('quote_templates').select('*').order('template_name');
            if (error) throw new Error(error.message);
            return data || [];
        }
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
          items: [{
            productUrl: "",
            productName: "",
            quantity: 1,
            options: "",
            imageUrl: "",
          }],
          email: "",
          countryCode: "",
          userId: undefined,
        },
      });
      
      const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items",
      });

    const handleTemplateSelect = (templateId: string) => {
        const template = templates?.find(t => t.id === templateId);
        if (!template) return;

        form.setValue('items.0.productName', template.product_name || "", { shouldValidate: true });
        form.setValue('items.0.productUrl', template.product_url || "", { shouldValidate: true });
        form.setValue('items.0.quantity', template.quantity || 1, { shouldValidate: true });
        form.setValue('items.0.options', template.options || "", { shouldValidate: true });
        form.setValue('items.0.imageUrl', template.image_url || "", { shouldValidate: true });
    };

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
    
        const { items, countryCode, email, userId } = values;
    
        // Get default status from status management
        const { getDefaultQuoteStatus } = useStatusManagement();
        const defaultStatus = getDefaultQuoteStatus();

        const { data: quote, error: quoteError } = await supabase
          .from("quotes")
          .insert({
            email,
            country_code: countryCode,
            status: defaultStatus,
            user_id: userId || null,
          })
          .select('id')
          .single();
    
        if (quoteError || !quote) {
          console.error("Error inserting quote:", quoteError);
          toast({
            title: "Error",
            description: "There was an error creating the quote. Please try again.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
    
        const quoteItemsToInsert = items.map(item => ({
            quote_id: quote.id,
            product_url: item.productUrl,
            product_name: item.productName,
            quantity: item.quantity,
            options: item.options,
            image_url: item.imageUrl,
            item_currency: 'USD',
            item_price: 0,
            item_weight: 0,
        }));
    
        const { error: itemsError } = await supabase.from("quote_items").insert(quoteItemsToInsert);
    
        if (itemsError) {
          console.error("Error inserting quote items:", itemsError);
          await supabase.from('quotes').delete().eq('id', quote.id);

          toast({
            title: "Error",
            description: "There was an error saving the items for your quote. Please try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Quote Created!",
            description: "The new quote has been successfully created.",
          });
          form.reset();
          onQuoteCreated(quote.id);
        }
        setLoading(false);
      }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                    <DialogTitle>Create New Quote</DialogTitle>
                    <DialogDescription>
                        Fill in the details below to create a new quote request for a customer.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[80vh] overflow-y-auto p-4">
                        <FormItem>
                            <FormLabel>Use a Template (Optional)</FormLabel>
                            <Select onValueChange={handleTemplateSelect} disabled={templatesLoading}>
                                <SelectFormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a template to pre-fill item details" />
                                    </SelectTrigger>
                                </SelectFormControl>
                                <SelectContent>
                                    {templates?.map(template => (
                                        <SelectItem key={template.id} value={template.id}>
                                            {template.template_name}
                                        </SelectItem>
                                    ))}
                                    {templates?.length === 0 && <SelectItem value="none" disabled>No templates available</SelectItem>}
                                </SelectContent>
                            </Select>
                        </FormItem>

                        <GuestEmailField control={form.control} setValue={form.setValue} enableUserSearch={true} />
                        <CountryField control={form.control} isLoading={loading} filter="purchase" />
                        
                        <div className="space-y-4">
                            {fields.map((field, index) => (
                                <QuoteItem 
                                    key={field.id}
                                    index={index}
                                    remove={remove}
                                    control={form.control}
                                    setValue={form.setValue}
                                />
                            ))}
                        </div>
                        
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => append({ productUrl: "", productName: "", quantity: 1, options: "", imageUrl: "" })}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Another Item
                        </Button>

                        <DialogFooter className="sticky bottom-0 bg-background pt-4">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Creating..." : "Create Quote"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
