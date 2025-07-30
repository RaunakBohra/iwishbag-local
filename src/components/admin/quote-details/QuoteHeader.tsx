import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { customerDisplayUtils } from '@/utils/customerDisplayUtils';
import type { AdminQuoteDetails } from '@/hooks/admin/useAdminQuoteDetails';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Hash,
  Globe,
  Copy,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface QuoteHeaderProps {
  quote: AdminQuoteDetails;
  onUpdate: (updates: Partial<AdminQuoteDetails>) => Promise<void>;
  isUpdating: boolean;
}

export const QuoteHeader: React.FC<QuoteHeaderProps> = ({
  quote,
  onUpdate: _onUpdate,
  isUpdating: _isUpdating
}) => {
  const { toast } = useToast();
  
  // Get customer display data
  const customerDisplay = customerDisplayUtils.getCustomerDisplayData(
    quote,
    quote.customer_profile
  );

  // Copy to clipboard helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
      duration: 2000
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      sent: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      paid: 'bg-purple-100 text-purple-800',
      ordered: 'bg-indigo-100 text-indigo-800',
      shipped: 'bg-cyan-100 text-cyan-800',
      completed: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                Quote Details
              </h1>
              <Badge className={getStatusColor(quote.status)}>
                {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
              </Badge>
              {quote.is_anonymous && (
                <Badge variant="secondary">Guest</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Hash className="w-4 h-4" />
                <span className="font-mono">
                  {quote.iwish_tracking_id || quote.display_id || quote.id.slice(0, 8)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => copyToClipboard(
                    quote.iwish_tracking_id || quote.display_id || quote.id,
                    'Quote ID'
                  )}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(quote.created_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Globe className="w-4 h-4" />
                <span>{quote.origin_country} → {quote.destination_country}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Details */}
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={quote.customer_profile?.avatar_url} />
              <AvatarFallback>
                {customerDisplay.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                {customerDisplay.name}
                {customerDisplay.isGuest && (
                  <Badge variant="outline" className="text-xs">Guest</Badge>
                )}
                {customerDisplay.isOAuth && (
                  <Badge variant="outline" className="text-xs">OAuth</Badge>
                )}
              </h3>
              <div className="space-y-1 mt-1">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-3 h-3" />
                  <span>{customerDisplay.email}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => copyToClipboard(customerDisplay.email, 'Email')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                {customerDisplay.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-3 h-3" />
                    <span>{customerDisplay.phone}</span>
                  </div>
                )}
              </div>
            </div>
            {quote.user_id && (
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600"
                onClick={() => window.open(`/admin/customers/${quote.user_id}`, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Shipping Address */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Shipping Address
            </h4>
            {quote.customer_data?.shipping_address ? (
              <div className="text-sm text-gray-600 space-y-1">
                <p>{quote.customer_data.shipping_address.name || customerDisplay.name}</p>
                <p>{quote.customer_data.shipping_address.line1}</p>
                {quote.customer_data.shipping_address.line2 && (
                  <p>{quote.customer_data.shipping_address.line2}</p>
                )}
                <p>
                  {quote.customer_data.shipping_address.city}, {quote.customer_data.shipping_address.state} {quote.customer_data.shipping_address.postal_code}
                </p>
                <p className="font-medium">{quote.destination_country}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No shipping address provided</p>
            )}
          </div>
        </div>

        {/* Customer Stats (if registered) */}
        {quote.customer_profile && (
          <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">Customer Since</p>
              <p className="text-sm font-medium">
                {format(new Date(quote.customer_profile.created_at), 'MMM d, yyyy')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Orders</p>
              <p className="text-sm font-medium">
                {quote.customer_profile.metadata?.total_orders || 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Lifetime Value</p>
              <p className="text-sm font-medium">
                ${quote.customer_profile.metadata?.total_spent || 0}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};