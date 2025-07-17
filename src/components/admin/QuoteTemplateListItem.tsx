import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QuoteTemplate } from './QuoteTemplatesPage';

interface QuoteTemplateListItemProps {
  template: QuoteTemplate;
  onEdit: (template: QuoteTemplate) => void;
  onDelete: (id: string) => void;
}

export const QuoteTemplateListItem = ({
  template,
  onEdit,
  onDelete,
}: QuoteTemplateListItemProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{template.template_name}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onEdit(template)}>
              Edit
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onDelete(template.id)}>
              Delete
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="font-medium">Product Name</p>
            <p className="text-muted-foreground">{template.product_name || 'N/A'}</p>
          </div>
          <div>
            <p className="font-medium">Price</p>
            <p className="text-muted-foreground">${template.item_price || 'N/A'}</p>
          </div>
          <div>
            <p className="font-medium">Weight</p>
            <p className="text-muted-foreground">{template.item_weight || 'N/A'}</p>
          </div>
          <div>
            <p className="font-medium">Quantity</p>
            <p className="text-muted-foreground">{template.quantity}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
