import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tables } from '@/integrations/supabase/types';
import { Trash2, Edit, ShoppingCart, Truck, CreditCard, Globe, TrendingUp, Package } from 'lucide-react';

type CountrySetting = Tables<'country_settings'>;

interface CountryListItemProps {
  country: CountrySetting;
  onEdit: (country: CountrySetting) => void;
  onDelete: (code: string) => void;
}

export const CountryListItem = ({ country, onEdit, onDelete }: CountryListItemProps) => {
  return (
    <div className="border border-gray-200 rounded-lg hover:border-gray-300 transition-colors duration-200 bg-white">
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Globe className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {country.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {country.code} • {country.currency.toUpperCase()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <Badge
                    variant={country.purchase_allowed ? 'default' : 'secondary'}
                    className={`text-xs ${
                      country.purchase_allowed
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}
                  >
                    <ShoppingCart className="w-3 h-3 mr-1" />
                    {country.purchase_allowed ? 'Purchase' : 'No Purchase'}
                  </Badge>
                  <Badge
                    variant={country.shipping_allowed ? 'default' : 'secondary'}
                    className={`text-xs ${
                      country.shipping_allowed
                        ? 'bg-blue-100 text-blue-700 border-blue-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}
                  >
                    <Truck className="w-3 h-3 mr-1" />
                    {country.shipping_allowed ? 'Shipping' : 'No Shipping'}
                  </Badge>
                </div>
                
                <div className="flex gap-1 ml-3">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onEdit(country)}
                    className="border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onDelete(country.code)}
                    className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">Exchange Rate</span>
                </div>
                <p className="text-sm text-gray-600">
                  {country.rate_from_usd} {country.currency.toUpperCase()}/USD
                </p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">Shipping</span>
                </div>
                <p className="text-sm text-gray-600">
                  Min: {country.min_shipping} {country.currency.toUpperCase()}
                </p>
                <p className="text-xs text-gray-500">
                  Unit: {country.weight_unit}
                </p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">Payment Gateway</span>
                </div>
                <p className="text-sm text-gray-600 capitalize">
                  {country.payment_gateway}
                </p>
                <p className="text-xs text-gray-500">
                  {country.payment_gateway_fixed_fee} {country.currency.toUpperCase()} + {country.payment_gateway_percent_fee}%
                </p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">Tax & VAT</span>
                </div>
                <p className="text-sm text-gray-600">
                  VAT: {country.vat}%
                </p>
                {country.sales_tax > 0 && (
                  <p className="text-xs text-gray-500">
                    Sales Tax: {country.sales_tax}%
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
