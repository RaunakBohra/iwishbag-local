
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BankAccount } from "@/hooks/useBankAccountSettings";
import { Trash2, Edit, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const customFields = account.custom_fields as Record<string, unknown> || {};
  const fieldLabels = account.field_labels as Record<string, string> || {};

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-lg">{account.account_name}</h4>
              {account.is_fallback && (
                <Badge variant="secondary">
                  <Globe className="h-3 w-3 mr-1" />
                  Fallback
                </Badge>
              )}
              {country && (
                <Badge variant="outline">
                  {country.name} ({country.currency})
                </Badge>
              )}
              <Badge variant={account.is_active ? 'default' : 'destructive'}>
                {account.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <p><strong>Bank:</strong> {account.bank_name}</p>
              <p><strong>Account Number:</strong> {account.account_number}</p>
              {account.branch_name && <p><strong>Branch:</strong> {account.branch_name}</p>}
              {account.swift_code && <p><strong>SWIFT/BIC:</strong> {account.swift_code}</p>}
              {account.iban && <p><strong>IBAN:</strong> {account.iban}</p>}
              
              {/* Display custom fields */}
              {Object.entries(customFields).map(([key, value]) => (
                <p key={key}>
                  <strong>{fieldLabels[key] || key}:</strong> {value}
                </p>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onEdit(account)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onDelete(account.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
};
