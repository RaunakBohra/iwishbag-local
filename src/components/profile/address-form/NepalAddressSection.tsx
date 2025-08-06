/**
 * Nepal Address Section
 * Handles Nepal's hierarchical address system (Province → District → Municipality → Ward)
 * Extracted from AddressForm for better maintainability
 */

import React from 'react';
import { Control } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ValidatedInput, ValidationStatus } from '@/components/ui/ValidatedInput';
import { ValidatedSelectTrigger } from '@/components/ui/ValidatedSelect';

interface AddressFormValues {
  first_name: string;
  last_name: string;
  company_name?: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state_province_region: string;
  postal_code?: string | null;
  destination_country: string;
  phone: string;
  delivery_instructions?: string;
  is_default: boolean;
}

interface StateProvince {
  code: string;
  name: string;
}

interface District {
  code: string;
  name: string;
}

interface Municipality {
  name: string;
  type: string;
}

interface NepalAddressSectionProps {
  control: Control<AddressFormValues>;
  stateProvinces: StateProvince[] | null;
  districts: District[];
  municipalities: Municipality[];
  selectedProvince: string;
  selectedDistrict: string;
  selectedMunicipality: string;
  wardNumber: string;
  area: string;
  provinceStatus: ValidationStatus;
  districtStatus: ValidationStatus;
  municipalityStatus: ValidationStatus;
  wardStatus: ValidationStatus;
  cityStatus: ValidationStatus;
  isPending: boolean;
  onProvinceChange: (province: string) => void;
  onDistrictChange: (district: string) => void;
  onMunicipalityChange: (municipality: string) => void;
  onWardChange: (ward: string) => void;
  onAreaChange: (area: string) => void;
}

export const NepalAddressSection: React.FC<NepalAddressSectionProps> = ({
  control,
  stateProvinces,
  districts,
  municipalities,
  selectedProvince,
  selectedDistrict,
  selectedMunicipality,
  wardNumber,
  area,
  provinceStatus,
  districtStatus,
  municipalityStatus,
  wardStatus,
  cityStatus,
  isPending,
  onProvinceChange,
  onDistrictChange,
  onMunicipalityChange,
  onWardChange,
  onAreaChange,
}) => {
  return (
    <>
      {/* Nepal Address Hierarchy: Province → District → City → Street/Ward → Landmark */}
      
      {/* Province and District Row */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="state_province_region"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm text-gray-600">Province</FormLabel>
              <Select
                key={`province-nepal`}
                onValueChange={(value) => {
                  field.onChange(value);
                  onProvinceChange(value);
                }}
                value={field.value || ''}
                disabled={isPending}
              >
                <FormControl>
                  <ValidatedSelectTrigger 
                    validationStatus={provinceStatus}
                    validationError={undefined}
                  >
                    <SelectValue placeholder="Select province" />
                  </ValidatedSelectTrigger>
                </FormControl>
                <SelectContent>
                  {stateProvinces?.map((state) => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm text-gray-600">District</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  onDistrictChange(value);
                }}
                value={selectedDistrict || ''}
                disabled={!selectedProvince || districts.length === 0 || isPending}
              >
                <FormControl>
                  <ValidatedSelectTrigger 
                    validationStatus={districtStatus}
                    validationError={undefined}
                  >
                    <SelectValue placeholder={
                      !selectedProvince 
                        ? "Select province first" 
                        : districts.length === 0
                        ? "No districts available"
                        : "Select district"
                    } />
                  </ValidatedSelectTrigger>
                </FormControl>
                <SelectContent>
                  {districts.map((district) => (
                    <SelectItem key={district.code} value={district.code}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Municipality and Ward Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Municipality/VDC
          </label>
          <Select
            onValueChange={(value) => onMunicipalityChange(value)}
            value={selectedMunicipality}
            disabled={!selectedDistrict || municipalities.length === 0 || isPending}
          >
            <ValidatedSelectTrigger 
              validationStatus={municipalityStatus}
              validationError={undefined}
            >
              <SelectValue placeholder={
                !selectedDistrict 
                  ? "Select district first" 
                  : municipalities.length === 0
                  ? "No municipalities available"
                  : "Select municipality"
              } />
            </ValidatedSelectTrigger>
            <SelectContent>
              {municipalities.map((municipality, index) => (
                <SelectItem key={index} value={municipality.name}>
                  {municipality.name} ({municipality.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Ward Number
          </label>
          <ValidatedInput
            type="number"
            min="1"
            max="35"
            value={wardNumber}
            onChange={(e) => onWardChange(e.target.value)}
            validationStatus={wardStatus}
            placeholder="e.g., 5"
            disabled={!selectedMunicipality || isPending}
          />
        </div>
      </div>

      {/* Area/Street */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">
          Area/Street (optional)
        </label>
        <ValidatedInput
          value={area}
          onChange={(e) => onAreaChange(e.target.value)}
          validationStatus="idle"
          placeholder="e.g., Kalimati Chowk, New Road"
          disabled={isPending}
        />
        <p className="text-xs text-gray-500 mt-1">
          Specific area or street name within the ward
        </p>
      </div>

      {/* Hidden city field - we construct it from Nepal components */}
      <FormField
        control={control}
        name="city"
        render={({ field }) => {
          // Construct the city value from selected district
          React.useEffect(() => {
            if (selectedDistrict) {
              field.onChange(selectedDistrict);
            }
          }, [selectedDistrict]);

          return <input type="hidden" {...field} />;
        }}
      />
    </>
  );
};