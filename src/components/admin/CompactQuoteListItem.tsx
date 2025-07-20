import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tables } from '@/integrations/supabase/types';
import { useNavigate } from 'react-router-dom';
import { useAdminCurrencyDisplay } from '@/hooks/useAdminCurrencyDisplay';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { ShareQuoteButton } from './ShareQuoteButton';
import { 
  Calendar, 
  User, 
  Package, 
  DollarSign, 
  MapPin, 
  ExternalLink,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Mail,
  Copy,
  ArrowRight,
  Phone
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { getQuoteRouteCountries } from '@/lib/route-specific-customs';
import { useCountryUtils } from '@/lib/countryUtils';
import { ShippingRouteDisplay } from '@/components/shared/ShippingRouteDisplay';
import { Body, BodySmall } from '@/components/ui/typography';

type QuoteWithItems = Tables<'quotes'> & {
  quote_items: Tables<'quote_items'>[];
  profiles?: { preferred_display_currency?: string } | null;
};

interface CompactQuoteListItemProps {
  quote: QuoteWithItems;
  isSelected: boolean;
  onSelect: (quoteId: string, selected: boolean) => void;
}

const getPriorityBadge = (priority: QuoteWithItems['priority']) => {
  if (!priority) return null;

  const config = {
    low: {
      label: 'Low',
      className: 'bg-gray-100 text-gray-700 border-gray-300',
    },
    medium: {
      label: 'Medium',
      className: 'bg-teal-100 text-teal-700 border-teal-300',
    },
    high: {
      label: 'High',
      className: 'bg-red-100 text-red-700 border-red-300',
    },
  };

  const badgeConfig = config[priority] || config.medium;

  return (
    <Badge className={cn('text-xs font-medium', badgeConfig.className)}>
      {badgeConfig.label}
    </Badge>
  );
};

export const CompactQuoteListItem = ({ quote, isSelected, onSelect }: CompactQuoteListItemProps) => {
  const navigate = useNavigate();
  const { formatAmount } = useAdminCurrencyDisplay(quote);
  const [routeCountries, setRouteCountries] = useState<{
    origin: string;
    destination: string;
  } | null>(null);
  const [customerProfile, setCustomerProfile] = useState<{
    full_name: string | null;
    phone: string | null;
  } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { countries: allCountries } = useCountryUtils();

  const firstItem = quote.items?.[0];
  const totalItems = quote.items?.length || 0;
  const productName = firstItem?.name || 'Product name not specified';

  const formattedAmount = formatAmount(quote.final_total_usd || 0);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
      return diffHours <= 1 ? 'Just now' : `${diffHours}h ago`;
    }
    return diffDays === 1 ? 'Yesterday' : `${diffDays}d ago`;
  };

  useEffect(() => {
    let isMounted = true;
    
    // Fetch route countries
    async function fetchRouteCountries() {
      try {
        const countries = await getQuoteRouteCountries(quote);
        if (isMounted) {
          setRouteCountries(countries);
        }
      } catch (error) {
        console.error('Error fetching route countries:', error);
      }
    }

    // Fetch customer profile
    async function fetchCustomerProfile() {
      if (quote.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', quote.user_id)
          .single();

        if (isMounted && profile) {
          setCustomerProfile(profile);
        }
      }
    }

    fetchRouteCountries();
    fetchCustomerProfile();

    return () => {
      isMounted = false;
    };
  }, [quote]);

  const customerName = customerProfile?.full_name || quote.customer_name || quote.email || 'Unknown Customer';

  return (
    <>
      <div className={cn(
        'bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-200',
        isSelected && 'ring-2 ring-teal-500 border-teal-500'
      )}>
        <div className="flex items-center gap-4">
          {/* Selection Checkbox */}
          <div className="flex-shrink-0">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(quote.id, !!checked)}
              className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
            />
          </div>

          {/* Status Indicator */}
          <div className={cn(
            'flex-shrink-0 w-2 h-12 rounded-full',
            quote.status === 'cancelled' && 'bg-red-500',
            quote.status === 'rejected' && 'bg-red-500',
            quote.status === 'pending' && 'bg-yellow-500',
            quote.status === 'approved' && 'bg-green-500',
            quote.status === 'paid' && 'bg-teal-500',
            quote.status === 'ordered' && 'bg-orange-500',
            quote.status === 'shipped' && 'bg-teal-500',
            quote.status === 'completed' && 'bg-green-600',
            !['cancelled', 'rejected', 'pending', 'approved', 'paid', 'ordered', 'shipped', 'completed'].includes(quote.status) && 'bg-gray-300',
          )} />

          {/* Product Image */}
          {firstItem?.image_url && (
            <div className="flex-shrink-0">
              <img
                src={firstItem.image_url}
                alt="Product"
                className="w-12 h-12 object-cover rounded-lg border border-gray-200"
              />
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header Row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Body className="font-semibold text-gray-900">
                  {quote.display_id || `QT-${quote.id.substring(0, 8).toUpperCase()}`}
                </Body>
                <StatusBadge status={quote.status} />
                {getPriorityBadge(quote.priority)}
              </div>
              <div className="flex items-center gap-2">
                <BodySmall className="text-gray-500">
                  {formatDate(quote.created_at)}
                </BodySmall>
                <ShareQuoteButton quote={quote} variant="icon" />
              </div>
            </div>

            {/* Product Name Row */}
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-gray-500" />
              <BodySmall className="text-gray-700 font-medium truncate">
                {productName}
                {totalItems > 1 && (
                  <span className="text-gray-500 ml-1">
                    +{totalItems - 1} more item{totalItems - 1 !== 1 ? 's' : ''}
                  </span>
                )}
              </BodySmall>
              {firstItem?.product_url && (
                <a
                  href={firstItem.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 hover:text-teal-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <BodySmall className="text-gray-700 font-medium truncate">
                  {customerName}
                </BodySmall>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-500" />
                <BodySmall className="text-gray-700">
                  {totalItems} item{totalItems !== 1 ? 's' : ''}
                </BodySmall>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <BodySmall className="text-gray-700 font-medium">
                  {formattedAmount}
                </BodySmall>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <BodySmall className="text-gray-700 truncate">
                  {routeCountries ? (
                    <ShippingRouteDisplay
                      originCountry={routeCountries.origin}
                      destinationCountry={routeCountries.destination}
                      website={quote.website || ''}
                    />
                  ) : (
                    'Loading...'
                  )}
                </BodySmall>
              </div>
            </div>

            {/* Phone Number (if available) */}
            {customerProfile?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-gray-500" />
                <BodySmall className="text-gray-600">
                  {customerProfile.phone}
                </BodySmall>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin/quotes/${quote.id}`)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2 h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate(`/admin/quotes/${quote.id}`)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsPreviewOpen(true)}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Quick Preview
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/admin/quotes/${quote.id}`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Quote
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Quick Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Quote {quote.display_id || quote.id} - Quick Preview
            </DialogTitle>
            <DialogDescription>
              {customerName} • {formatDate(quote.created_at)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Product Information */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-gray-500" />
                <BodySmall className="text-gray-500 font-medium">Product</BodySmall>
              </div>
              <div className="flex items-center gap-2">
                <Body className="font-medium text-gray-900">{productName}</Body>
                {firstItem?.product_url && (
                  <a
                    href={firstItem.product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 hover:text-teal-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
              {totalItems > 1 && (
                <BodySmall className="text-gray-600 mt-1">
                  +{totalItems - 1} more item{totalItems - 1 !== 1 ? 's' : ''}
                </BodySmall>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <BodySmall className="text-gray-500 font-medium mb-1">Status</BodySmall>
                <StatusBadge status={quote.status} />
              </div>
              <div>
                <BodySmall className="text-gray-500 font-medium mb-1">Total Amount</BodySmall>
                <Body className="font-semibold">
                  {formattedAmount}
                </Body>
              </div>
              <div>
                <BodySmall className="text-gray-500 font-medium mb-1">Items</BodySmall>
                <Body>{totalItems} item{totalItems !== 1 ? 's' : ''}</Body>
              </div>
              <div>
                <BodySmall className="text-gray-500 font-medium mb-1">Route</BodySmall>
                <Body>
                  {routeCountries ? (
                    <ShippingRouteDisplay
                      originCountry={routeCountries.origin}
                      destinationCountry={routeCountries.destination}
                      website={quote.website || ''}
                    />
                  ) : (
                    'Loading...'
                  )}
                </Body>
              </div>
            </div>
            {quote.notes && (
              <div>
                <BodySmall className="text-gray-500 font-medium mb-1">Notes</BodySmall>
                <Body className="text-gray-700">{quote.notes}</Body>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPreviewOpen(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setIsPreviewOpen(false);
                navigate(`/admin/quotes/${quote.id}`);
              }}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              View Full Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};