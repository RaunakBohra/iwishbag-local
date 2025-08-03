/**
 * Delhivery Validated Address Input Component
 * Real-time address validation for Indian addresses using Delhivery APIs
 */

import React, { useState, useEffect } from 'react';
import { Input } from './input';
import { Label } from './label';
import { ValidatedInput, ValidationStatus } from './ValidatedInput';
import { AlertCircle, CheckCircle2, Loader2, MapPin, Truck, Clock } from 'lucide-react';
import { useDelhiveryAddressValidation } from '@/hooks/useDelhiveryAddressValidation';
import { cn } from '@/lib/utils';

interface DelhiveryValidatedAddressInputProps {
  // Form field values
  address_line1: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  
  // Change handlers
  onAddressChange: (field: string, value: string) => void;
  onValidationChange?: (isValid: boolean, details: any) => void;
  
  // Configuration
  showDeliveryInfo?: boolean;
  showSuggestions?: boolean;
  enableRealTimeValidation?: boolean;
  className?: string;
}

export function DelhiveryValidatedAddressInput({
  address_line1,
  city,
  state,
  pincode,
  country,
  onAddressChange,
  onValidationChange,
  showDeliveryInfo = true,
  showSuggestions = true,
  enableRealTimeValidation = true,
  className
}: DelhiveryValidatedAddressInputProps) {
  const [pincodeValidationStatus, setPincodeValidationStatus] = useState<ValidationStatus>('idle');
  const [showValidationDetails, setShowValidationDetails] = useState(false);

  // Use the Delhivery address validation hook
  const {
    isValidating,
    isValid,
    confidence,
    issues,
    suggestions,
    deliveryInfo,
    pincodeInfo,
    validatePincodeOnly,
    isIndianAddress,
    validationEnabled
  } = useDelhiveryAddressValidation({
    country,
    address_line1,
    city,
    state,
    pincode,
    enableValidation: enableRealTimeValidation
  });

  // Handle pincode validation separately for immediate feedback
  const handlePincodeChange = async (value: string) => {
    onAddressChange('pincode', value);
    
    if (!isIndianAddress || !value) {
      setPincodeValidationStatus('idle');
      return;
    }

    if (value.length === 6) {
      setPincodeValidationStatus('validating');
      
      try {
        const result = await validatePincodeOnly(value);
        
        if (result) {
          setPincodeValidationStatus(result.isValid && result.serviceable ? 'valid' : 'invalid');
        } else {
          setPincodeValidationStatus('invalid');
        }
      } catch (error) {
        setPincodeValidationStatus('invalid');
      }
    } else {
      setPincodeValidationStatus(value.length > 0 ? 'invalid' : 'idle');
    }
  };

  // Notify parent about validation changes
  useEffect(() => {
    if (onValidationChange && isIndianAddress) {
      onValidationChange(isValid, {
        confidence,
        issues,
        suggestions,
        deliveryInfo,
        pincodeInfo
      });
    }
  }, [isValid, confidence, issues, suggestions, deliveryInfo, pincodeInfo, onValidationChange, isIndianAddress]);

  // Show validation details when there are issues or suggestions
  useEffect(() => {
    if (isIndianAddress && (issues.length > 0 || suggestions.length > 0)) {
      setShowValidationDetails(true);
    }
  }, [issues.length, suggestions.length, isIndianAddress]);

  if (!isIndianAddress) {
    // For non-Indian addresses, render basic inputs without validation
    return (
      <div className={cn('space-y-4', className)}>
        <div>
          <Label htmlFor="address_line1">Street Address</Label>
          <Input
            id="address_line1"
            value={address_line1}
            onChange={(e) => onAddressChange('address_line1', e.target.value)}
            placeholder="Enter your street address"
            className="h-11 bg-white border-gray-300 rounded text-base"
          />
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => onAddressChange('city', e.target.value)}
              placeholder="City"
              className="h-11 bg-white border-gray-300 rounded text-base"
            />
          </div>
          
          <div>
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={state}
              onChange={(e) => onAddressChange('state', e.target.value)}
              placeholder="State"
              className="h-11 bg-white border-gray-300 rounded text-base"
            />
          </div>
          
          <div>
            <Label htmlFor="pincode">Postal Code</Label>
            <Input
              id="pincode"
              value={pincode}
              onChange={(e) => onAddressChange('pincode', e.target.value)}
              placeholder="Postal Code"
              className="h-11 bg-white border-gray-300 rounded text-base"
            />
          </div>
        </div>
      </div>
    );
  }

  // For Indian addresses, render enhanced validation inputs
  return (
    <div className={cn('space-y-4', className)}>
      {/* Street Address with validation */}
      <div>
        <Label htmlFor="address_line1">
          Street Address
          {isValidating && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs text-blue-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              Validating...
            </span>
          )}
        </Label>
        <ValidatedInput
          id="address_line1"
          value={address_line1}
          onChange={(e) => onAddressChange('address_line1', e.target.value)}
          placeholder="Enter your street address (e.g., Plot 123, Sector 15)"
          validationStatus={
            !enableRealTimeValidation ? 'idle' :
            isValidating ? 'validating' :
            address_line1.length === 0 ? 'idle' :
            address_line1.length >= 10 ? 'valid' : 'invalid'
          }
          validationError={address_line1.length > 0 && address_line1.length < 10 ? 'Please provide more detailed address' : undefined}
        />
      </div>

      {/* City, State, Pincode Row */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="city">City</Label>
          <ValidatedInput
            id="city"
            value={city}
            onChange={(e) => onAddressChange('city', e.target.value)}
            placeholder="City"
            validationStatus={
              !enableRealTimeValidation ? 'idle' :
              city.length === 0 ? 'idle' :
              city.length >= 2 ? 'valid' : 'invalid'
            }
          />
        </div>
        
        <div>
          <Label htmlFor="state">State</Label>
          <ValidatedInput
            id="state"
            value={state}
            onChange={(e) => onAddressChange('state', e.target.value)}
            placeholder="State"
            validationStatus={
              !enableRealTimeValidation ? 'idle' :
              state.length === 0 ? 'idle' :
              state.length >= 2 ? 'valid' : 'invalid'
            }
          />
        </div>
        
        <div>
          <Label htmlFor="pincode">
            Pincode
            {pincodeInfo && pincodeValidationStatus === 'valid' && (
              <span className="ml-2 text-xs text-green-600">
                {pincodeInfo.district}
              </span>
            )}
          </Label>
          <ValidatedInput
            id="pincode"
            value={pincode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              handlePincodeChange(value);
            }}
            placeholder="6-digit pincode"
            maxLength={6}
            validationStatus={pincodeValidationStatus}
            validationError={
              pincodeValidationStatus === 'invalid' 
                ? pincode.length === 6 
                  ? 'This pincode may not be serviceable'
                  : 'Please enter a valid 6-digit pincode'
                : undefined
            }
          />
        </div>
      </div>

      {/* Validation Status and Delivery Info */}
      {enableRealTimeValidation && validationEnabled && (
        <div className="space-y-3">
          {/* Overall Validation Status */}
          {(isValid || issues.length > 0) && (
            <div className={cn(
              'flex items-start gap-3 p-3 rounded-lg border',
              isValid 
                ? 'bg-green-50 border-green-200' 
                : 'bg-amber-50 border-amber-200'
            )}>
              {isValid ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    'text-sm font-medium',
                    isValid ? 'text-green-800' : 'text-amber-800'
                  )}>
                    {isValid ? 'Address Verified' : 'Address Needs Attention'}
                  </span>
                  
                  {confidence > 0 && (
                    <span className="text-xs bg-white px-2 py-1 rounded-full border">
                      {confidence}% confidence
                    </span>
                  )}
                </div>
                
                {/* Issues */}
                {issues.length > 0 && (
                  <ul className="text-sm text-amber-700 space-y-1">
                    {issues.map((issue, index) => (
                      <li key={index}>• {issue}</li>
                    ))}
                  </ul>
                )}
                
                {/* Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-medium text-gray-600 mb-1">Suggestions:</div>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {suggestions.slice(0, 2).map((suggestion, index) => (
                        <li key={index}>• {suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Delivery Information */}
          {showDeliveryInfo && deliveryInfo && (
            <div className="flex items-center gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Truck className={cn(
                  'h-4 w-4',
                  deliveryInfo.serviceable ? 'text-green-600' : 'text-red-600'
                )} />
                <span className="text-sm font-medium">
                  {deliveryInfo.serviceable ? 'Deliverable' : 'Not Serviceable'}
                </span>
              </div>
              
              {deliveryInfo.serviceable && deliveryInfo.estimated_days > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{deliveryInfo.estimated_days} day{deliveryInfo.estimated_days > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}