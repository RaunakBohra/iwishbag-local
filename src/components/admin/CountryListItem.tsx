import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tables } from '@/integrations/supabase/types';
import { Trash2, Edit, ShoppingCart, Truck } from 'lucide-react';

type CountrySetting = Tables<'country_settings'>;

interface CountryListItemProps {
  country: CountrySetting;
  onEdit: (country: CountrySetting) => void;
  onDelete: (code: string) => void;
}

export const CountryListItem = ({ country, onEdit, onDelete }: CountryListItemProps) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="grid grid-cols-4 gap-4 flex-1">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <strong>
                  {country.name} ({country.code})
                </strong>
                <div className="flex gap-1">
                  <Badge
                    variant={country.purchase_allowed ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    <ShoppingCart className="w-3 h-3 mr-1" />
                    {country.purchase_allowed ? 'Purchase' : 'No Purchase'}
                  </Badge>
                  <Badge
                    variant={country.shipping_allowed ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    <Truck className="w-3 h-3 mr-1" />
                    {country.shipping_allowed ? 'Shipping' : 'No Shipping'}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Currency: {country.currency.toUpperCase()}
              </p>
            </div>
            <div>
              <p className="text-sm">Rate from USD: {country.rate_from_usd}</p>
              <p className="text-sm">VAT: {country.vat}%</p>
            </div>
            <div>
              <p className="text-sm">
                Min Shipping: {country.min_shipping} {country.currency}
              </p>
              <p className="text-sm">Weight Unit: {country.weight_unit}</p>
            </div>
            <div>
              <p className="text-sm">
                Gateway Fee: {country.payment_gateway_fixed_fee} {country.currency} +{' '}
                {country.payment_gateway_percent_fee}%
              </p>
              <p className="text-sm font-medium">
                Gateway: <span className="font-normal capitalize">{country.payment_gateway}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onEdit(country)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onDelete(country.code)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
