import { Button } from '@/components/ui/button';
import { BankAccount } from '@/hooks/useBankAccountSettings';
import {
  Trash2,
  Edit,
  Globe,
  Building,
  CreditCard,
  MoreVertical,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Body, BodySmall } from '@/components/ui/typography';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BankAccountListItemProps {
  account: BankAccount;
  onEdit: (account: BankAccount) => void;
  onDelete: (id: string) => void;
}

export const BankAccountListItem = ({ account, onEdit, onDelete }: BankAccountListItemProps) => {
  // Fetch country name if country_code exists
  const { data: country } = useQuery({
    queryKey: ['country', account.country_code],
    queryFn: async () => {
      if (!account.country_code) return null;
      const { data, error } = await supabase
        .from('country_settings')
        .select('name, currency')
        .eq('code', account.country_code)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!account.country_code,
  });

  // Render custom fields
  const customFields = (account.custom_fields as Record<string, unknown>) || {};
  const fieldLabels = (account.field_labels as Record<string, string>) || {};

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-all duration-200 hover:shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header Row - Name, Status, and Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
            <Body className="font-semibold text-gray-900 truncate flex-1 min-w-0">{account.account_name}</Body>
            
            {/* Badges Row - Stacked on mobile */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Badge - More Prominent */}
              <Badge className={`px-2 py-1 text-xs font-medium flex-shrink-0 ${
                account.is_active 
                  ? 'bg-green-100 text-green-800 border-green-200' 
                  : 'bg-red-100 text-red-800 border-red-200'
              }`}>
                {account.is_active ? (
                  <><CheckCircle className="h-3 w-3 mr-1" />Active</>
                ) : (
                  <><XCircle className="h-3 w-3 mr-1" />Inactive</>
                )}
              </Badge>
              
              {/* Fallback and Country Badges */}
              {account.is_fallback && (
                <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-xs font-medium px-2 py-0.5 flex-shrink-0">
                  <Globe className="h-3 w-3 mr-1" />
                  Fallback
                </Badge>
              )}
              {country && (
                <Badge variant="outline" className="border-gray-300 text-gray-700 text-xs px-2 py-0.5 flex-shrink-0">
                  {country.name}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Bank Info Row - Stack on smaller screens */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3 text-sm text-gray-600">
            <span className="flex items-center gap-1 min-w-0">
              <Building className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{account.bank_name}</span>
            </span>
            <span className="flex items-center gap-1 min-w-0">
              <CreditCard className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{account.account_number}</span>
            </span>
            {account.branch_name && (
              <>
                <span className="text-gray-500 hidden sm:inline">•</span>
                <span className="text-gray-500 truncate">{account.branch_name}</span>
              </>
            )}
          </div>

          {/* Compact Details Row - Responsive layout */}
          {((account.swift_code || account.iban) || Object.keys(customFields).length > 0) && (
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-6 text-sm">
              {/* International Codes */}
              {(account.swift_code || account.iban) && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  {account.swift_code && (
                    <span className="text-gray-600 truncate">
                      <span className="text-gray-500">SWIFT:</span> <span className="font-medium text-gray-900">{account.swift_code}</span>
                    </span>
                  )}
                  {account.iban && (
                    <span className="text-gray-600 truncate">
                      <span className="text-gray-500">IBAN:</span> <span className="font-medium text-gray-900">{account.iban}</span>
                    </span>
                  )}
                </div>
              )}
              
              {/* Custom Fields - Responsive */}
              {Object.keys(customFields).length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-wrap">
                  {Object.entries(customFields).map(([key, value]) => (
                    <span key={key} className="text-gray-600 truncate">
                      <span className="text-gray-500">{fieldLabels[key] || key}:</span>{' '}
                      <span className="font-medium text-gray-900">{value}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions - Mobile Responsive */}
        <div className="flex items-start gap-1 flex-shrink-0 self-start">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(account)}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 h-8 px-3 text-sm"
          >
            <Edit className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-50 flex-shrink-0"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => onDelete(account.id)}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete account
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
