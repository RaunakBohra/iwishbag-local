import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tables } from '@/integrations/supabase/types';
import {
  Trash2,
  Edit,
  ShoppingCart,
  Truck,
  Globe,
  MoreHorizontal,
  Activity,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type CountrySetting = Tables<'country_settings'>;

interface CountryListItemProps {
  country: CountrySetting;
  onEdit: (country: CountrySetting) => void;
  onDelete: (code: string) => void;
  isSelected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
}

export const CountryListItem = ({ 
  country, 
  onEdit, 
  onDelete, 
  isSelected = false, 
  onSelectionChange 
}: CountryListItemProps) => {
  return (
    <div className="hover:bg-gray-50/50 transition-colors duration-150">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section: Selection + Country Info */}
          <div className="flex items-center gap-4 flex-1">
            {/* Selection Checkbox */}
            {onSelectionChange && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={onSelectionChange}
                aria-label={`Select ${country.name}`}
              />
            )}

            {/* Country Basic Info */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Flag */}
              <div className="flex-shrink-0">
                {country.flag_emoji ? (
                  <span className="text-2xl">{country.flag_emoji}</span>
                ) : (
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <Globe className="h-4 w-4 text-gray-500" />
                  </div>
                )}
              </div>

              {/* Country Name & Code */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900 truncate">
                    {country.display_name || country.name}
                  </h3>
                  <span className="text-sm text-gray-500 font-mono">
                    {country.code}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                  <span>{country.currency.toUpperCase()}</span>
                  {country.continent && (
                    <>
                      <span>•</span>
                      <span>{country.continent}</span>
                    </>
                  )}
                  {country.phone_code && (
                    <>
                      <span>•</span>
                      <span>{country.phone_code}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Center Section: Key Stats */}
          <div className="hidden lg:flex items-center gap-8 px-8">
            {/* Exchange Rate */}
            <div className="text-center min-w-[80px]">
              <div className="text-sm font-medium text-gray-900">
                {country.rate_from_usd}
              </div>
              <div className="text-xs text-gray-500">
                {country.currency.toUpperCase()}/USD
              </div>
            </div>

            {/* Payment Gateway */}
            <div className="text-center min-w-[100px]">
              <div className="text-sm font-medium text-gray-900 capitalize">
                {country.payment_gateway}
              </div>
              <div className="text-xs text-gray-500">
                {country.payment_gateway_percent_fee}% + {country.payment_gateway_fixed_fee}
              </div>
            </div>

            {/* Tax Info */}
            <div className="text-center min-w-[60px]">
              <div className="text-sm font-medium text-gray-900">
                {country.vat}%
              </div>
              <div className="text-xs text-gray-500">VAT</div>
            </div>
          </div>

          {/* Right Section: Status + Actions */}
          <div className="flex items-center gap-3">
            {/* Status Badges */}
            <div className="hidden md:flex items-center gap-1.5">
              <Badge
                variant={country.is_active ? 'default' : 'secondary'}
                className={`text-xs px-2 py-0.5 ${
                  country.is_active
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-gray-100 text-gray-600 border-gray-200'
                }`}
              >
                {country.is_active ? 'Active' : 'Inactive'}
              </Badge>

              {country.purchase_allowed && (
                <Badge className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                  <ShoppingCart className="w-3 h-3 mr-1" />
                  Purchase
                </Badge>
              )}

              {country.shipping_allowed && (
                <Badge className="text-xs px-2 py-0.5 bg-teal-50 text-teal-700 border-teal-200">
                  <Truck className="w-3 h-3 mr-1" />
                  Shipping
                </Badge>
              )}

              {country.auto_tax_calculation && (
                <Badge className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 border-purple-200">
                  Auto Tax
                </Badge>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(country)}
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <Edit className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onEdit(country)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit settings
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Update exchange rate
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Configure payments
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(country.code)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete country
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Mobile-only expanded info */}
        <div className="lg:hidden mt-3 pt-3 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Exchange Rate:</span>
              <div className="font-medium">{country.rate_from_usd} {country.currency.toUpperCase()}</div>
            </div>
            <div>
              <span className="text-gray-500">Payment:</span>
              <div className="font-medium capitalize">{country.payment_gateway}</div>
            </div>
            <div>
              <span className="text-gray-500">VAT:</span>
              <div className="font-medium">{country.vat}%</div>
            </div>
          </div>
          
          {/* Mobile Status Badges */}
          <div className="flex items-center gap-1.5 mt-2">
            <Badge
              variant={country.is_active ? 'default' : 'secondary'}
              className={`text-xs ${
                country.is_active
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-gray-100 text-gray-600 border-gray-200'
              }`}
            >
              {country.is_active ? 'Active' : 'Inactive'}
            </Badge>
            {country.purchase_allowed && (
              <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                Purchase
              </Badge>
            )}
            {country.shipping_allowed && (
              <Badge className="text-xs bg-teal-50 text-teal-700 border-teal-200">
                Shipping
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
