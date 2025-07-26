import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tables } from '@/integrations/supabase/types';
import { useNavigate } from 'react-router-dom';
import { useAdminQuoteCurrency } from '@/hooks/useAdminQuoteCurrency';
import { formatDateCompact } from '@/lib/dateUtils';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import {
  Calendar,
  User,
  Package,
  DollarSign,
  MapPin,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Mail,
  Copy,
  Phone,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { getQuoteRouteCountries } from '@/lib/route-specific-customs';
import { customerDisplayUtils } from '@/utils/customerDisplayUtils';
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

export const CompactQuoteListItem = ({
  quote,
  isSelected,
  onSelect,
}: CompactQuoteListItemProps) => {
  const navigate = useNavigate();
  const { formatDualAmount } = useAdminQuoteCurrency(quote);
  const [routeCountries, setRouteCountries] = useState<{
    origin: string;
    destination: string;
  } | null>(null);
  const [customerProfile, setCustomerProfile] = useState<{
    full_name: string | null;
    phone: string | null;
  } | null>(null);

  const firstItem = quote.items?.[0];
  const totalItems = quote.items?.length || 0;
  const productName = firstItem?.name || 'Product name not specified';

  const formattedAmount = formatDualAmount(quote.final_total_usd || 0).short;

  // Get suggested categories for auto-classification
  const getSuggestedCategories = (items: any[]) => {
    const HSN_CATEGORIES = [
      {
        value: 'electronics',
        label: 'Electronics',
        keywords: [
          'phone',
          'mobile',
          'laptop',
          'computer',
          'headphone',
          'speaker',
          'camera',
          'tablet',
          'electronic',
        ],
      },
      {
        value: 'clothing',
        label: 'Clothing',
        keywords: [
          'shirt',
          't-shirt',
          'dress',
          'kurta',
          'jeans',
          'jacket',
          'clothing',
          'apparel',
          'fashion',
        ],
      },
      {
        value: 'books',
        label: 'Books',
        keywords: ['book', 'textbook', 'manual', 'guide', 'educational', 'learning'],
      },
      {
        value: 'toys',
        label: 'Toys',
        keywords: ['toy', 'game', 'puzzle', 'doll', 'action', 'figure', 'lego'],
      },
      {
        value: 'cosmetics',
        label: 'Cosmetics',
        keywords: ['makeup', 'cream', 'lotion', 'shampoo', 'soap', 'skincare'],
      },
    ];

    return items
      .map((item) => {
        const itemNameLower = (item.name || '').toLowerCase();

        // Find best matching category
        let bestMatch = null;
        let bestScore = 0;

        for (const category of HSN_CATEGORIES) {
          const matchCount = category.keywords.filter((keyword) =>
            itemNameLower.includes(keyword.toLowerCase()),
          ).length;

          if (matchCount > bestScore) {
            bestScore = matchCount;
            bestMatch = category;
          }
        }

        return {
          itemId: item.id,
          itemName: item.name,
          suggestedCategory: bestMatch ? bestMatch.value : null,
          suggestedLabel: bestMatch ? bestMatch.label : 'Unknown',
          confidence: bestScore > 0 ? 'high' : 'low',
        };
      })
      .filter((suggestion) => suggestion.suggestedCategory);
  };

  // HSN Classification Analysis with Auto-Classification for Legacy Quotes
  const hsnStatus = useMemo(() => {
    if (!quote.items || quote.items.length === 0) {
      return { status: 'none', message: 'No items', count: 0, total: 0, canAutoClassify: false };
    }

    const totalItems = quote.items.length;
    const classifiedItems = quote.items.filter(
      (item) => item.hsn_code && item.category && item.category !== 'uncategorized',
    ).length;

    // Check if items can be auto-classified (have names but no HSN data)
    const itemsWithNames = quote.items.filter(
      (item) => item.name && item.name.trim().length > 0,
    ).length;
    const canAutoClassify = classifiedItems === 0 && itemsWithNames > 0;

    if (classifiedItems === 0) {
      return {
        status: 'unclassified',
        message: canAutoClassify ? 'Can auto-classify' : 'No HSN classification',
        count: 0,
        total: totalItems,
        canAutoClassify,
        suggestedCategories: canAutoClassify ? getSuggestedCategories(quote.items) : [],
      };
    } else if (classifiedItems === totalItems) {
      return {
        status: 'complete',
        message: 'Fully classified',
        count: classifiedItems,
        total: totalItems,
        canAutoClassify: false,
      };
    } else {
      return {
        status: 'partial',
        message: `${classifiedItems}/${totalItems} classified`,
        count: classifiedItems,
        total: totalItems,
        canAutoClassify: false,
      };
    }
  }, [quote.items]);

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
          .from('profiles_with_phone')
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

  // Use unified customer display logic
  const customerDisplayData = customerDisplayUtils.getCustomerDisplayData(quote, customerProfile);
  const displayName = customerDisplayData.name;
  const customerEmail = customerDisplayData.email;

  // Helper function to get status color for circular indicator
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'sent':
        return 'bg-blue-500';
      case 'paid':
        return 'bg-teal-500';
      case 'ordered':
        return 'bg-orange-500';
      case 'shipped':
        return 'bg-teal-600';
      case 'completed':
        return 'bg-green-600';
      case 'cancelled':
      case 'rejected':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  // Calculate expiry info
  const expiryInfo = useMemo(() => {
    if (!quote.expires_at) return null;
    const expiryDate = new Date(quote.expires_at);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return { text: 'Expired', urgent: true };
    if (diffDays === 1) return { text: '1 day left', urgent: true };
    if (diffDays <= 3) return { text: `${diffDays} days left`, urgent: true };
    return { text: `${diffDays} days left`, urgent: false };
  }, [quote.expires_at]);

  return (
    <>
      <div
        className={cn(
          'bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-200',
          isSelected && 'ring-2 ring-teal-500 border-teal-500',
        )}
      >
        {/* ROW 1: Identity & Status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Selection Checkbox */}
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(quote.id, !!checked)}
              className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600 flex-shrink-0"
            />

            {/* Status Indicator Circle */}
            <div
              className={cn('w-3 h-3 rounded-full flex-shrink-0', getStatusColor(quote.status))}
            />

            {/* Quote ID */}
            <Body className="font-semibold text-gray-900 flex-shrink-0">
              {quote.display_id || `#QT-${quote.id.substring(0, 8).toUpperCase()}`}
            </Body>

            {/* Product Icon & Name */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Package className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <Body className="text-gray-700 truncate">
                {productName}
                {totalItems > 1 && (
                  <span className="text-gray-500 text-sm ml-1 hidden sm:inline">
                    (+{totalItems - 1} more)
                  </span>
                )}
              </Body>
            </div>

            {/* Status Badge - Better positioned */}
            <div className="hidden md:block">
              <StatusBadge status={quote.status} />
            </div>

            {/* HSN Classification Indicator */}
            <div className="hidden lg:flex items-center gap-1">
              {hsnStatus.status === 'complete' && (
                <div
                  className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium"
                  title={`${hsnStatus.message} - All items have HSN codes`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  <span>HSN Complete</span>
                </div>
              )}
              {hsnStatus.status === 'partial' && (
                <div
                  className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium"
                  title={`${hsnStatus.message} - Some items need HSN classification`}
                >
                  <AlertCircle className="h-3 w-3" />
                  <span>
                    {hsnStatus.count}/{hsnStatus.total}
                  </span>
                </div>
              )}
              {hsnStatus.status === 'unclassified' && (
                <div
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                    hsnStatus.canAutoClassify
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-red-50 text-red-700',
                  )}
                  title={
                    hsnStatus.canAutoClassify
                      ? `${hsnStatus.message} - Click to view auto-classification suggestions`
                      : `${hsnStatus.message} - Items need HSN classification for customs`
                  }
                >
                  <FileText className="h-3 w-3" />
                  <span>{hsnStatus.canAutoClassify ? 'Auto-classify' : 'No HSN'}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Time - Better positioned */}
            <div className="hidden lg:flex items-center gap-1 text-gray-500">
              <Clock className="h-4 w-4" />
              <BodySmall>{formatDateCompact(quote.created_at)}</BodySmall>
            </div>

            {/* Actions - Cleaner layout */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/admin/quotes/${quote.id}`)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 h-8 px-3"
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">View</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-50">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate(`/admin/quotes/${quote.id}`)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
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

        {/* ROW 2: Customer & Business Data */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm gap-3 sm:gap-0">
          {/* Left side - Customer and core business data */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            {/* Customer Info */}
            <div className="flex items-center gap-2 min-w-0">
              <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-gray-700 font-medium truncate">{displayName}</span>
                {customerDisplayData.isGuest && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
                    Guest
                  </span>
                )}
              </div>
              {customerEmail && (
                <>
                  <span className="text-gray-400 hidden sm:inline">•</span>
                  <span className="text-gray-600 truncate hidden sm:inline">{customerEmail}</span>
                </>
              )}
              {customerDisplayData.phone && (
                <>
                  <span className="text-gray-400 hidden md:inline">•</span>
                  <div className="flex items-center gap-1 hidden md:flex">
                    <Phone className="h-3 w-3 text-gray-500" />
                    <span className="text-gray-600">{customerDisplayData.phone}</span>
                  </div>
                </>
              )}
            </div>

            {/* Price */}
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-500" />
              <span className="text-gray-700 font-medium">{formattedAmount}</span>
            </div>

            {/* Route - Hidden on mobile */}
            <div className="flex items-center gap-2 hidden sm:flex">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">
                {routeCountries ? (
                  <ShippingRouteDisplay
                    originCountry={routeCountries.origin}
                    destinationCountry={routeCountries.destination}
                    website={quote.website || ''}
                  />
                ) : (
                  <span className="text-gray-400">Loading...</span>
                )}
              </span>
            </div>
          </div>

          {/* Right side info */}
          <div className="flex items-center gap-4">
            {/* Item count */}
            <div className="flex items-center gap-1">
              <Package className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">
                {totalItems} item{totalItems !== 1 ? 's' : ''}
              </span>
            </div>

            {/* HSN Status - Mobile friendly */}
            <div className="flex lg:hidden items-center gap-1">
              {hsnStatus.status === 'complete' && (
                <div
                  className="flex items-center gap-1 text-green-600"
                  title={`${hsnStatus.message} - All items have HSN codes`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">HSN ✓</span>
                </div>
              )}
              {hsnStatus.status === 'partial' && (
                <div
                  className="flex items-center gap-1 text-amber-600"
                  title={`${hsnStatus.message} - Some items need HSN classification`}
                >
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    {hsnStatus.count}/{hsnStatus.total}
                  </span>
                </div>
              )}
              {hsnStatus.status === 'unclassified' && (
                <div
                  className={cn(
                    'flex items-center gap-1',
                    hsnStatus.canAutoClassify ? 'text-amber-600' : 'text-red-600',
                  )}
                  title={
                    hsnStatus.canAutoClassify
                      ? `${hsnStatus.message} - Tap to auto-classify`
                      : `${hsnStatus.message} - Items need HSN classification for customs`
                  }
                >
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">
                    {hsnStatus.canAutoClassify ? 'Auto-classify' : 'No HSN'}
                  </span>
                </div>
              )}
            </div>

            {/* Expiry Info */}
            {expiryInfo && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span
                  className={cn(
                    'text-sm',
                    expiryInfo.urgent ? 'text-red-600 font-medium' : 'text-gray-600',
                  )}
                >
                  {expiryInfo.text}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
