import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Control, UseFieldArrayRemove } from "react-hook-form";
import { ProductInfoFields } from "./ProductInfoFields";
import { ProductImageField } from "./ProductImageField";
import { Trash2 } from "lucide-react";

interface QuoteItemProps {
  index: number;
  remove: UseFieldArrayRemove;
  control: Control<any>;
}

const QuoteItem = ({ index, remove, control }: QuoteItemProps) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Item {index + 1}</CardTitle>
          {index > 0 && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => remove(index)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <ProductImageField control={control} index={index} />
          <div className="flex-1">
            <ProductInfoFields control={control} index={index} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuoteItem;
