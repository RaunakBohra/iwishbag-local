
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { QuoteTemplate } from "./QuoteTemplatesPage";
import { useEffect } from "react";
import { templateFormSchema, TemplateFormValues, CreateOrEditTemplateDialogProps } from "./template-form/types";
import { TemplateFormFields } from "./template-form/TemplateFormFields";
import { useTemplateMutation } from "./template-form/useTemplateMutation";

interface Props extends CreateOrEditTemplateDialogProps {
    template?: QuoteTemplate;
}

export const CreateOrEditTemplateDialog = ({ isOpen, onOpenChange, template }: Props) => {
    const form = useForm<TemplateFormValues>({
        resolver: zodResolver(templateFormSchema),
        defaultValues: {
            template_name: "",
            product_name: "",
            item_price: "",
            item_weight: "",
            quantity: 1,
            options: "",
            image_url: "",
            product_url: "",
        },
    });

    useEffect(() => {
        if (isOpen && template) {
            form.reset({
                template_name: template.template_name,
                product_name: template.product_name || "",
                item_price: template.item_price || "",
                item_weight: template.item_weight || "",
                quantity: template.quantity,
                options: template.options || "",
                image_url: template.image_url || "",
                product_url: template.product_url || "",
            });
        } else if (isOpen && !template) {
            form.reset();
        }
    }, [template, form, isOpen]);

    const mutation = useTemplateMutation(template, onOpenChange);

    const onSubmit = (values: TemplateFormValues) => {
        mutation.mutate(values);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                    <DialogTitle>{template ? "Edit" : "Create"} Quote Template</DialogTitle>
                    <DialogDescription>
                        {template ? "Edit the details of your quote template." : "Create a new template for frequently quoted products."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
                        <TemplateFormFields control={form.control} />
                        <DialogFooter className="sticky bottom-0 bg-background pt-4">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending ? "Saving..." : "Save Template"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
