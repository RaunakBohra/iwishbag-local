// ============================================================================
// SMART CUSTOMER INFO - Enhanced Customer Data Management
// Features: Smart address validation, customer insights, communication tools
// ============================================================================

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  MessageSquare,
  ExternalLink,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import type { UnifiedQuote } from '@/types/unified-quote';

interface SmartCustomerInfoProps {
  quote: UnifiedQuote;
  onUpdateQuote: () => void;
}

export const SmartCustomerInfo: React.FC<SmartCustomerInfoProps> = ({
  quote,
  onUpdateQuote,
}) => {
  const customerInfo = quote.customer_data.info;
  const shippingAddress = quote.customer_data.shipping_address;
  const isAnonymous = quote.is_anonymous;

  const formatAddress = (address: typeof shippingAddress) => {
    if (!address.line1) return 'No address provided';
    
    const parts = [
      address.line1,
      address.line2,
      address.city,
      address.state,
      address.postal,
      address.country,
    ].filter(Boolean);
    
    return parts.join(', ');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Customer Information</h3>
          <p className="text-sm text-gray-600">
            {isAnonymous ? 'Anonymous customer' : 'Registered customer'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="flex items-center">
            <MessageSquare className="w-4 h-4 mr-2" />
            Message
          </Button>
          <Button variant="outline" size="sm" className="flex items-center">
            <ExternalLink className="w-4 h-4 mr-2" />
            View Profile
          </Button>
        </div>
      </div>

      {/* Customer Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            Customer Details
            {isAnonymous && (
              <Badge variant="secondary" className="ml-2">Anonymous</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="text-sm font-medium text-gray-600">Name</label>
              <div className="flex items-center mt-1">
                <User className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-gray-900">
                  {customerInfo.name || 'Not provided'}
                </span>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium text-gray-600">Email</label>
              <div className="flex items-center mt-1">
                <Mail className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-gray-900">
                  {customerInfo.email || 'Not provided'}
                </span>
                {customerInfo.email && (
                  <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                )}
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="text-sm font-medium text-gray-600">Phone</label>
              <div className="flex items-center mt-1">
                <Phone className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-gray-900">
                  {customerInfo.phone || 'Not provided'}
                </span>
              </div>
            </div>

            {/* Social Handle */}
            {customerInfo.social_handle && (
              <div>
                <label className="text-sm font-medium text-gray-600">Social Handle</label>
                <div className="flex items-center mt-1">
                  <MessageSquare className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-900">{customerInfo.social_handle}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Shipping Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Shipping Address
            </div>
            <div className="flex items-center space-x-2">
              {shippingAddress.locked ? (
                <Badge variant="destructive" className="flex items-center">
                  <Shield className="w-3 h-3 mr-1" />
                  Locked
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Editable
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {shippingAddress.line1 ? (
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-900">
                  {formatAddress(shippingAddress)}
                </div>
              </div>
              
              {/* Address validation status */}
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Address validated
                </div>
                <div className="flex items-center text-blue-600">
                  <MapPin className="w-4 h-4 mr-1" />
                  Delivery available
                </div>
              </div>

              {shippingAddress.locked && (
                <div className="flex items-center text-orange-600 text-sm">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Address is locked and cannot be modified after payment
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No shipping address provided</p>
              <Button className="mt-3" size="sm">
                Add Address
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Insights */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-lg text-blue-800">Customer Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-blue-600">Quote Source</div>
              <div className="font-medium text-blue-800 capitalize">
                {quote.quote_source}
              </div>
            </div>
            <div>
              <div className="text-sm text-blue-600">Customer Type</div>
              <div className="font-medium text-blue-800">
                {isAnonymous ? 'Guest' : 'Registered'}
              </div>
            </div>
          </div>

          {/* Communication preferences */}
          <div className="pt-3 border-t border-blue-200">
            <div className="text-sm font-medium text-blue-800 mb-2">
              Preferred Communication
            </div>
            <div className="flex items-center space-x-4 text-sm">
              {customerInfo.email && (
                <Badge variant="outline" className="text-blue-700 border-blue-300">
                  Email
                </Badge>
              )}
              {customerInfo.phone && (
                <Badge variant="outline" className="text-blue-700 border-blue-300">
                  SMS
                </Badge>
              )}
              {customerInfo.social_handle && (
                <Badge variant="outline" className="text-blue-700 border-blue-300">
                  Social
                </Badge>
              )}
              {!customerInfo.email && !customerInfo.phone && !customerInfo.social_handle && (
                <span className="text-blue-600">No contact methods available</span>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="pt-3 border-t border-blue-200">
            <div className="text-sm font-medium text-blue-800 mb-2">
              Quick Actions
            </div>
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="outline" className="text-blue-700 border-blue-300">
                Send Quote
              </Button>
              <Button size="sm" variant="outline" className="text-blue-700 border-blue-300">
                Request Payment
              </Button>
              {!shippingAddress.line1 && (
                <Button size="sm" variant="outline" className="text-blue-700 border-blue-300">
                  Request Address
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};