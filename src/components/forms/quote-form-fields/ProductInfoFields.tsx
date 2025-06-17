
import { Control } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface ProductInfoFieldsProps {
  control: Control<any>;
  index: number;
}

export const ProductInfoFields = ({ control, index }: ProductInfoFieldsProps) => {
  const handleOpenUrl = (url: string) => {
    if (url && url.trim()) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
      <FormField
        control={control}
        name={`items.${index}.productUrl`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Product URL</FormLabel>
            <FormControl>
              <div className="flex gap-2">
                <Input placeholder="https://www.amazon.com/product-link" {...field} />
                {field.value && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenUrl(field.value)}
                    className="shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`items.${index}.productName`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Product Name (Optional)</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Apple MacBook Pro 16-inch" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`items.${index}.options`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Options (Size, Color, etc.)</FormLabel>
            <FormControl>
              <Textarea placeholder="e.g., Color: Space Gray, Size: 1TB" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};
