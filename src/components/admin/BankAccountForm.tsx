import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { BankAccount, BankAccountFormData } from '@/hooks/useBankAccountSettings';

interface BankAccountFormProps {
  editingAccount: BankAccount | null;
  onSubmit: (data: { data: BankAccountFormData; id?: string }) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export const BankAccountForm = ({
  editingAccount,
  onSubmit,
  onCancel,
  isProcessing,
}: BankAccountFormProps) => {
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (editingAccount) {
      setIsActive(editingAccount.is_active);
    } else {
      setIsActive(true);
    }
  }, [editingAccount]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const accountData: BankAccountFormData = {
      account_name: formData.get('account_name') as string,
      account_number: formData.get('account_number') as string,
      bank_name: formData.get('bank_name') as string,
      branch_name: (formData.get('branch_name') as string) || null,
      swift_code: (formData.get('swift_code') as string) || null,
      iban: (formData.get('iban') as string) || null,
      is_active: isActive,
    };
    onSubmit({ data: accountData, id: editingAccount?.id });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editingAccount ? 'Edit Bank Account' : 'Add New Bank Account'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="account_name">Account Name</Label>
            <Input
              id="account_name"
              name="account_name"
              defaultValue={editingAccount?.account_name || ''}
              required
            />
          </div>
          <div>
            <Label htmlFor="account_number">Account Number</Label>
            <Input
              id="account_number"
              name="account_number"
              defaultValue={editingAccount?.account_number || ''}
              required
            />
          </div>
          <div>
            <Label htmlFor="bank_name">Bank Name</Label>
            <Input
              id="bank_name"
              name="bank_name"
              defaultValue={editingAccount?.bank_name || ''}
              required
            />
          </div>
          <div>
            <Label htmlFor="branch_name">Branch Name</Label>
            <Input
              id="branch_name"
              name="branch_name"
              defaultValue={editingAccount?.branch_name || ''}
            />
          </div>
          <div>
            <Label htmlFor="swift_code">SWIFT/BIC Code</Label>
            <Input
              id="swift_code"
              name="swift_code"
              defaultValue={editingAccount?.swift_code || ''}
            />
          </div>
          <div>
            <Label htmlFor="iban">IBAN</Label>
            <Input id="iban" name="iban" defaultValue={editingAccount?.iban || ''} />
          </div>
          <div className="flex items-center space-x-2 pt-4">
            <Checkbox
              id="is_active"
              name="is_active"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(!!checked)}
            />
            <Label
              htmlFor="is_active"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Active
            </Label>
          </div>
          <div className="col-span-2 flex gap-2">
            <Button type="submit" disabled={isProcessing}>
              {isProcessing ? 'Saving...' : editingAccount ? 'Update Account' : 'Create Account'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
