import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Control, UseFieldArrayRemove } from "react-hook-form";
import { ProductInfoFields } from "./ProductInfoFields";
import { ProductImageField } from "./ProductImageField";
import { Trash2, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QuoteItemProps {
  index: number;
  remove: UseFieldArrayRemove;
  control: Control<any>;
}

const QuoteItem = ({ index, remove, control }: QuoteItemProps) => {
  return (
    <Card className="border-2 border-border hover:border-primary/20 transition-colors">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Product {index + 1}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Tell us about this item
              </p>
            </div>
          </div>
          {index > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(index)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Image */}
          <div className="lg:col-span-1">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <h4 className="font-medium text-sm">Product Image</h4>
                <Badge variant="secondary" className="text-xs">Optional</Badge>
              </div>
              <ProductImageField control={control} index={index} />
            </div>
          </div>
          
          {/* Product Details */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              <ProductInfoFields control={control} index={index} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuoteItem;
