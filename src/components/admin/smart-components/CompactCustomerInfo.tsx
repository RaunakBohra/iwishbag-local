// ============================================================================
// COMPACT CUSTOMER INFO - World-Class E-commerce Admin Layout
// Based on Shopify Polaris & Amazon Seller Central design patterns 2025
// Features: Tabbed interface, horizontal layout, smart collapsing, inline editing
// ============================================================================

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  MessageSquare,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Edit3,
  Send,
  CreditCard,
  Target
} from 'lucide-react';
import type { UnifiedQuote } from '@/types/unified-quote';

interface CompactCustomerInfoProps {
  quote: UnifiedQuote;
  onUpdateQuote: () => void;
  compact?: boolean;
}

export const CompactCustomerInfo: React.FC<CompactCustomerInfoProps> = ({
  quote,
  onUpdateQuote,
  compact = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const customerInfo = quote.customer_data.info;
  const shippingAddress = quote.customer_data.shipping_address;
  const isAnonymous = quote.is_anonymous;

  const formatAddress = (address: typeof shippingAddress) => {
    if (!address.line1) return null;
    
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

  const formattedAddress = formatAddress(shippingAddress);
  const hasValidContact = customerInfo.email || customerInfo.phone;

  // Helper functions for customer avatar
  const getCustomerAvatarUrl = () => {
    // Check if customer has profile data with avatar_url
    if (quote.customer_data?.profile?.avatar_url) {
      return quote.customer_data.profile.avatar_url;
    }
    // Check user metadata for OAuth profile pictures
    if (quote.customer_data?.user_metadata?.avatar_url) {
      return quote.customer_data.user_metadata.avatar_url;
    }
    if (quote.customer_data?.user_metadata?.picture) {
      return quote.customer_data.user_metadata.picture;
    }
    return null;
  };

  const getCustomerInitials = () => {
    const name = customerInfo.name || 'Anonymous Customer';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Compact Header View (Always Visible)
  const CompactHeader = () => (
    <div className="p-4">
      {/* Top Row: Customer Name & Actions */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={getCustomerAvatarUrl() || undefined} alt={customerInfo.name || 'Customer'} />
            <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-medium">
              {getCustomerInitials()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-gray-900">
              {customerInfo.name || 'Anonymous Customer'}
            </div>
            <div className="text-xs text-gray-500">
              {quote.quote_source} • {isAnonymous ? 'Guest' : 'Registered'}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MessageSquare className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Quick Info Row */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-4">
          {hasValidContact && (
            <div className="flex items-center text-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              Contact available
            </div>
          )}
          {formattedAddress && (
            <div className="flex items-center text-blue-600">
              <MapPin className="w-3 h-3 mr-1" />
              Address provided
            </div>
          )}
          {shippingAddress.locked && (
            <div className="flex items-center text-orange-600">
              <Shield className="w-3 h-3 mr-1" />
              Locked
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 px-2 text-xs"
        >
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
      </div>
    </div>
  );

  // Expandable Detail Tabs (Shown when expanded)
  const DetailTabs = () => (
    <div className="border-t border-gray-100">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-8 text-xs">
          <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
          <TabsTrigger value="address" className="text-xs">Address</TabsTrigger>
          <TabsTrigger value="actions" className="text-xs">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="p-4 pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500 mb-1">Email</div>
              <div className="flex items-center">
                <Mail className="w-3 h-3 text-gray-400 mr-2" />
                <span className="text-gray-900 text-xs">
                  {customerInfo.email || 'Not provided'}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Phone</div>
              <div className="flex items-center">
                <Phone className="w-3 h-3 text-gray-400 mr-2" />
                <span className="text-gray-900 text-xs">
                  {customerInfo.phone || 'Not provided'}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Insights */}
          <div className="bg-blue-50 rounded-lg p-3 space-y-2">
            <div className="text-xs font-medium text-blue-800">Customer Insights</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-blue-600">Source:</span>
                <span className="ml-1 font-medium text-blue-800 capitalize">
                  {quote.quote_source}
                </span>
              </div>
              <div>
                <span className="text-blue-600">Type:</span>
                <span className="ml-1 font-medium text-blue-800">
                  {isAnonymous ? 'Guest' : 'Registered'}
                </span>
              </div>
            </div>
            
            {/* Communication preferences */}
            <div className="flex flex-wrap gap-1 mt-2">
              {customerInfo.email && (
                <Badge variant="outline" className="text-xs h-5 px-2 text-blue-700 border-blue-300">
                  Email
                </Badge>
              )}
              {customerInfo.phone && (
                <Badge variant="outline" className="text-xs h-5 px-2 text-blue-700 border-blue-300">
                  SMS
                </Badge>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="address" className="p-4 pt-3">
          {formattedAddress ? (
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-900 leading-relaxed">
                  {formattedAddress}
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Validated
                  </div>
                  <div className="flex items-center text-blue-600">
                    <MapPin className="w-3 h-3 mr-1" />
                    Deliverable
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                  <Edit3 className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              </div>

              {shippingAddress.locked && (
                <div className="flex items-center text-orange-600 text-xs bg-orange-50 p-2 rounded">
                  <AlertTriangle className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span>Address locked after payment</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <MapPin className="w-6 h-6 mx-auto mb-2 text-gray-300" />
              <p className="text-xs mb-2">No shipping address</p>
              <Button size="sm" className="h-7 px-3 text-xs">
                Add Address
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="actions" className="p-4 pt-3">
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              <Button size="sm" className="h-8 text-xs justify-start">
                <Send className="w-3 h-3 mr-2" />
                Send Quote
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs justify-start">
                <CreditCard className="w-3 h-3 mr-2" />
                Request Payment
              </Button>
              {!formattedAddress && (
                <Button variant="outline" size="sm" className="h-8 text-xs justify-start">
                  <Target className="w-3 h-3 mr-2" />
                  Request Address
                </Button>
              )}
            </div>

            {/* Quick Communication */}
            <div className="pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-500 mb-2">Quick Communication</div>
              <div className="flex gap-2">
                {customerInfo.email && (
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                    <Mail className="w-3 h-3 mr-1" />
                    Email
                  </Button>
                )}
                {customerInfo.phone && (
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                    <Phone className="w-3 h-3 mr-1" />
                    SMS
                  </Button>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <Card className="shadow-sm border-gray-200 overflow-hidden">
      <CompactHeader />
      {isExpanded && <DetailTabs />}
    </Card>
  );
};