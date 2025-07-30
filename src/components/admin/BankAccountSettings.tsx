import { useState } from 'react';
import {
  useBankAccountSettings,
  BankAccount,
  BankAccountFormData,
} from '@/hooks/useBankAccountSettings';
import { Button } from '@/components/ui/button';
import { FlexibleBankAccountForm } from './FlexibleBankAccountForm';
import { BankAccountListItem } from './BankAccountListItem';
import { Plus, Building, Filter, ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useShippingCountries } from '@/hooks/useShippingCountries';
import { H1, Body, BodySmall } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';

export const BankAccountSettings = () => {
  const {
    bankAccounts,
    isLoadingBankAccounts,
    createOrUpdateBankAccount,
    deleteBankAccount,
    isProcessing,
  } = useBankAccountSettings();
  const { data: countries } = useShippingCountries();
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

  const handleSubmit = (data: { data: BankAccountFormData; id?: string }) => {
    createOrUpdateBankAccount(data, {
      onSuccess: () => {
        handleCancel();
      },
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this bank account?')) {
      deleteBankAccount(id);
    }
  };

  // Filter bank accounts by country
  const filteredAccounts = (() => {
    let filtered = countryFilter === 'all'
      ? bankAccounts
      : countryFilter === 'fallback'
        ? bankAccounts.filter((account) => account.is_fallback)
        : bankAccounts.filter((account) => account.destination_country === countryFilter);
    
    // Apply consistent sorting to maintain order after updates
    return filtered.sort((a, b) => {
      // First sort by destination country
      if (a.destination_country !== b.destination_country) {
        return (a.destination_country || '').localeCompare(b.destination_country || '');
      }
      // Then by fallback status (fallback accounts first)
      if (a.is_fallback !== b.is_fallback) {
        return b.is_fallback ? 1 : -1;
      }
      // Then by bank name
      if (a.bank_name !== b.bank_name) {
        return (a.bank_name || '').localeCompare(b.bank_name || '');
      }
      // Finally by creation date
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  })();

  if (isLoadingBankAccounts) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="space-y-6">
            <Skeleton className="h-20 w-full rounded-lg bg-white" />
            <Skeleton className="h-20 w-full rounded-lg bg-white" />
            <Skeleton className="h-20 w-full rounded-lg bg-white" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <H1 className="text-2xl font-semibold text-gray-900 mb-2">Bank accounts</H1>
              <BodySmall className="text-gray-600">
                Manage your payment account details for different countries and regions.
              </BodySmall>
            </div>
            {!isFormOpen && (
              <div className="flex items-center gap-3">
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-[200px] border-gray-300 bg-white hover:bg-gray-50 h-9 text-sm">
                    <SelectValue placeholder="Filter by country" />
                    <ChevronDown className="h-4 w-4 opacity-50" />
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
                <Button
                  onClick={handleAddNew}
                  className="bg-teal-600 hover:bg-teal-700 text-white h-9 px-4 text-sm font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add account
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {isFormOpen ? (
          <FlexibleBankAccountForm
            editingAccount={editingAccount}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isProcessing={isProcessing}
          />
        ) : (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="text-sm text-gray-500 mb-1">Total accounts</div>
                <div className="text-2xl font-semibold text-gray-900">{bankAccounts.length}</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="text-sm text-gray-500 mb-1">Active accounts</div>
                <div className="text-2xl font-semibold text-gray-900">
                  {bankAccounts.filter((acc) => acc.is_active).length}
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="text-sm text-gray-500 mb-1">Fallback accounts</div>
                <div className="text-2xl font-semibold text-gray-900">
                  {bankAccounts.filter((acc) => acc.is_fallback).length}
                </div>
              </div>
            </div>

            {/* Filter Info */}
            {countryFilter !== 'all' && (
              <div className="flex items-center gap-2 py-2">
                <BodySmall className="text-gray-600">Showing accounts for:</BodySmall>
                <Badge variant="outline" className="border-gray-300 text-gray-700">
                  {countryFilter === 'fallback'
                    ? 'Fallback Accounts'
                    : countries?.find((c) => c.code === countryFilter)?.name || countryFilter}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCountryFilter('all')}
                  className="text-gray-500 hover:text-gray-700 h-6 px-2 text-xs"
                >
                  Clear filter
                </Button>
              </div>
            )}

            {/* Accounts List */}
            <div className="space-y-3">
              {filteredAccounts.map((account) => (
                <BankAccountListItem
                  key={account.id}
                  account={account}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
              {filteredAccounts.length === 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Building className="h-6 w-6 text-gray-400" />
                  </div>
                  <Body className="text-gray-900 mb-2 font-medium">
                    {countryFilter === 'all'
                      ? 'No bank accounts'
                      : `No accounts for ${countryFilter === 'fallback' ? 'fallback' : countries?.find((c) => c.code === countryFilter)?.name || countryFilter}`}
                  </Body>
                  <BodySmall className="text-gray-500 mb-6 max-w-md mx-auto">
                    {countryFilter === 'all'
                      ? 'Add your first bank account to get started with payment processing.'
                      : 'Add an account for this region to enable payment processing.'}
                  </BodySmall>
                  <Button
                    onClick={handleAddNew}
                    className="bg-teal-600 hover:bg-teal-700 text-white h-9 px-4 text-sm font-medium"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add account
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BankAccountSettings;
