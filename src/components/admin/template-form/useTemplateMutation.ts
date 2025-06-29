
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TemplateFormValues } from "./types";

export const useTemplateMutation = (template: any, onOpenChange: (isOpen: boolean) => void) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (values: TemplateFormValues) => {
            const dataToUpsert = {
                template_name: values.template_name,
                item_price: values.item_price || null,
                item_weight: values.item_weight || null,
                product_name: values.product_name || null,
                options: values.options || null,
                image_url: values.image_url || null,
                product_url: values.product_url || null,
                quantity: values.quantity,
            };

            if (template) {
                const { error } = await supabase.from("quote_templates").update(dataToUpsert).eq("id", template.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("quote_templates").insert(dataToUpsert);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            toast({
                title: template ? "Template Updated" : "Template Created",
                description: `The template has been successfully ${template ? 'updated' : 'created'}.`,
            });
            queryClient.invalidateQueries({ queryKey: ['quote-templates'] });
            onOpenChange(false);
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });
};
