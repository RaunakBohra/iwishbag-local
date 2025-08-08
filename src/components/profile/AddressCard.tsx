import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Body, BodySmall } from '@/components/ui/typography';
import { Tables } from '@/integrations/supabase/types';
import { MapPin, Edit, Trash2, MoreVertical, Phone, CheckCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AddressCardProps {
  address: Tables<'delivery_addresses'>;
  onEdit?: () => void;
  onDelete?: () => void;
  onSelect?: () => void;
  countries?: Array<{ code: string; name: string }>;
  isSelected?: boolean;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

export const AddressCard = ({
  address,
  onEdit,
  onDelete,
  onSelect,
  countries,
  isSelected = false,
  showActions = true,
  compact = false,
  className = "",
}: AddressCardProps) => {
  // Get country name from code
  const countryName = countries?.find(c => c.code === address.destination_country)?.name || address.destination_country;
  
  // Use state/province name directly (no conversion needed)
  const stateName = address.state_province_region;
  
  // Check if this is a Nepal address
  const isNepal = address.destination_country === 'NP';
  
  // Format compact address string
  const formatCompactAddress = () => {
    if (isNepal) {
      // Nepal compact format: Street/Ward, Municipality, District, Province
      const parts = [];
      const addressParts = address.address_line1?.split(',') || [];
      
      // Get municipality (first part) and street/ward (remaining parts)
      const municipality = addressParts[0]?.trim();
      const streetAndWard = addressParts.slice(1)
        .map(part => part.trim())
        .filter((part, index, arr) => part.length > 0 && arr.indexOf(part) === index)
        .join(', ');
      
      // Add street/ward first (most specific)
      if (streetAndWard) parts.push(streetAndWard);
      
      // Add municipality
      if (municipality) parts.push(municipality);
      
      // Add district with "District" label  
      if (address.city) parts.push(`${address.city} District`);
      
      // Add province
      if (stateName) parts.push(stateName);
      
      // Add country and postal code
      if (countryName) parts.push(countryName);
      if (address.postal_code) parts.push(address.postal_code);
      
      return parts.join(', ');
    } else if (address.destination_country === 'IN') {
      // India compact format: Street, City PIN, State, Country
      const parts = [];
      if (address.address_line1) parts.push(address.address_line1);
      if (address.city && address.postal_code) {
        parts.push(`${address.city} ${address.postal_code}`);
      } else if (address.city) {
        parts.push(address.city);
      }
      if (stateName) parts.push(stateName);
      if (countryName) parts.push(countryName);
      return parts.join(', ');
    } else {
      // International compact format: Street, City State PostalCode, Country
      const parts = [];
      if (address.address_line1) parts.push(address.address_line1);
      
      // Combine city, state, and postal code on one line for international
      const cityLine = [];
      if (address.city) cityLine.push(address.city);
      if (stateName) cityLine.push(stateName);
      if (address.postal_code) cityLine.push(address.postal_code);
      if (cityLine.length > 0) parts.push(cityLine.join(', '));
      
      if (countryName) parts.push(countryName);
      return parts.join(', ');
    }
  };
  
  const baseClassName = compact 
    ? `border p-3 rounded-lg transition-all ${
        isSelected 
          ? 'border-teal-500 bg-teal-50' 
          : 'border-gray-200 hover:border-gray-300'
      } ${onSelect ? 'cursor-pointer' : ''} ${className}`
    : `border p-6 rounded-lg transition-all ${
        isSelected 
          ? 'border-teal-500 bg-teal-50' 
          : 'border-gray-200 hover:border-gray-300'
      } ${onSelect ? 'cursor-pointer' : ''} ${className}`;

  if (compact) {
    return (
      <div className={baseClassName} onClick={onSelect}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-6 h-6 rounded-md bg-teal-50 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-3 w-3 text-teal-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <BodySmall className="font-semibold text-gray-900 truncate">
                  {address.recipient_name || 'Unnamed Address'}
                </BodySmall>
                {address.is_default && (
                  <Badge className="bg-green-50 text-green-700 border-green-200 text-xs flex-shrink-0">
                    Default
                  </Badge>
                )}
                {isSelected && (
                  <CheckCircle className="h-3 w-3 text-teal-600 flex-shrink-0" />
                )}
              </div>
              <BodySmall className="text-gray-600 truncate">
                {formatCompactAddress()}
              </BodySmall>
            </div>
          </div>
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2"
            >
              <Edit className="h-3 w-3" />
            </Button>
          )}
          {showActions && onDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 flex-shrink-0 ml-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onSelect={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }} 
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-3 w-3" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className={baseClassName} onClick={onSelect}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-teal-600" />
            </div>
            <div className="flex items-center gap-2">
              <Body className="font-semibold text-gray-900">{address.recipient_name}</Body>
              {address.is_default && (
                <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Default
                </Badge>
              )}
              {isSelected && (
                <CheckCircle className="h-4 w-4 text-teal-600" />
              )}
            </div>
          </div>
          <div className="space-y-1 ml-10">
            {isNepal ? (
              <>
                {/* Nepal address format: Street → Ward → Municipality → District → Province */}
                {(() => {
                  // Extract and parse Nepal address components correctly
                  const addressParts = address.address_line1?.split(',') || [];
                  
                  // The address_line1 contains: "Municipality, Street/Area, Ward X"
                  // We need to reorder to: "Street/Area, Ward X" → "Municipality"
                  const municipality = addressParts[0]?.trim(); // Municipality (first part)
                  const streetAndRest = addressParts.slice(1); // Street, Ward, etc.
                  
                  // Clean up street/area and ward parts (remove duplicates)
                  const cleanStreetParts = streetAndRest
                    .map(part => part.trim())
                    .filter((part, index, arr) => {
                      return part.length > 0 && arr.indexOf(part) === index;
                    });
                  
                  return (
                    <>
                      {/* Line 1: Street/Area and Ward (most specific first) */}
                      {cleanStreetParts.length > 0 && (
                        <BodySmall className="text-gray-700 font-medium">
                          {cleanStreetParts.join(', ')}
                        </BodySmall>
                      )}
                      
                      {/* Line 2: Municipality */}
                      {municipality && (
                        <BodySmall className="text-gray-600">
                          {municipality}
                        </BodySmall>
                      )}
                      
                      {/* Line 3: Additional address line (if any) */}
                      {address.address_line2 && (
                        <BodySmall className="text-gray-600">{address.address_line2}</BodySmall>
                      )}
                      
                      {/* Line 4: District and Province */}
                      <BodySmall className="text-gray-600">
                        {address.city} District, {stateName}
                      </BodySmall>
                      
                      {/* Line 5: Country and Postal Code */}
                      <BodySmall className="text-gray-600">
                        {countryName} {address.postal_code && `- ${address.postal_code}`}
                      </BodySmall>
                    </>
                  );
                })()}
              </>
            ) : address.destination_country === 'IN' ? (
              <>
                {/* India address format: Street → Area → City PIN → State → Country */}
                <BodySmall className="text-gray-700 font-medium">{address.address_line1}</BodySmall>
                {address.address_line2 && (
                  <BodySmall className="text-gray-600">{address.address_line2}</BodySmall>
                )}
                <BodySmall className="text-gray-600">
                  {address.city} {address.postal_code}
                </BodySmall>
                <BodySmall className="text-gray-600">{stateName}</BodySmall>
                <BodySmall className="text-gray-600">{countryName}</BodySmall>
              </>
            ) : (
              <>
                {/* International address format: Street → City, State PostalCode → Country */}
                <BodySmall className="text-gray-700 font-medium">{address.address_line1}</BodySmall>
                {address.address_line2 && (
                  <BodySmall className="text-gray-600">{address.address_line2}</BodySmall>
                )}
                <BodySmall className="text-gray-600">
                  {address.city}, {stateName} {address.postal_code}
                </BodySmall>
                <BodySmall className="text-gray-600">{countryName}</BodySmall>
              </>
            )}
            {address.phone && (
              <BodySmall className="text-gray-600 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {address.phone}
              </BodySmall>
            )}
          </div>
        </div>
        {showActions && (onEdit || onDelete) && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            {onDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onSelect={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }} 
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>
    </div>
  );
};