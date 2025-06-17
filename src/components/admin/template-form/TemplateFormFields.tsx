
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Control } from "react-hook-form";
import { TemplateFormValues } from "./types";

interface TemplateFormFieldsProps {
    control: Control<TemplateFormValues>;
}

export const TemplateFormFields = ({ control }: TemplateFormFieldsProps) => {
    return (
        <>
            <FormField
                control={control}
                name="template_name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Template Name</FormLabel>
                        <FormControl><Input placeholder="e.g., Standard T-Shirt" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={control}
                    name="product_name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Product Name</FormLabel>
                            <FormControl><Input placeholder="e.g., Gildan 5000" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name="quantity"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl><Input type="number" min="1" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={control}
                    name="item_price"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Price (USD)</FormLabel>
                            <FormControl><Input type="number" placeholder="e.g., 15.99" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name="item_weight"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Weight (lbs)</FormLabel>
                            <FormControl><Input type="number" placeholder="e.g., 0.5" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <FormField
                control={control}
                name="options"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Options (e.g., size, color)</FormLabel>
                        <FormControl>
                            <Textarea placeholder="e.g., Size: Large, Color: Red" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={control}
                name="product_url"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Product URL</FormLabel>
                        <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={control}
                name="image_url"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Image URL</FormLabel>
                        <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </>
    );
};
