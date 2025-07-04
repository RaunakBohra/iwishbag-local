import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tables } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";
import { MultiCurrencyDisplay } from "./MultiCurrencyDisplay";
import { useAdminCurrencyDisplay } from "@/hooks/useAdminCurrencyDisplay";
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { 
  ChevronDown, 
  ChevronRight, 
  Mail, 
  Copy, 
  Eye, 
  Calendar,
  User,
  Package,
  DollarSign,
  AlertTriangle,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Calculator,
  Truck
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { getQuoteRouteCountries } from '@/lib/route-specific-customs';
import { useCountryUtils, formatShippingRoute } from '@/lib/countryUtils';
import { extractShippingAddressFromNotes } from '@/lib/addressUpdates';
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

type QuoteWithItems = Tables<'quotes'> & { 
  quote_items: Tables<'quote_items'>[];
  profiles?: { preferred_display_currency?: string } | null;
};

interface AdminQuoteListItemProps {
  quote: QuoteWithItems;
  isSelected: boolean;
  onSelect: (quoteId: string, selected: boolean) => void;
}

const getPriorityBadge = (priority: QuoteWithItems['priority']) => {
  if (!priority) return null;
  
  const config = {
    low: { label: 'Low', variant: 'secondary' as const, className: 'bg-gray-100 text-gray-700' },
    medium: { label: 'Medium', variant: 'default' as const, className: 'bg-blue-100 text-blue-700' },
    high: { label: 'High', variant: 'destructive' as const, className: 'bg-red-100 text-red-700' },
  };
  
  const badgeConfig = config[priority] || config.medium;
  
  return (
    <Badge variant={badgeConfig.variant} className={cn("text-xs", badgeConfig.className)}>
      {badgeConfig.label}
    </Badge>
  );
};



export const AdminQuoteListItem = ({ quote, isSelected, onSelect }: AdminQuoteListItemProps) => {
    const navigate = useNavigate();
    const { formatMultiCurrency } = useAdminCurrencyDisplay();
    const [isExpanded, setIsExpanded] = useState(false);
    const [routeCountries, setRouteCountries] = useState<{ origin: string; destination: string } | null>(null);
    const [customerProfile, setCustomerProfile] = useState<{ full_name: string | null; phone: string | null } | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const { countries: allCountries } = useCountryUtils();
    
    const firstItem = quote.quote_items?.[0];
    const totalItems = quote.quote_items?.length || 0;
    
    const itemSummary = firstItem?.product_name 
        ? `${firstItem.product_name}${totalItems > 1 ? ` +${totalItems - 1} more` : ''}` 
        : quote.product_name || "No items specified";

    const currencyDisplays = formatMultiCurrency({ usdAmount: quote.final_total, quoteCurrency: quote.final_currency });

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return 'Today';
      if (diffDays === 2) return 'Yesterday';
      if (diffDays <= 7) return `${diffDays - 1} days ago`;
      return date.toLocaleDateString();
    };

    useEffect(() => {
      let isMounted = true;
      // Extract shipping address from quote
      let shippingAddress = null;
      if (quote.shipping_address) {
        shippingAddress = typeof quote.shipping_address === 'string'
          ? JSON.parse(quote.shipping_address)
          : quote.shipping_address;
      } else if (quote.internal_notes) {
        shippingAddress = extractShippingAddressFromNotes(quote.internal_notes);
      }
      async function fetchRouteCountries() {
        if (!allCountries) return;
        const fetchRouteById = async (routeId) => {
          const { data: route } = await supabase
            .from('shipping_routes')
            .select('origin_country, destination_country')
            .eq('id', routeId)
            .single();
          return route;
        };
        const result = await getQuoteRouteCountries(quote, shippingAddress, allCountries, fetchRouteById);
        if (isMounted) setRouteCountries(result);
      }
      fetchRouteCountries();
      return () => { isMounted = false; };
    }, [quote, allCountries]);

    useEffect(() => {
        let isMounted = true;
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
        fetchCustomerProfile();
        return () => { isMounted = false; };
    }, [quote.user_id]);

    const customerName = customerProfile?.full_name || quote.customer_name || quote.email || 'Customer';
    const customerPhone = customerProfile?.phone || quote.customer_phone;

    const { getCountryDisplayName } = useCountryUtils();

    return (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <Card
                onClick={(e) => {
                    // Prevent navigation if clicking on a button, link, or checkbox
                    const tag = (e.target as HTMLElement).tagName.toLowerCase();
                    if (
                        tag === 'button' ||
                        tag === 'input' ||
                        tag === 'svg' ||
                        (e.target as HTMLElement).closest('a')
                    ) {
                        return;
                    }
                    navigate(`/admin/quotes/${quote.id}`);
                }}
                className={cn(
                    "transition-all duration-200 hover:shadow-md border-l-4 cursor-pointer hover:bg-muted/30",
                    isSelected ? 'ring-2 ring-primary border-l-primary' : 'border-l-transparent',
                    quote.status === 'cancelled' ? 'border-l-red-500' : '',
                    quote.status === 'paid' ? 'border-l-green-500' : '',
                    quote.status === 'shipped' ? 'border-l-purple-500' : '',
                    quote.status === 'completed' ? 'border-l-gray-500' : ''
                )}
            >
                <CardContent className="p-0">
                    {/* Main Row - Always Visible */}
                    <div className="p-4">
                        <div className="flex items-center gap-3">
                            {/* Checkbox */}
                            <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => onSelect(quote.id, checked as boolean)}
                                onClick={(e) => e.stopPropagation()}
                                className="mt-0"
                            />
                            
                            {/* Status Badge */}
                            <div className="flex-shrink-0">
                                <StatusBadge status={quote.status} category="quote" showIcon={false} />
                            </div>

                            {/* Quote ID and Basic Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-sm text-foreground">
                                        {quote.display_id || `QT-${quote.id.substring(0, 8).toUpperCase()}`}
                                    </h3>
                                    {getPriorityBadge(quote.priority)}
                                </div>
                                {/* Combined Info Row: Date, Customer Name, Route, Website */}
                                <div className="flex items-center gap-4 text-xs text-muted-foreground w-full">
                                    {/* Date - Fixed width */}
                                    <span className="flex items-center gap-1 flex-shrink-0 w-20">
                                        <Calendar className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{formatDate(quote.created_at)}</span>
                                    </span>
                                    {/* Customer Name - Fixed width */}
                                    <span className="flex items-center gap-1 flex-shrink-0 w-32">
                                        <User className="h-3 w-3 flex-shrink-0" />
                                        <span className="font-medium text-foreground truncate">{customerName}</span>
                                    </span>
                                    {/* Route - Fixed width */}
                                    {routeCountries && (
                                        <span className="flex items-center gap-1 flex-shrink-0 w-28">
                                            <MapPin className="h-3 w-3 flex-shrink-0" />
                                            <span className="text-muted-foreground truncate">
                                                {formatShippingRoute(routeCountries.origin, routeCountries.destination, allCountries)}
                                            </span>
                                        </span>
                                    )}
                                    {/* Product Domain Link - Fixed width */}
                                    {firstItem?.product_url && (
                                        <span className="flex items-center gap-1 flex-shrink-0 w-24">
                                            <Package className="h-3 w-3 flex-shrink-0" />
                                            <a
                                                href={firstItem.product_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="underline hover:text-primary flex items-center gap-1 truncate"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                {/* Extract and display only the domain */}
                                                {(() => {
                                                    try {
                                                        const url = new URL(firstItem.product_url);
                                                        return url.hostname.replace(/^www\./, '');
                                                    } catch {
                                                        return firstItem.product_url;
                                                    }
                                                })()}
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-external-link h-3 w-3 ml-0.5"><path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                                            </a>
                                            {totalItems > 1 && (
                                                <span className="ml-1 text-xs text-muted-foreground">+{totalItems - 1}</span>
                                            )}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Amount */}
                            <div className="flex-shrink-0 text-right">
                                {quote.final_total ? (
                                    <div className="space-y-1">
                                        <div className="text-sm font-semibold">
                                            <MultiCurrencyDisplay 
                                                currencies={currencyDisplays}
                                                compact={true}
                                                orientation="vertical"
                                            />
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {totalItems} item{totalItems !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm text-muted-foreground">
                                        Not calculated
                                    </div>
                                )}
                            </div>

                            {/* Quick Actions */}
                            <div className="flex-shrink-0 flex gap-1">
                                <DialogTrigger asChild>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={e => { e.stopPropagation(); setIsPreviewOpen(true); }}
                                        className="h-9 w-9 rounded-full border border-muted hover:bg-primary/10 hover:border-primary focus-visible:ring-2 focus-visible:ring-primary transition"
                                        aria-label="Quick Preview"
                                    >
                                        <Eye className="h-5 w-5 text-primary" />
                                    </Button>
                                </DialogTrigger>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Quote Quick Preview</DialogTitle>
                    <DialogDescription>Summary of quote {quote.display_id || quote.id}</DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-base font-semibold">
                        {quote.display_id || quote.id}
                        <StatusBadge status={quote.status} category="quote" showIcon={false} />
                        <span>{getPriorityBadge(quote.priority)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4" />
                        {customerName}
                        <Mail className="h-4 w-4 ml-2" />
                        {quote.email}
                        {customerPhone && <><Phone className="h-4 w-4 ml-2" />{customerPhone}</>}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Package className="h-4 w-4" />
                        {firstItem?.product_url ? (
                            <>
                                <a href={firstItem.product_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">{firstItem.product_name || "LINK"}</a>
                                {quote.quote_items && quote.quote_items.length > 1 && (
                                    <span className="text-muted-foreground ml-1">+{quote.quote_items.length - 1} more</span>
                                )}
                            </>
                        ) : firstItem?.product_name ? (
                            <>
                                <span>{firstItem.product_name}</span>
                                {quote.quote_items && quote.quote_items.length > 1 && (
                                    <span className="text-muted-foreground ml-1">+{quote.quote_items.length - 1} more</span>
                                )}
                            </>
                        ) : 'No product'}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-bold">{currencyDisplays[0]?.amount} {currencyDisplays[0]?.currency}</span>
                        <span className="text-muted-foreground">({quote.quote_items?.length || 0} item{(quote.quote_items?.length || 0) !== 1 ? 's' : ''})</span>
                    </div>
                    {routeCountries && (
                        <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4" />
                            <span>{formatShippingRoute(routeCountries.origin, routeCountries.destination, allCountries)}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(quote.created_at)}</span>
                    </div>
                </div>
                <DialogFooter>
                    <Button 
                        onClick={() => navigate(`/admin/quotes/${quote.id}`)} 
                        variant="default"
                        className="rounded-md px-4 py-2 font-semibold text-white bg-primary hover:bg-primary/90 transition"
                    >
                        Go to Full Page
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
