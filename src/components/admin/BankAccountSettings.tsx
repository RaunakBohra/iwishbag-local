
import { useState } from "react";
import { useBankAccountSettings, BankAccount, BankAccountFormData } from "@/hooks/useBankAccountSettings";
import { Button } from "@/components/ui/button";
import { FlexibleBankAccountForm } from "./FlexibleBankAccountForm";
import { BankAccountListItem } from "./BankAccountListItem";
import { Plus, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useShippingCountries } from "@/hooks/useShippingCountries";

export const BankAccountSettings = () => {
  const { bankAccounts, isLoadingBankAccounts, createOrUpdateBankAccount, deleteBankAccount, isProcessing } = useBankAccountSettings();
  const { data: countries, isLoading: countriesLoading } = useShippingCountries();
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [countryFilter, setCountryFilter] = useState<string>('all');

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

  const handleSubmit = (data: { data: BankAccountFormData, id?: string }) => {
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

  // Filter bank accounts by country
  const filteredAccounts = countryFilter === 'all' 
    ? bankAccounts 
    : countryFilter === 'fallback'
    ? bankAccounts.filter(account => account.is_fallback)
    : bankAccounts.filter(account => account.destination_country === countryFilter);

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
          <div className="flex gap-2">
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="fallback">Fallback Accounts</SelectItem>
                {countries?.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Account
            </Button>
          </div>
        )}
      </div>

      {isFormOpen ? (
        <FlexibleBankAccountForm 
          editingAccount={editingAccount}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isProcessing={isProcessing}
        />
      ) : (
        <div className="space-y-4">
          {filteredAccounts.map((account) => (
            <BankAccountListItem 
              key={account.id}
              account={account}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
          {filteredAccounts.length === 0 && (
            <p>
              {countryFilter === 'all' 
                ? "No bank accounts found. Add one to get started."
                : `No bank accounts found for ${countryFilter === 'fallback' ? 'fallback' : countries?.find(c => c.code === countryFilter)?.name || countryFilter}.`
              }
            </p>
          )}
        </div>
      )}
    </div>
  );
};
