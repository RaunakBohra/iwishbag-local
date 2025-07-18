import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Building, Settings, Globe, CheckCircle, ChevronDown, X } from 'lucide-react';
import { BankAccount } from '@/hooks/useBankAccountSettings';
import { useShippingCountries } from '@/hooks/useShippingCountries';
import { H2, H3, Body, BodySmall } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';

interface BankAccountFormData {
  account_name: string;
  account_number: string;
  bank_name: string;
  is_active: boolean;
  is_fallback: boolean;
  destination_country: string | null;
  display_order: number;
  branch_name?: string;
  swift_code?: string;
  iban?: string;
  upi_id?: string;
  upi_qr_string?: string;
  payment_qr_url?: string;
  instructions?: string;
  custom_fields?: Record<string, unknown>;
  field_labels?: Record<string, string>;
}

interface FlexibleBankAccountFormProps {
  editingAccount: BankAccount | null;
  onSubmit: (data: { data: BankAccountFormData; id?: string }) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

interface CustomField {
  id: string;
  label: string;
  value: string;
  required: boolean;
}

const DEFAULT_FIELDS: CustomField[] = [
  { id: 'account_name', label: 'Account Name', value: '', required: true },
  { id: 'account_number', label: 'Account Number', value: '', required: true },
  { id: 'bank_name', label: 'Bank Name', value: '', required: true },
];

const COMMON_BANK_FIELDS = [
  { value: 'branch_name', label: 'Branch Name' },
  { value: 'swift_code', label: 'SWIFT/BIC Code' },
  { value: 'iban', label: 'IBAN' },
  { value: 'ifsc_code', label: 'IFSC Code (India)' },
  { value: 'routing_number', label: 'Routing Number (USA)' },
  { value: 'sort_code', label: 'Sort Code (UK)' },
  { value: 'bank_code', label: 'Bank Code' },
  { value: 'branch_code', label: 'Branch Code' },
  { value: 'account_type', label: 'Account Type' },
  { value: 'currency', label: 'Currency' },
  { value: 'upi_id', label: 'UPI ID' },
  { value: 'upi_qr_string', label: 'UPI QR String' },
  { value: 'payment_qr_url', label: 'Payment QR Code URL' },
  { value: 'instructions', label: 'Payment Instructions' },
];

export const FlexibleBankAccountForm = ({
  editingAccount,
  onSubmit,
  onCancel,
  isProcessing,
}: FlexibleBankAccountFormProps) => {
  const [isActive, setIsActive] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [customFields, setCustomFields] = useState<CustomField[]>(DEFAULT_FIELDS);
  const [displayOrder, setDisplayOrder] = useState(0);

  const { data: countries, isLoading: countriesLoading } = useShippingCountries();

  useEffect(() => {
    if (editingAccount) {
      setIsActive(editingAccount.is_active ?? true);
      setIsFallback(editingAccount.is_fallback ?? false);
      setSelectedCountry(editingAccount.destination_country || '');
      setDisplayOrder(editingAccount.display_order || 0);

      // Load custom fields from the account
      const fields: CustomField[] = [...DEFAULT_FIELDS];

      // Set default field values
      fields[0].value = editingAccount.account_name;
      fields[1].value = editingAccount.account_number;
      fields[2].value = editingAccount.bank_name;

      // Load custom fields
      if (editingAccount.custom_fields && typeof editingAccount.custom_fields === 'object') {
        const customFieldsData = editingAccount.custom_fields as Record<string, unknown>;
        const fieldLabels = (editingAccount.field_labels || {}) as Record<string, string>;

        Object.entries(customFieldsData).forEach(([key, value]) => {
          fields.push({
            id: key,
            label: fieldLabels[key] || key,
            value: String(value || ''),
            required: false,
          });
        });
      }

      // Add legacy fields if they exist
      if (editingAccount.branch_name) {
        fields.push({
          id: 'branch_name',
          label: 'Branch Name',
          value: editingAccount.branch_name,
          required: false,
        });
      }
      if (editingAccount.swift_code) {
        fields.push({
          id: 'swift_code',
          label: 'SWIFT/BIC Code',
          value: editingAccount.swift_code,
          required: false,
        });
      }
      if (editingAccount.iban) {
        fields.push({
          id: 'iban',
          label: 'IBAN',
          value: editingAccount.iban,
          required: false,
        });
      }
      // Add new payment fields if they exist
      const extendedAccount = editingAccount as BankAccount & {
        upi_id?: string;
        upi_qr_string?: string;
        payment_qr_url?: string;
        instructions?: string;
      };

      if (extendedAccount.upi_id) {
        fields.push({
          id: 'upi_id',
          label: 'UPI ID',
          value: extendedAccount.upi_id,
          required: false,
        });
      }
      if (extendedAccount.upi_qr_string) {
        fields.push({
          id: 'upi_qr_string',
          label: 'UPI QR String',
          value: extendedAccount.upi_qr_string,
          required: false,
        });
      }
      if (extendedAccount.payment_qr_url) {
        fields.push({
          id: 'payment_qr_url',
          label: 'Payment QR Code URL',
          value: extendedAccount.payment_qr_url,
          required: false,
        });
      }
      if (extendedAccount.instructions) {
        fields.push({
          id: 'instructions',
          label: 'Payment Instructions',
          value: extendedAccount.instructions,
          required: false,
        });
      }

      setCustomFields(fields);
    } else {
      setIsActive(true);
      setIsFallback(false);
      setSelectedCountry('');
      setCustomFields(DEFAULT_FIELDS);
      setDisplayOrder(0);
    }
  }, [editingAccount]);

  const handleAddField = () => {
    const newField: CustomField = {
      id: `field_${Date.now()}`,
      label: '',
      value: '',
      required: false,
    };
    setCustomFields([...customFields, newField]);
  };

  const handleRemoveField = (id: string) => {
    setCustomFields(customFields.filter((field) => field.id !== id));
  };

  const handleFieldChange = (id: string, property: keyof CustomField, value: string | boolean) => {
    setCustomFields(
      customFields.map((field) => (field.id === id ? { ...field, [property]: value } : field)),
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Prepare the data
    const defaultFieldIds = ['account_name', 'account_number', 'bank_name'];
    const customFieldsData: Record<string, unknown> = {};
    const fieldLabels: Record<string, string> = {};

    // Extract default fields
    const accountData: BankAccountFormData = {
      account_name: customFields.find((f) => f.id === 'account_name')?.value || '',
      account_number: customFields.find((f) => f.id === 'account_number')?.value || '',
      bank_name: customFields.find((f) => f.id === 'bank_name')?.value || '',
      is_active: isActive,
      is_fallback: isFallback,
      destination_country: isFallback ? null : selectedCountry || null,
      display_order: displayOrder,
    };

    // Handle legacy fields and custom fields
    customFields.forEach((field) => {
      if (!defaultFieldIds.includes(field.id) && field.value) {
        // Check if it's a legacy field or new payment field
        if (
          [
            'branch_name',
            'swift_code',
            'iban',
            'upi_id',
            'upi_qr_string',
            'payment_qr_url',
            'instructions',
          ].includes(field.id)
        ) {
          accountData[field.id] = field.value;
        } else {
          customFieldsData[field.id] = field.value;
          fieldLabels[field.id] = field.label;
        }
      }
    });

    accountData.custom_fields = customFieldsData;
    accountData.field_labels = fieldLabels;

    onSubmit({ data: accountData, id: editingAccount?.id });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <H2 className="text-lg font-semibold text-gray-900">
              {editingAccount ? 'Edit account' : 'Add new account'}
            </H2>
            <BodySmall className="text-gray-600 mt-1">
              {editingAccount ? 'Update account details and payment information.' : 'Create a new bank account for processing payments.'}
            </BodySmall>
          </div>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {/* Basic Configuration */}
        <div className="space-y-6">
          <div>
            <H3 className="text-sm font-semibold text-gray-900 mb-4">Basic configuration</H3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="country" className="text-sm font-medium text-gray-700 mb-2 block">Country</Label>
                <Select
                  value={selectedCountry}
                  onValueChange={setSelectedCountry}
                  disabled={isFallback || countriesLoading}
                >
                  <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white h-10">
                    <SelectValue
                      placeholder={countriesLoading ? 'Loading countries...' : 'Select country'}
                    />
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries?.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name} ({country.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <BodySmall className="text-gray-500 mt-1">
                  This account will be used for payments in this country.
                </BodySmall>
              </div>

              <div>
                <Label htmlFor="display_order" className="text-sm font-medium text-gray-700 mb-2 block">Display order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-10"
                />
                <BodySmall className="text-gray-500 mt-1">
                  Lower numbers appear first in the list.
                </BodySmall>
              </div>
            </div>

            <div className="space-y-4 mt-6">
              <div className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 bg-gray-50">
                <Checkbox
                  id="is_fallback"
                  checked={isFallback}
                  onCheckedChange={(checked) => {
                    setIsFallback(!!checked);
                    if (checked) setSelectedCountry('');
                  }}
                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <div className="flex-1">
                  <Label htmlFor="is_fallback" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Fallback account
                  </Label>
                  <BodySmall className="text-gray-500 mt-1">
                    This account will be shown when no country-specific account exists.
                  </BodySmall>
                </div>
                {isFallback && (
                  <Badge className="bg-orange-50 text-orange-700 border-orange-200">
                    <Globe className="h-3 w-3 mr-1" />
                    Fallback
                  </Badge>
                )}
              </div>

              <div className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 bg-gray-50">
                <Checkbox
                  id="is_active"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(!!checked)}
                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <div className="flex-1">
                  <Label htmlFor="is_active" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Active account
                  </Label>
                  <BodySmall className="text-gray-500 mt-1">
                    Only active accounts will be shown to customers.
                  </BodySmall>
                </div>
                {isActive && (
                  <Badge className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div className="space-y-6">
          <div>
            <H3 className="text-sm font-semibold text-gray-900 mb-4">Account details</H3>
            <div className="space-y-4">
              {customFields.map((field) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div>
                    <Label htmlFor={`label_${field.id}`} className="text-sm font-medium text-gray-700 mb-2 block">
                      Field label
                    </Label>
                    <Input
                      id={`label_${field.id}`}
                      value={field.label}
                      onChange={(e) => handleFieldChange(field.id, 'label', e.target.value)}
                      placeholder="e.g., IFSC Code"
                      disabled={DEFAULT_FIELDS.some((df) => df.id === field.id)}
                      required={field.required}
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-10"
                    />
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor={`value_${field.id}`} className="text-sm font-medium text-gray-700 mb-2 block">
                        Value
                      </Label>
                      {field.id === 'instructions' ? (
                        <Textarea
                          id={`value_${field.id}`}
                          value={field.value}
                          onChange={(e) => handleFieldChange(field.id, 'value', e.target.value)}
                          placeholder="Enter payment instructions"
                          rows={3}
                          required={field.required}
                          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
                        />
                      ) : (
                        <Input
                          id={`value_${field.id}`}
                          value={field.value}
                          onChange={(e) => handleFieldChange(field.id, 'value', e.target.value)}
                          placeholder="Enter value"
                          required={field.required}
                          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-10"
                        />
                      )}
                    </div>

                    {!DEFAULT_FIELDS.some((df) => df.id === field.id) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveField(field.id)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 h-10 w-10 mt-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <Select
                value=""
                onValueChange={(value) => {
                  const selectedField = COMMON_BANK_FIELDS.find((f) => f.value === value);
                  if (selectedField && !customFields.some((f) => f.id === selectedField.value)) {
                    const newField: CustomField = {
                      id: selectedField.value,
                      label: selectedField.label,
                      value: '',
                      required: false,
                    };
                    setCustomFields([...customFields, newField]);
                  }
                }}
              >
                <SelectTrigger className="w-[200px] border-gray-300 h-10">
                  <SelectValue placeholder="Add common field" />
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_BANK_FIELDS.filter(
                    (field) => !customFields.some((f) => f.id === field.value),
                  ).map((field) => (
                    <SelectItem key={field.value} value={field.value}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddField}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 h-10"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add custom field
              </Button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel} 
            disabled={isProcessing}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 h-10 px-4"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 h-10 font-medium"
          >
            {isProcessing ? 'Saving...' : editingAccount ? 'Update account' : 'Create account'}
          </Button>
        </div>
      </form>
    </div>
  );
};
