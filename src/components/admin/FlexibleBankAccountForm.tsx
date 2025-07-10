import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { BankAccount } from "@/hooks/useBankAccountSettings";
import { useShippingCountries } from "@/hooks/useShippingCountries";

interface FlexibleBankAccountFormProps {
  editingAccount: BankAccount | null;
  onSubmit: (data: { data: any, id?: string }) => void;
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
];

export const FlexibleBankAccountForm = ({ editingAccount, onSubmit, onCancel, isProcessing }: FlexibleBankAccountFormProps) => {
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
        const customFieldsData = editingAccount.custom_fields as Record<string, any>;
        const fieldLabels = (editingAccount.field_labels || {}) as Record<string, string>;
        
        Object.entries(customFieldsData).forEach(([key, value]) => {
          fields.push({
            id: key,
            label: fieldLabels[key] || key,
            value: String(value || ''),
            required: false
          });
        });
      }
      
      // Add legacy fields if they exist
      if (editingAccount.branch_name) {
        fields.push({ id: 'branch_name', label: 'Branch Name', value: editingAccount.branch_name, required: false });
      }
      if (editingAccount.swift_code) {
        fields.push({ id: 'swift_code', label: 'SWIFT/BIC Code', value: editingAccount.swift_code, required: false });
      }
      if (editingAccount.iban) {
        fields.push({ id: 'iban', label: 'IBAN', value: editingAccount.iban, required: false });
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
      required: false
    };
    setCustomFields([...customFields, newField]);
  };

  const handleRemoveField = (id: string) => {
    setCustomFields(customFields.filter(field => field.id !== id));
  };

  const handleFieldChange = (id: string, property: keyof CustomField, value: any) => {
    setCustomFields(customFields.map(field => 
      field.id === id ? { ...field, [property]: value } : field
    ));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Prepare the data
    const defaultFieldIds = ['account_name', 'account_number', 'bank_name'];
    const customFieldsData: Record<string, any> = {};
    const fieldLabels: Record<string, string> = {};
    
    // Extract default fields
    const accountData: any = {
      account_name: customFields.find(f => f.id === 'account_name')?.value || '',
      account_number: customFields.find(f => f.id === 'account_number')?.value || '',
      bank_name: customFields.find(f => f.id === 'bank_name')?.value || '',
      is_active: isActive,
      is_fallback: isFallback,
      destination_country: isFallback ? null : selectedCountry || null,
      display_order: displayOrder,
    };
    
    // Handle legacy fields and custom fields
    customFields.forEach(field => {
      if (!defaultFieldIds.includes(field.id) && field.value) {
        // Check if it's a legacy field
        if (['branch_name', 'swift_code', 'iban'].includes(field.id)) {
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
    <Card>
      <CardHeader>
        <CardTitle>{editingAccount ? 'Edit Bank Account' : 'Add New Bank Account'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="country">Country</Label>
              <Select 
                value={selectedCountry} 
                onValueChange={setSelectedCountry}
                disabled={isFallback || countriesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={countriesLoading ? "Loading countries..." : "Select country"} />
                </SelectTrigger>
                <SelectContent>
                  {countries?.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name} ({country.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="display_order">Display Order</Label>
              <Input 
                id="display_order" 
                type="number" 
                value={displayOrder} 
                onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="is_fallback" 
                checked={isFallback}
                onCheckedChange={(checked) => {
                  setIsFallback(!!checked);
                  if (checked) setSelectedCountry('');
                }}
              />
              <Label htmlFor="is_fallback" className="text-sm font-medium">
                Fallback Account (shown when no country-specific account exists)
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="is_active" 
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(!!checked)}
              />
              <Label htmlFor="is_active" className="text-sm font-medium">
                Active
              </Label>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Bank Account Fields</h3>
            
            {customFields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label htmlFor={`label_${field.id}`}>Field Label</Label>
                  <Input
                    id={`label_${field.id}`}
                    value={field.label}
                    onChange={(e) => handleFieldChange(field.id, 'label', e.target.value)}
                    placeholder="e.g., IFSC Code"
                    disabled={DEFAULT_FIELDS.some(df => df.id === field.id)}
                    required={field.required}
                  />
                </div>
                
                <div className="flex-1">
                  <Label htmlFor={`value_${field.id}`}>Value</Label>
                  <Input
                    id={`value_${field.id}`}
                    value={field.value}
                    onChange={(e) => handleFieldChange(field.id, 'value', e.target.value)}
                    placeholder="Enter value"
                    required={field.required}
                  />
                </div>
                
                {!DEFAULT_FIELDS.some(df => df.id === field.id) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveField(field.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            
            <div className="flex gap-2">
              <Select onValueChange={(value) => {
                const selectedField = COMMON_BANK_FIELDS.find(f => f.value === value);
                if (selectedField) {
                  handleAddField();
                  const newField = customFields[customFields.length - 1];
                  if (newField) {
                    handleFieldChange(newField.id, 'id', selectedField.value);
                    handleFieldChange(newField.id, 'label', selectedField.label);
                  }
                }
              }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Add common field" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_BANK_FIELDS.map((field) => (
                    <SelectItem key={field.value} value={field.value}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button type="button" variant="outline" onClick={handleAddField}>
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Field
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
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