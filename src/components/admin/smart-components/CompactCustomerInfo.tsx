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
import { useAuth } from '@/contexts/AuthContext';
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
  Target,
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
  const [activeTab, setActiveTab] = useState('address');
  const { user } = useAuth(); // Get current auth context for fallback

  const customerInfo = quote.customer_data?.info || {};
  const shippingAddress = quote.customer_data?.shipping_address || {};
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

  // Helper functions for customer avatar
  const getCustomerAvatarUrl = () => {
    // First check stored profile avatar (includes OAuth fallback from UnifiedDataEngine)
    if (quote.customer_data?.profile?.avatar_url) {
      return quote.customer_data.profile.avatar_url;
    }
    
    // If quote belongs to current user and no stored avatar, use auth context
    if (user && quote.user_id === user.id) {
      // Check OAuth profile pictures from auth metadata
      if (user.user_metadata?.avatar_url) {
        return user.user_metadata.avatar_url;
      }
      if (user.user_metadata?.picture) {
        return user.user_metadata.picture;
      }
    }
    
    return null;
  };

  // Helper to get customer name from multiple possible sources
  const getCustomerName = () => {
    // First check stored quote data
    const storedName = customerInfo?.name || 
                      quote.customer_name || 
                      quote.customer_data?.customer_name;
    
    if (storedName) return storedName;
    
    // If quote belongs to current user and no stored name, use auth context
    if (user && quote.user_id === user.id) {
      const authName = user.user_metadata?.name || 
                      user.user_metadata?.full_name;
      if (authName) return authName;
      
      // Fallback to email prefix for OAuth users
      if (user.email) return user.email.split('@')[0];
    }
    
    return 'Anonymous Customer';
  };

  const getCustomerInitials = () => {
    // Use the enhanced name getter that includes auth context fallback
    const name = getCustomerName();
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper to get customer email from multiple possible sources  
  const getCustomerEmail = () => {
    // First check stored quote data
    const storedEmail = customerInfo?.email || 
                       quote.email || 
                       quote.customer_data?.email;
    
    if (storedEmail) return storedEmail;
    
    // If quote belongs to current user, use auth context
    if (user && quote.user_id === user.id && user.email) {
      return user.email;
    }
    
    return 'No email provided';
  };

  // Helper to get customer phone from multiple possible sources
  const getCustomerPhone = () => {
    // First check stored quote data
    const storedPhone = customerInfo?.phone || 
                       quote.customer_phone || 
                       quote.customer_data?.customer_phone;
    
    if (storedPhone) return storedPhone;
    
    // If quote belongs to current user, use auth context
    if (user && quote.user_id === user.id) {
      const authPhone = user.user_metadata?.phone || 
                       user.user_metadata?.phone_number;
      if (authPhone) return authPhone;
    }
    
    return 'No phone provided';
  };

  // Debug logging to understand the data structure
  console.log('🔍 [DEBUG] CompactCustomerInfo data:', {
    quote_id: quote.id,
    quote_user_id: quote.user_id,
    current_user_id: user?.id,
    is_current_user: user && quote.user_id === user.id,
    customer_data: quote.customer_data,
    customerInfo,
    auth_context: user ? {
      name: user.user_metadata?.name,
      full_name: user.user_metadata?.full_name,
      email: user.email,
      avatar_url: user.user_metadata?.avatar_url,
      picture: user.user_metadata?.picture,
      phone: user.user_metadata?.phone
    } : null,
    resolved_data: {
      name: getCustomerName(),
      email: getCustomerEmail(),
      phone: getCustomerPhone(),
      avatar: getCustomerAvatarUrl()
    },
    shipping_address: shippingAddress,
    is_anonymous: isAnonymous
  });

  // Compact Header View (Always Visible)
  const CompactHeader = () => (
    <div className="p-4">
      {/* Top Row: Customer Name & Actions */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Avatar className="w-8 h-8">
            <AvatarImage
              src={getCustomerAvatarUrl() || undefined}
              alt={getCustomerName()}
            />
            <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-medium">
              {getCustomerInitials()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-gray-900">
              {getCustomerName()}
            </div>
            <div className="text-xs text-gray-500">
              {quote.quote_source || 'Unknown'} • {isAnonymous ? 'Guest' : 'Registered'}
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

      {/* Contact Information Row */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center space-x-4">
          <div className="flex items-center min-w-0 flex-1">
            <Mail className="w-3 h-3 text-gray-400 mr-2 flex-shrink-0" />
            <span className="text-gray-900 truncate" title={getCustomerEmail()}>
              {getCustomerEmail()}
            </span>
          </div>
          <div className="flex items-center min-w-0 flex-1">
            <Phone className="w-3 h-3 text-gray-400 mr-2 flex-shrink-0" />
            <span className="text-gray-900 truncate" title={getCustomerPhone()}>
              {getCustomerPhone()}
            </span>
          </div>
        </div>

        {/* Status Indicators Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
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
            {/* Communication method badges */}
            {getCustomerEmail() !== 'No email provided' && (
              <Badge variant="outline" className="text-xs h-4 px-1 text-blue-700 border-blue-300">
                Email
              </Badge>
            )}
            {getCustomerPhone() !== 'No phone provided' && (
              <Badge variant="outline" className="text-xs h-4 px-1 text-blue-700 border-blue-300">
                SMS
              </Badge>
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
    </div>
  );

  // Expandable Detail Tabs (Shown when expanded)
  const DetailTabs = () => (
    <div className="border-t border-gray-100">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-8 text-xs">
          <TabsTrigger value="address" className="text-xs">
            Address
          </TabsTrigger>
          <TabsTrigger value="actions" className="text-xs">
            Actions
          </TabsTrigger>
        </TabsList>


        <TabsContent value="address" className="p-4 pt-3">
          {formattedAddress ? (
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-900 leading-relaxed">{formattedAddress}</div>
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
                {getCustomerEmail() !== 'No email provided' && (
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                    <Mail className="w-3 h-3 mr-1" />
                    Email
                  </Button>
                )}
                {getCustomerPhone() !== 'No phone provided' && (
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
