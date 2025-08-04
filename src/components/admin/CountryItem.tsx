import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface Country {
  code: string;
  name: string;
  currency: string;
  is_active: boolean;
  purchase_allowed: boolean;
  shipping_allowed: boolean;
  exchange_rate?: number;
  payment_gateway?: string;
  display_name?: string;
}

interface CountryItemProps {
  country: Country;
  isSelected: boolean;
  onSelectionChange: (selected: boolean) => void;
  onEdit: (country: Country) => void;
}

export const CountryItem = ({
  country,
  isSelected,
  onSelectionChange,
  onEdit
}: CountryItemProps) => {
  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelectionChange}
            aria-label={`Select ${country.name}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-gray-900">
                {country.display_name || country.name}
              </h4>
              <span className="text-sm text-gray-500">({country.code})</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-gray-600">{country.currency}</span>
              {country.exchange_rate && (
                <span className="text-sm text-gray-500">
                  Rate: {country.exchange_rate.toFixed(4)}
                </span>
              )}
              {country.payment_gateway && (
                <span className="text-sm text-gray-500">
                  Gateway: {country.payment_gateway}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <Badge 
              variant={country.is_active ? "default" : "secondary"}
              className="text-xs"
            >
              {country.is_active ? "Active" : "Inactive"}
            </Badge>
            {country.purchase_allowed && (
              <Badge variant="outline" className="text-xs">
                Purchase
              </Badge>
            )}
            {country.shipping_allowed && (
              <Badge variant="outline" className="text-xs">
                Shipping
              </Badge>
            )}
          </div>
          <Button
            onClick={() => onEdit(country)}
            variant="ghost"
            size="sm"
            className="ml-2"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};