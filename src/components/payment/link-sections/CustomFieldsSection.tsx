/**
 * CustomFieldsSection Component
 * Handles dynamic custom field creation and management
 * Extracted from EnhancedPaymentLinkGenerator for better maintainability
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Plus,
  Trash2,
  Settings,
  Eye,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface CustomField {
  name: string;
  type: 'text' | 'number' | 'email' | 'phone' | 'date' | 'dropdown';
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

interface QuoteData {
  destination_country?: string;
  origin_country?: string;
  product_name?: string;
}

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
}

interface CustomFieldsSectionProps {
  customFields: CustomField[];
  onCustomFieldsChange: (fields: CustomField[]) => void;
  quote?: QuoteData;
  customerInfo?: CustomerInfo;
  className?: string;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: '📝' },
  { value: 'number', label: 'Number', icon: '🔢' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'phone', label: 'Phone', icon: '📞' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'dropdown', label: 'Dropdown', icon: '📋' },
] as const;

export const CustomFieldsSection: React.FC<CustomFieldsSectionProps> = ({
  customFields,
  onCustomFieldsChange,
  quote,
  customerInfo,
  className = '',
}) => {
  const { toast } = useToast();
  const [showSuggestedFields, setShowSuggestedFields] = useState(false);

  // Generate suggested custom fields based on quote and customer data
  const getSuggestedCustomFields = (): CustomField[] => {
    const suggestions: CustomField[] = [];

    // Always suggest delivery preference
    suggestions.push({
      name: 'delivery_preference',
      type: 'dropdown',
      label: 'Delivery Preference',
      required: false,
      options: ['Standard Delivery', 'Express Delivery', 'Weekend Delivery', 'Pickup'],
      placeholder: 'Choose delivery option',
    });

    // Suggest country-specific fields
    if (quote?.destination_country === 'IN') {
      suggestions.push({
        name: 'gst_number',
        type: 'text',
        label: 'GST Number (Optional)',
        required: false,
        placeholder: '22AAAAA0000A1Z5',
      });
    }

    // Suggest additional contact if phone is missing
    if (!customerInfo?.phone) {
      suggestions.push({
        name: 'contact_number',
        type: 'phone',
        label: 'Contact Number',
        required: true,
        placeholder: '+1 (555) 000-0000',
      });
    }

    // Suggest order notes for complex orders
    if (quote?.product_name) {
      suggestions.push({
        name: 'special_instructions',
        type: 'text',
        label: 'Special Instructions',
        required: false,
        placeholder: 'Any special delivery or packaging instructions',
      });
    }

    // Suggest referral source
    suggestions.push({
      name: 'referral_source',
      type: 'dropdown',
      label: 'How did you hear about us?',
      required: false,
      options: ['Google Search', 'Social Media', 'Friend Referral', 'Advertisement', 'Other'],
      placeholder: 'Select source',
    });

    return suggestions;
  };

  const suggestedFields = getSuggestedCustomFields();

  const addCustomField = () => {
    const newField: CustomField = {
      name: `field_${customFields.length + 1}`,
      type: 'text',
      label: 'Custom Field',
      required: false,
      placeholder: 'Enter value...',
    };
    onCustomFieldsChange([...customFields, newField]);
  };

  const addSuggestedField = (field: CustomField) => {
    // Check if field already exists
    if (customFields.some((f) => f.name === field.name)) {
      toast({
        title: 'Field already added',
        description: 'This field is already in your custom fields list.',
        variant: 'destructive',
      });
      return;
    }

    onCustomFieldsChange([...customFields, { ...field }]);
    toast({
      title: 'Field added',
      description: `${field.label} has been added to your custom fields.`,
    });
  };

  const removeCustomField = (index: number) => {
    onCustomFieldsChange(customFields.filter((_, i) => i !== index));
  };

  const updateCustomField = (index: number, updates: Partial<CustomField>) => {
    const updated = customFields.map((field, i) =>
      i === index ? { ...field, ...updates } : field,
    );
    onCustomFieldsChange(updated);
  };

  const getFieldTypeIcon = (type: string) => {
    const fieldType = FIELD_TYPES.find(t => t.value === type);
    return fieldType?.icon || '📝';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold mb-4">Custom Fields</h3>

        {/* Suggested Fields */}
        {suggestedFields.length > 0 && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                Suggested Fields
                <Badge variant="secondary">{suggestedFields.length}</Badge>
              </CardTitle>
              <CardDescription>
                Smart suggestions based on your quote and customer information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => setShowSuggestedFields(!showSuggestedFields)}
                className="mb-4 w-full justify-between"
              >
                {showSuggestedFields ? 'Hide' : 'Show'} Suggested Fields
                {showSuggestedFields ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>

              {showSuggestedFields && (
                <div className="space-y-3">
                  {suggestedFields.map((field, index) => (
                    <div
                      key={`${field.name}-${index}`}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{getFieldTypeIcon(field.type)}</span>
                        <div>
                          <p className="font-medium">{field.label}</p>
                          <p className="text-sm text-gray-600">
                            {field.type === 'dropdown' ? `Dropdown with ${field.options?.length} options` : `${field.type} field`}
                            {field.required ? ' • Required' : ' • Optional'}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addSuggestedField(field)}
                        disabled={customFields.some((f) => f.name === field.name)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Custom Fields List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Custom Fields
                {customFields.length > 0 && (
                  <Badge variant="outline">{customFields.length}</Badge>
                )}
              </span>
              <Button onClick={addCustomField} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Field
              </Button>
            </CardTitle>
            <CardDescription>
              Add custom fields to collect additional information from customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {customFields.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No custom fields added yet</p>
                <p className="text-sm mt-1">Click "Add Field" to create your first custom field</p>
              </div>
            ) : (
              <div className="space-y-4">
                {customFields.map((field, index) => (
                  <Card key={index} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        {/* Field Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getFieldTypeIcon(field.type)}</span>
                            <Badge variant="secondary">{field.type}</Badge>
                            {field.required && (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCustomField(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Field Configuration */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Field Label</Label>
                            <Input
                              value={field.label}
                              onChange={(e) => updateCustomField(index, { label: e.target.value })}
                              placeholder="Field label"
                            />
                          </div>
                          <div>
                            <Label>Field Name</Label>
                            <Input
                              value={field.name}
                              onChange={(e) => updateCustomField(index, { name: e.target.value })}
                              placeholder="field_name"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Field Type</Label>
                            <Select
                              value={field.type}
                              onValueChange={(value: any) => updateCustomField(index, { type: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FIELD_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    <div className="flex items-center gap-2">
                                      <span>{type.icon}</span>
                                      {type.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Placeholder</Label>
                            <Input
                              value={field.placeholder || ''}
                              onChange={(e) => updateCustomField(index, { placeholder: e.target.value })}
                              placeholder="Enter placeholder text"
                            />
                          </div>
                        </div>

                        {/* Dropdown Options */}
                        {field.type === 'dropdown' && (
                          <div>
                            <Label>Dropdown Options</Label>
                            <Textarea
                              value={field.options?.join('\n') || ''}
                              onChange={(e) => updateCustomField(index, { options: e.target.value.split('\n').filter(Boolean) })}
                              placeholder="Option 1&#10;Option 2&#10;Option 3"
                              className="min-h-[80px]"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Enter each option on a new line
                            </p>
                          </div>
                        )}

                        {/* Required Toggle */}
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Required Field</Label>
                            <p className="text-sm text-gray-600">Customers must fill this field</p>
                          </div>
                          <Switch
                            checked={field.required}
                            onCheckedChange={(checked) => updateCustomField(index, { required: checked })}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};