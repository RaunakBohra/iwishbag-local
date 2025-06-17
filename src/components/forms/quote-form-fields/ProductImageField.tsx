
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { ImageUpload } from "@/components/ui/image-upload";
import { Control } from "react-hook-form";

interface ProductImageFieldProps {
  control: Control<any>;
  index: number;
}

export const ProductImageField = ({ control, index }: ProductImageFieldProps) => {
  return (
    <FormField
      control={control}
      name={`items.${index}.imageUrl`}
      render={({ field }) => (
        <FormItem className="w-16">
          <FormLabel className="text-xs">Image/File</FormLabel>
          <FormControl>
            <div className="w-16 h-16">
              <ImageUpload
                currentImageUrl={field.value}
                onImageUpload={field.onChange}
                onImageRemove={() => field.onChange("")}
              />
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
