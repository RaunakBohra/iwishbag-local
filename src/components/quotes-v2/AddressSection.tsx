import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  Eye,
  EyeOff,
  Edit3
} from 'lucide-react';

interface DeliveryAddress {
  id?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state_province_region: string;
  postal_code: string;
  country: string;
  recipient_name?: string;
  phone?: string;
  is_default: boolean;
}

interface AddressSectionProps {
  // Customer Information
  customerName: string;
  onCustomerNameChange: (name: string) => void;
  customerEmail: string;
  onCustomerEmailChange: (email: string) => void;
  customerPhone: string;
  onCustomerPhoneChange: (phone: string) => void;
  
  // Address Information
  deliveryAddress: DeliveryAddress | null;
  onDeliveryAddressChange: (address: DeliveryAddress | null) => void;
  
  // UI State
  isEditMode: boolean;
  showAddressDetails: boolean;
  onShowAddressDetailsChange: (show: boolean) => void;
}

export const AddressSection: React.FC<AddressSectionProps> = ({
  customerName,
  onCustomerNameChange,
  customerEmail,
  onCustomerEmailChange,
  customerPhone,
  onCustomerPhoneChange,
  deliveryAddress,
  onDeliveryAddressChange,
  isEditMode,
  showAddressDetails,
  onShowAddressDetailsChange
}) => {
  // Local state for edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editingValues, setEditingValues] = useState({
    name: customerName,
    email: customerEmail,
    phone: customerPhone
  });

  const getAddressDisplay = (address: DeliveryAddress | null, showDetails: boolean) => {
    if (!address) return { text: 'Not provided', isMultiline: false };

    if (showDetails) {
      const lines = [
        address.recipient_name && address.recipient_name.trim(),
        address.address_line1?.trim(),
        address.address_line2?.trim(),
        `${address.city}, ${address.state_province_region} ${address.postal_code}`.trim(),
        address.country?.trim(),
        address.phone && `📞 ${address.phone}`
      ].filter(Boolean);
      
      return {
        text: lines.join(', '),
        lines: lines,
        isMultiline: true
      };
    } else {
      // Compact view
      const recipient = address.recipient_name || 'Recipient';
      const location = `${address.city}, ${address.state_province_region}`;
      return {
        text: `${recipient} • ${location}`,
        isMultiline: false
      };
    }
  };

  const handleEdit = () => {
    setEditingValues({
      name: customerName,
      email: customerEmail,
      phone: customerPhone
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    onCustomerNameChange(editingValues.name);
    onCustomerEmailChange(editingValues.email);
    onCustomerPhoneChange(editingValues.phone);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditingValues({
      name: customerName,
      email: customerEmail,
      phone: customerPhone
    });
    setIsEditing(false);
  };

  return (
    <>
      {/* Customer Contact & Address - Display View */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Customer Information</h3>
          {isEditMode && !isEditing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEdit}
              className="h-6 px-2 text-xs text-gray-600 hover:text-gray-900"
            >
              <Edit3 className="w-3 h-3 mr-1" />
              Edit
            </Button>
          )}
        </div>

        {isEditing ? (
          /* Edit Mode */
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Name</label>
                <Input
                  placeholder="Customer Name"
                  value={editingValues.name}
                  onChange={(e) => setEditingValues(prev => ({ ...prev, name: e.target.value }))}
                  className="text-sm h-8"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Email</label>
                <Input
                  type="email"
                  placeholder="Email Address"
                  value={editingValues.email}
                  onChange={(e) => setEditingValues(prev => ({ ...prev, email: e.target.value }))}
                  className="text-sm h-8"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Phone</label>
                <Input
                  placeholder="Phone Number"
                  value={editingValues.phone}
                  onChange={(e) => setEditingValues(prev => ({ ...prev, phone: e.target.value }))}
                  className="text-sm h-8"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                className="h-7 px-3 text-xs"
              >
                Save Changes
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                className="h-7 px-3 text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          /* Display Mode */
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Name */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-3 w-3 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-blue-700 uppercase tracking-wide">Name</div>
                <div className="text-sm font-medium text-gray-900 truncate">
                  {customerName || 'Not provided'}
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <Mail className="h-3 w-3 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-green-700 uppercase tracking-wide">Email</div>
                <div className="text-sm font-medium text-gray-900 truncate">
                  {customerEmail || 'Not provided'}
                </div>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                <Phone className="h-3 w-3 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-purple-700 uppercase tracking-wide">Phone</div>
                <div className="text-sm font-medium text-gray-900 truncate">
                  {customerPhone || 'Not provided'}
                </div>
              </div>
            </div>

            {/* Delivery Address - Compact */}
            {deliveryAddress ? (
              <div className="flex items-center gap-1">
                <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center relative">
                  <MapPin className="h-3 w-3 text-teal-600" />
                  {deliveryAddress.is_default && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-2 w-2 text-white" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-teal-700 uppercase tracking-wide">Address</div>
                  {(() => {
                    const addressDisplay = getAddressDisplay(deliveryAddress, showAddressDetails);
                    return addressDisplay.isMultiline ? (
                      <div className="text-sm font-medium text-gray-900">
                        {addressDisplay.lines?.map((line, index) => (
                          <div key={index} className="leading-tight">
                            {line}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {addressDisplay.text}
                      </div>
                    );
                  })()}
                </div>
                <button
                  onClick={() => onShowAddressDetailsChange(!showAddressDetails)}
                  className="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                  title={showAddressDetails ? "Hide address details" : "Show address details"}
                >
                  {showAddressDetails ? (
                    <EyeOff className="h-2.5 w-2.5 text-gray-600" />
                  ) : (
                    <Eye className="h-2.5 w-2.5 text-gray-600" />
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <MapPin className="h-3 w-3 text-gray-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Address</div>
                  <div className="text-xs text-gray-500">
                    Not provided
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Address Status Indicators */}
        {deliveryAddress && (
          <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-gray-200">
            {deliveryAddress.is_default && (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Default Address
              </Badge>
            )}
            {deliveryAddress.country && (
              <Badge variant="outline" className="text-xs">
                📍 {deliveryAddress.country}
              </Badge>
            )}
            {deliveryAddress.phone && (
              <Badge variant="outline" className="text-xs">
                📞 Contact Available
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Quick Edit Form - Only show for new quotes when not in edit mode */}
      {!isEditMode && !isEditing && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Edit3 className="w-4 h-4" />
            Quick Edit Customer Details
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Customer Name"
              value={customerName}
              onChange={(e) => onCustomerNameChange(e.target.value)}
              className="text-sm h-9"
            />
            <Input
              type="email"
              placeholder="Email Address"
              value={customerEmail}
              onChange={(e) => onCustomerEmailChange(e.target.value)}
              className="text-sm h-9"
            />
            <Input
              placeholder="Phone Number"
              value={customerPhone}
              onChange={(e) => onCustomerPhoneChange(e.target.value)}
              className="text-sm h-9"
            />
          </div>
          
          {/* Address Management Placeholder */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Delivery Address: {deliveryAddress ? '✓ Configured' : '⚠️ Not set'}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-3 text-xs"
                disabled
              >
                Manage Address
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};