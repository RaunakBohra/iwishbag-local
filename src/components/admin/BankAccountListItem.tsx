
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BankAccount } from "@/hooks/useBankAccountSettings";
import { Trash2, Edit } from "lucide-react";

interface BankAccountListItemProps {
  account: BankAccount;
  onEdit: (account: BankAccount) => void;
  onDelete: (id: string) => void;
}

export const BankAccountListItem = ({ account, onEdit, onDelete }: BankAccountListItemProps) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1">
            <p><strong>Account Name:</strong> {account.account_name}</p>
            <p><strong>Bank:</strong> {account.bank_name}</p>
            <p><strong>Account Number:</strong> {account.account_number}</p>
            <p><strong>Branch:</strong> {account.branch_name || 'N/A'}</p>
            <p><strong>SWIFT/BIC:</strong> {account.swift_code || 'N/A'}</p>
            <p><strong>IBAN:</strong> {account.iban || 'N/A'}</p>
            <p><strong>Status:</strong> <span className={account.is_active ? 'text-green-600' : 'text-red-600'}>{account.is_active ? 'Active' : 'Inactive'}</span></p>
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
