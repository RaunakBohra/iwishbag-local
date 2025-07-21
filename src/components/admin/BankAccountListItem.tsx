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
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-all duration-200 hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Body className="font-semibold text-gray-900">{account.account_name}</Body>
                <div className="flex items-center gap-2">
                  {account.is_active ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <BodySmall
                    className={`font-medium ${
                      account.is_active ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {account.is_active ? 'Active' : 'Inactive'}
                  </BodySmall>
                </div>
                {account.is_fallback && (
                  <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-xs font-medium">
                    <Globe className="h-3 w-3 mr-1" />
                    Fallback
                  </Badge>
                )}
                {country && (
                  <Badge variant="outline" className="border-gray-300 text-gray-700 text-xs">
                    {country.name}
                  </Badge>
                )}
              </div>
              <BodySmall className="text-gray-600">
                {account.bank_name} • {account.account_number}
              </BodySmall>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <BodySmall className="text-gray-500 font-medium uppercase tracking-wide text-xs">
                Bank Details
              </BodySmall>
              <div className="space-y-2">
                <div className="flex flex-col">
                  <BodySmall className="text-gray-500 text-xs">Bank name</BodySmall>
                  <BodySmall className="text-gray-900 font-medium">{account.bank_name}</BodySmall>
                </div>
                <div className="flex flex-col">
                  <BodySmall className="text-gray-500 text-xs">Account number</BodySmall>
                  <BodySmall className="text-gray-900 font-medium">
                    {account.account_number}
                  </BodySmall>
                </div>
                {account.branch_name && (
                  <div className="flex flex-col">
                    <BodySmall className="text-gray-500 text-xs">Branch</BodySmall>
                    <BodySmall className="text-gray-900 font-medium">
                      {account.branch_name}
                    </BodySmall>
                  </div>
                )}
              </div>
            </div>

            {(account.swift_code || account.iban) && (
              <div className="space-y-3">
                <BodySmall className="text-gray-500 font-medium uppercase tracking-wide text-xs">
                  International
                </BodySmall>
                <div className="space-y-2">
                  {account.swift_code && (
                    <div className="flex flex-col">
                      <BodySmall className="text-gray-500 text-xs">SWIFT/BIC</BodySmall>
                      <BodySmall className="text-gray-900 font-medium">
                        {account.swift_code}
                      </BodySmall>
                    </div>
                  )}
                  {account.iban && (
                    <div className="flex flex-col">
                      <BodySmall className="text-gray-500 text-xs">IBAN</BodySmall>
                      <BodySmall className="text-gray-900 font-medium">{account.iban}</BodySmall>
                    </div>
                  )}
                </div>
              </div>
            )}

            {Object.keys(customFields).length > 0 && (
              <div className="space-y-3">
                <BodySmall className="text-gray-500 font-medium uppercase tracking-wide text-xs">
                  Additional Info
                </BodySmall>
                <div className="space-y-2">
                  {Object.entries(customFields).map(([key, value]) => (
                    <div key={key} className="flex flex-col">
                      <BodySmall className="text-gray-500 text-xs">
                        {fieldLabels[key] || key}
                      </BodySmall>
                      <BodySmall className="text-gray-900 font-medium">{value}</BodySmall>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-6">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(account)}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 h-8 px-3 text-sm"
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
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
