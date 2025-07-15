import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { ImageUpload } from "@/components/ui/image-upload";
import { Control, useWatch } from "react-hook-form";
import { useEffect } from "react";

interface ProductAnalysisResult {
  imageUrl?: string;
  productName?: string;
  price?: number;
  weight?: number;
}

interface ProductImageFieldProps {
  control: Control<Record<string, unknown>>;
  index: number;
  analysisResult?: ProductAnalysisResult;
}

export const ProductImageField = ({ control, index, analysisResult }: ProductImageFieldProps) => {
  // Watch the image URL field
  const imageUrl = useWatch({
    control,
    name: `items.${index}.imageUrl`
  });

  // Auto-set image URL when analysis result is available
  useEffect(() => {
    if (analysisResult?.imageUrl && !imageUrl) {
      // This will be handled by the parent component through setValue
    }
  }, [analysisResult, imageUrl]);

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
