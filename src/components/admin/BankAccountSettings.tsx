
import { useState } from "react";
import { useBankAccountSettings, BankAccount } from "@/hooks/useBankAccountSettings";
import { Button } from "@/components/ui/button";
import { BankAccountForm } from "./BankAccountForm";
import { BankAccountListItem } from "./BankAccountListItem";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const BankAccountSettings = () => {
  const { bankAccounts, isLoadingBankAccounts, createOrUpdateBankAccount, deleteBankAccount, isProcessing } = useBankAccountSettings();
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setIsFormOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingAccount(null);
    setIsFormOpen(true);
  };

  const handleCancel = () => {
    setEditingAccount(null);
    setIsFormOpen(false);
  };

  const handleSubmit = (data: { data: any, id?: string }) => {
    createOrUpdateBankAccount(data, {
      onSuccess: () => {
        handleCancel();
      }
    });
  };
  
  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this bank account?")) {
      deleteBankAccount(id);
    }
  };

  if (isLoadingBankAccounts) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-8 w-48"/>
            <Skeleton className="h-24 w-full"/>
            <Skeleton className="h-24 w-full"/>
        </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">Bank Account Settings</h3>
        {!isFormOpen && (
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Account
          </Button>
        )}
      </div>

      {isFormOpen ? (
        <BankAccountForm 
          editingAccount={editingAccount}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isProcessing={isProcessing}
        />
      ) : (
        <div className="space-y-4">
          {bankAccounts.map((account) => (
            <BankAccountListItem 
              key={account.id}
              account={account}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
          {bankAccounts.length === 0 && <p>No bank accounts found. Add one to get started.</p>}
        </div>
      )}
    </div>
  );
};
