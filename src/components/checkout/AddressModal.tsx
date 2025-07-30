import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, MapPin, X } from 'lucide-react';
import { useAllCountries } from '@/hooks/useAllCountries';
import { InternationalAddressValidator } from '@/services/InternationalAddressValidator';
import { StateProvinceService } from '@/services/StateProvinceService';
import { PhoneInput } from '@/components/ui/phone-input';
import { isValidPhone } from '@/lib/phoneUtils';

interface AddressFormData {
  address_line1: string;
  address_line2?: string;
  city: string;
  state_province_region: string;
  postal_code: string;
  country: string;
  destination_country?: string;
  recipient_name?: string;
  phone?: string;
  is_default: boolean;
  save_to_profile?: boolean;
}

interface AddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: AddressFormData) => Promise<void>;
  initialData?: AddressFormData;
  isGuest?: boolean;
  isLoading?: boolean;
}

export const AddressModal: React.FC<AddressModalProps> = ({
  open,
  onOpenChange,
  onSave,
  initialData,
  isGuest = false,
  isLoading = false,
}) => {
  const { data: countries } = useAllCountries();
  const [fieldLabels, setFieldLabels] = useState({ state: 'State/Province', postal: 'Postal Code' });
  const [stateProvinces, setStateProvinces] = useState(StateProvinceService.getStatesForCountry(initialData?.country || '') || null);
  const [formData, setFormData] = useState<AddressFormData>(
    initialData || {
      address_line1: '',
      address_line2: '',
      city: '',
      state_province_region: '',
      postal_code: '',
      country: '',
      recipient_name: '',
      phone: '',
      is_default: false,
      save_to_profile: !isGuest,
    },
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update field labels and states when country changes
  useEffect(() => {
    if (formData.country) {
      const labels = InternationalAddressValidator.getFieldLabels(formData.country);
      setFieldLabels(labels);
      
      const states = StateProvinceService.getStatesForCountry(formData.country);
      setStateProvinces(states);
    }
  }, [formData.country]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.recipient_name?.trim()) {
      newErrors.recipient_name = 'Recipient name is required';
    }
    if (!formData.address_line1?.trim()) {
      newErrors.address_line1 = 'Street address is required';
    }
    if (!formData.city?.trim()) {
      newErrors.city = 'City is required';
    }
    if (!formData.state_province_region?.trim()) {
      newErrors.state_province_region = 'State/Province is required';
    }
    if (!formData.postal_code?.trim()) {
      newErrors.postal_code = 'Postal code is required';
    } else if (formData.country) {
      const postalValidation = InternationalAddressValidator.validatePostalCode(
        formData.postal_code,
        formData.country
      );
      if (!postalValidation.isValid) {
        newErrors.postal_code = postalValidation.error || 'Invalid postal code format';
      }
    }
    if (!formData.country?.trim()) {
      newErrors.country = 'Country is required';
    }
    if (formData.phone && !isValidPhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number with country code';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving address:', error);
    }
  };

  const handleInputChange = (field: keyof AddressFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left">
          <DialogTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-600" />
            Add New Address
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recipient_name" className="text-sm font-medium text-gray-700">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="recipient_name"
                  value={formData.recipient_name || ''}
                  onChange={(e) => handleInputChange('recipient_name', e.target.value)}
                  placeholder="John Doe"
                  className={`${errors.recipient_name ? 'border-red-500' : 'border-gray-300'} focus:border-teal-500 focus:ring-teal-500`}
                />
                {errors.recipient_name && (
                  <p className="text-sm text-red-600">{errors.recipient_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                  Phone Number
                </Label>
                <PhoneInput
                  value={formData.phone || ''}
                  onChange={(phone) => handleInputChange('phone', phone)}
                  placeholder="Enter phone number"
                  defaultCountry={formData.country?.toLowerCase() || 'us'}
                  disabled={isLoading}
                  error={!!errors.phone}
                />
                {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address_line1" className="text-sm font-medium text-gray-700">
                Street Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address_line1"
                value={formData.address_line1}
                onChange={(e) => handleInputChange('address_line1', e.target.value)}
                placeholder="123 Main Street"
                className={`${errors.address_line1 ? 'border-red-500' : 'border-gray-300'} focus:border-teal-500 focus:ring-teal-500`}
              />
              {errors.address_line1 && (
                <p className="text-sm text-red-600">{errors.address_line1}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line2" className="text-sm font-medium text-gray-700">
                Apartment, suite, etc. (optional)
              </Label>
              <Input
                id="address_line2"
                value={formData.address_line2 || ''}
                onChange={(e) => handleInputChange('address_line2', e.target.value)}
                placeholder="Apt 4B"
                className="border-gray-300 focus:border-teal-500 focus:ring-teal-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium text-gray-700">
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="New York"
                  className={`${errors.city ? 'border-red-500' : 'border-gray-300'} focus:border-teal-500 focus:ring-teal-500`}
                />
                {errors.city && <p className="text-sm text-red-600">{errors.city}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state" className="text-sm font-medium text-gray-700">
                  {fieldLabels.state} <span className="text-red-500">*</span>
                </Label>
                {stateProvinces ? (
                  <Select
                    value={formData.state_province_region}
                    onValueChange={(value) => handleInputChange('state_province_region', value)}
                  >
                    <SelectTrigger
                      className={`${errors.state_province_region ? 'border-red-500' : 'border-gray-300'} focus:border-teal-500 focus:ring-teal-500`}
                    >
                      <SelectValue placeholder={`Select ${fieldLabels.state.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {stateProvinces.map((state) => (
                        <SelectItem key={state.code} value={state.code}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="state"
                    value={formData.state_province_region}
                    onChange={(e) => handleInputChange('state_province_region', e.target.value)}
                    placeholder={formData.country === 'GB' ? 'e.g., Greater London' : 'e.g., NY'}
                    className={`${errors.state_province_region ? 'border-red-500' : 'border-gray-300'} focus:border-teal-500 focus:ring-teal-500`}
                  />
                )}
                {errors.state_province_region && (
                  <p className="text-sm text-red-600">{errors.state_province_region}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postal_code" className="text-sm font-medium text-gray-700">
                  {fieldLabels.postal} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => handleInputChange('postal_code', e.target.value)}
                  placeholder={formData.country ? InternationalAddressValidator.getPostalCodeExample(formData.country) : '10001'}
                  className={`${errors.postal_code ? 'border-red-500' : 'border-gray-300'} focus:border-teal-500 focus:ring-teal-500`}
                  onBlur={(e) => {
                    if (formData.country && e.target.value) {
                      const formatted = InternationalAddressValidator.formatPostalCode(e.target.value, formData.country);
                      if (formatted !== e.target.value) {
                        handleInputChange('postal_code', formatted);
                      }
                    }
                  }}
                />
                {errors.postal_code && <p className="text-sm text-red-600">{errors.postal_code}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="country" className="text-sm font-medium text-gray-700">
                  Country <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => handleInputChange('country', value)}
                >
                  <SelectTrigger
                    className={`${errors.country ? 'border-red-500' : 'border-gray-300'} focus:border-teal-500 focus:ring-teal-500`}
                  >
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries?.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.country && <p className="text-sm text-red-600">{errors.country}</p>}
              </div>
            </div>
          </div>

          {/* Options */}
          {!isGuest && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="save_to_profile"
                  checked={formData.save_to_profile}
                  onCheckedChange={(checked) =>
                    handleInputChange('save_to_profile', checked as boolean)
                  }
                />
                <Label htmlFor="save_to_profile" className="text-sm text-gray-700">
                  Save this address to my profile
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => handleInputChange('is_default', checked as boolean)}
                />
                <Label htmlFor="is_default" className="text-sm text-gray-700">
                  Set as default address
                </Label>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Address'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
