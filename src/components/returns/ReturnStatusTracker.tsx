/**
 * Return Status Tracker Component
 * 
 * Allows customers to track the status of their return requests.
 * Supports both refund requests and package returns with RMA tracking.
 * 
 * Features:
 * - Search by quote ID, tracking ID, RMA number, or refund request ID
 * - Display comprehensive return/refund history
 * - Real-time status updates
 * - Timeline view of return progress
 * - Contact support integration
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  DollarSign,
  Search,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  MessageCircle,
  FileText,
  Truck,
  CreditCard,
  Eye,
  Calendar,
  User,
  Info,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/currencyConversion';

interface RefundRequest {
  id: string;
  quote_id: string;
  refund_type: string;
  requested_amount: number;
  approved_amount?: number;
  currency: string;
  status: string;
  reason_code: string;
  reason_description: string;
  customer_notes?: string;
  internal_notes?: string;
  refund_method?: string;
  requested_by: string;
  requested_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  processed_by?: string;
  processed_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  quote: {
    display_id: string;
    iwish_tracking_id?: string;
  };
}

interface PackageReturn {
  id: string;
  quote_id: string;
  rma_number: string;
  return_type: string;
  return_reason: string;
  customer_notes?: string;
  admin_notes?: string;
  status: string;
  return_all_items: boolean;
  selected_items?: any[];
  created_at: string;
  updated_at: string;
  approved_at?: string;
  completed_at?: string;
  quote: {
    display_id: string;
    iwish_tracking_id?: string;
  };
}

interface ReturnStatusTrackerProps {
  searchTerm?: string;
  onContactSupport?: (returnId: string, type: 'refund' | 'return') => void;
}

const REFUND_STATUS_CONFIG = {
  pending: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: AlertCircle },
};

const RETURN_STATUS_CONFIG = {
  pending: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  label_sent: { label: 'Return Label Sent', color: 'bg-blue-100 text-blue-800', icon: Truck },
  in_transit: { label: 'In Transit to Us', color: 'bg-purple-100 text-purple-800', icon: Package },
  received: { label: 'Received', color: 'bg-indigo-100 text-indigo-800', icon: CheckCircle },
  inspecting: { label: 'Under Inspection', color: 'bg-orange-100 text-orange-800', icon: Eye },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: AlertCircle },
};

export const ReturnStatusTracker: React.FC<ReturnStatusTrackerProps> = ({
  searchTerm: propSearchTerm,
  onContactSupport,
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState(propSearchTerm || '');
  const [activeSearch, setActiveSearch] = useState(propSearchTerm || '');

  // Helper function to enrich data with quote information if missing
  const enrichWithQuoteData = async (items: any[], type: 'refund' | 'return') => {
    const enrichedItems = await Promise.all(items.map(async (item) => {
      if (!item.quote || !item.quote.display_id) {
        // Fetch quote data separately
        const { data: quoteData } = await supabase
          .from('quotes')
          .select('display_id, iwish_tracking_id')
          .eq('id', item.quote_id)
          .single();
        
        return {
          ...item,
          quote: quoteData || { display_id: 'Unknown', iwish_tracking_id: null }
        };
      }
      return item;
    }));
    return enrichedItems;
  };

  // Fetch refund requests
  const { 
    data: refundRequests, 
    isLoading: refundLoading, 
    error: refundError,
    refetch: refetchRefunds 
  } = useQuery({
    queryKey: ['return-tracker-refunds', activeSearch, user?.id],
    queryFn: async (): Promise<RefundRequest[]> => {
      if (!user || !activeSearch.trim()) return [];

      let query = supabase
        .from('refund_requests')
        .select(`
          id, quote_id, refund_type, requested_amount, approved_amount, currency, status,
          reason_code, reason_description, customer_notes, internal_notes,
          refund_method, requested_by, requested_at, reviewed_by, reviewed_at,
          processed_by, processed_at, completed_at, created_at, updated_at,
          quote:quotes(display_id, iwish_tracking_id)
        `)
        .eq('requested_by', user.id)
        .order('created_at', { ascending: false });

      // Search by various identifiers
      if (activeSearch.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // UUID search - try direct ID match first
        const directMatch = await supabase
          .from('refund_requests')
          .select(`
            id, quote_id, refund_type, requested_amount, approved_amount, currency, status,
            reason_code, reason_description, customer_notes, internal_notes,
            refund_method, requested_by, requested_at, reviewed_by, reviewed_at,
            processed_by, processed_at, completed_at, created_at, updated_at,
            quote:quotes(display_id, iwish_tracking_id)
          `)
          .eq('id', activeSearch)
          .eq('requested_by', user.id)
          .order('created_at', { ascending: false });

        if (directMatch.data && directMatch.data.length > 0) {
          const enrichedData = await enrichWithQuoteData(directMatch.data, 'refund');
          return enrichedData;
        }

        // Try quote_id match
        const quoteMatch = await supabase
          .from('refund_requests')
          .select(`
            id, quote_id, refund_type, requested_amount, approved_amount, currency, status,
            reason_code, reason_description, customer_notes, internal_notes,
            refund_method, requested_by, requested_at, reviewed_by, reviewed_at,
            processed_by, processed_at, completed_at, created_at, updated_at,
            quote:quotes(display_id, iwish_tracking_id)
          `)
          .eq('quote_id', activeSearch)
          .eq('requested_by', user.id)
          .order('created_at', { ascending: false });

        const enrichedQuoteMatch = await enrichWithQuoteData(quoteMatch.data || [], 'refund');
        return enrichedQuoteMatch;
      } else {
        // Search by display_id, tracking_id, or other identifiers
        const { data: quoteIds } = await supabase
          .from('quotes')
          .select('id')
          .or(`display_id.eq.${activeSearch},iwish_tracking_id.eq.${activeSearch}`)
          .eq('user_id', user.id);

        if (quoteIds && quoteIds.length > 0) {
          query = query.in('quote_id', quoteIds.map(q => q.id));
        } else {
          // No matching quotes found
          return [];
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Enrich with quote data if needed
      const enrichedData = await enrichWithQuoteData(data || [], 'refund');
      return enrichedData;
    },
    enabled: !!user && !!activeSearch.trim(),
  });

  // Fetch package returns
  const { 
    data: packageReturns, 
    isLoading: returnLoading, 
    error: returnError,
    refetch: refetchReturns 
  } = useQuery({
    queryKey: ['return-tracker-returns', activeSearch, user?.id],
    queryFn: async (): Promise<PackageReturn[]> => {
      if (!user || !activeSearch.trim()) return [];

      let query = supabase
        .from('package_returns')
        .select(`
          id, quote_id, rma_number, return_type, return_reason,
          customer_notes, admin_notes, status, return_all_items, selected_items,
          created_at, updated_at, approved_at, completed_at,
          quote:quotes(display_id, iwish_tracking_id)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Search by RMA number, UUID, or quote identifiers
      if (activeSearch.startsWith('RMA-')) {
        query = query.eq('rma_number', activeSearch);
      } else if (activeSearch.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // UUID search - try direct ID match first
        const directMatch = await supabase
          .from('package_returns')
          .select(`
            id, quote_id, rma_number, return_type, return_reason,
            customer_notes, admin_notes, status, return_all_items, selected_items,
            created_at, updated_at, approved_at, completed_at,
            quote:quotes(display_id, iwish_tracking_id)
          `)
          .eq('id', activeSearch)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (directMatch.data && directMatch.data.length > 0) {
          const enrichedData = await enrichWithQuoteData(directMatch.data, 'return');
          return enrichedData;
        }

        // Try quote_id match
        const quoteMatch = await supabase
          .from('package_returns')
          .select(`
            id, quote_id, rma_number, return_type, return_reason,
            customer_notes, admin_notes, status, return_all_items, selected_items,
            created_at, updated_at, approved_at, completed_at,
            quote:quotes(display_id, iwish_tracking_id)
          `)
          .eq('quote_id', activeSearch)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        const enrichedQuoteMatch = await enrichWithQuoteData(quoteMatch.data || [], 'return');
        return enrichedQuoteMatch;
      } else {
        // Search by quote display_id or tracking_id
        const { data: quoteIds } = await supabase
          .from('quotes')
          .select('id')
          .or(`display_id.eq.${activeSearch},iwish_tracking_id.eq.${activeSearch}`)
          .eq('user_id', user.id);

        if (quoteIds && quoteIds.length > 0) {
          query = query.in('quote_id', quoteIds.map(q => q.id));
        } else {
          return [];
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Enrich with quote data if needed
      const enrichedData = await enrichWithQuoteData(data || [], 'return');
      return enrichedData;
    },
    enabled: !!user && !!activeSearch.trim(),
  });

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      toast({
        title: 'Search Term Required',
        description: 'Please enter a quote ID, tracking number, or RMA number.',
        variant: 'destructive',
      });
      return;
    }
    setActiveSearch(searchTerm.trim());
  };

  const handleRefresh = () => {
    refetchRefunds();
    refetchReturns();
    toast({
      title: 'Status Updated',
      description: 'Return status information has been refreshed.',
    });
  };

  const isLoading = refundLoading || returnLoading;
  const hasError = refundError || returnError;
  const hasResults = (refundRequests && refundRequests.length > 0) || (packageReturns && packageReturns.length > 0);

  const formatReturnTimeline = (returnItem: RefundRequest | PackageReturn, type: 'refund' | 'return') => {
    const events = [
      { 
        date: returnItem.created_at, 
        title: `${type === 'refund' ? 'Refund' : 'Return'} Request Created`,
        description: 'Your request has been submitted and is under review',
        icon: FileText,
        status: 'completed'
      }
    ];

    if (type === 'refund') {
      const refund = returnItem as RefundRequest;
      if (refund.status === 'approved' || refund.status === 'processing' || refund.status === 'completed') {
        events.push({
          date: refund.updated_at,
          title: 'Refund Approved',
          description: 'Your refund request has been approved for processing',
          icon: CheckCircle,
          status: 'completed'
        });
      }
      if (refund.status === 'processing' || refund.status === 'completed') {
        events.push({
          date: refund.updated_at,
          title: 'Processing Payment',
          description: 'Refund is being processed to your payment method',
          icon: CreditCard,
          status: refund.status === 'completed' ? 'completed' : 'current'
        });
      }
      if (refund.status === 'completed' && refund.processed_at) {
        events.push({
          date: refund.processed_at,
          title: 'Refund Completed',
          description: `${formatCurrency(refund.approved_amount || refund.requested_amount, refund.currency)} refunded to your ${refund.refund_method || 'payment method'}`,
          icon: CheckCircle,
          status: 'completed'
        });
      }
    } else {
      const packageReturn = returnItem as PackageReturn;
      if (packageReturn.approved_at) {
        events.push({
          date: packageReturn.approved_at,
          title: 'Return Approved',
          description: 'Your return request has been approved',
          icon: CheckCircle,
          status: 'completed'
        });
      }
      if (packageReturn.status === 'label_sent') {
        events.push({
          date: packageReturn.updated_at,
          title: 'Return Label Sent',
          description: 'Return shipping label sent to your email',
          icon: Truck,
          status: 'current'
        });
      }
      if (packageReturn.status === 'in_transit') {
        events.push({
          date: packageReturn.updated_at,
          title: 'Package in Transit',
          description: 'Your package is on its way back to us',
          icon: Package,
          status: 'current'
        });
      }
      if (packageReturn.status === 'received' || packageReturn.status === 'inspecting' || packageReturn.status === 'completed') {
        events.push({
          date: packageReturn.updated_at,
          title: 'Package Received',
          description: 'We have received your returned package',
          icon: CheckCircle,
          status: 'completed'
        });
      }
      if (packageReturn.status === 'inspecting' || packageReturn.status === 'completed') {
        events.push({
          date: packageReturn.updated_at,
          title: 'Under Inspection',
          description: 'We are inspecting the returned items',
          icon: Eye,
          status: packageReturn.status === 'completed' ? 'completed' : 'current'
        });
      }
      if (packageReturn.status === 'completed' && packageReturn.completed_at) {
        events.push({
          date: packageReturn.completed_at,
          title: 'Return Completed',
          description: 'Your return has been processed successfully',
          icon: CheckCircle,
          status: 'completed'
        });
      }
    }

    return events;
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Login Required</h3>
          <p className="text-gray-600 mb-6">
            You need to be logged in to track your returns.
          </p>
          <Button onClick={() => window.location.href = '/auth/login'}>
            Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Track Returns & Refunds</h2>
        <p className="text-muted-foreground">
          Check the status of your return requests and refunds
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Find Your Return
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="search-term">Enter Search Term</Label>
            <div className="flex gap-2">
              <Input
                id="search-term"
                placeholder="Quote ID (Q-12345), Tracking (IWB2024001), or RMA Number (RMA-2024-001234)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button 
                onClick={handleSearch}
                disabled={!searchTerm.trim() || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Search
              </Button>
              {hasResults && (
                <Button variant="outline" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              )}
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Search by:</strong></p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Quote ID (e.g., Q-12345)</li>
              <li>Tracking Number (e.g., IWB2024001)</li>
              <li>RMA Number (e.g., RMA-2024-001234)</li>
              <li>Return or Refund UUID</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && activeSearch && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Searching for your returns...
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {hasError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load return information. Please try again or contact support.
          </AlertDescription>
        </Alert>
      )}

      {/* No Results */}
      {!isLoading && activeSearch && !hasResults && !hasError && (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Returns Found</h3>
            <p className="text-gray-600 mb-6">
              No return requests found for "{activeSearch}". 
              {activeSearch.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) 
                ? 'When searching by UUID, try using the Quote ID or RMA number instead.' 
                : 'Please check your search term or try a different identifier.'}
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => setActiveSearch('')} variant="outline">
                Clear Search
              </Button>
              {onContactSupport && (
                <Button variant="outline" onClick={() => window.location.href = '/support'}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refund Requests Results */}
      {refundRequests && refundRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Refund Requests ({refundRequests.length})
          </h3>
          
          {refundRequests.map((refund) => {
            const statusConfig = REFUND_STATUS_CONFIG[refund.status as keyof typeof REFUND_STATUS_CONFIG];
            const StatusIcon = statusConfig?.icon || AlertCircle;
            const timeline = formatReturnTimeline(refund, 'refund');
            
            return (
              <Card key={refund.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      Refund Request
                    </CardTitle>
                    <Badge className={statusConfig?.color || 'bg-gray-100 text-gray-800'}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusConfig?.label || refund.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Quote ID</Label>
                      <p className="font-mono">{refund.quote.display_id}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(refund.approved_amount || refund.requested_amount, refund.currency)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Method</Label>
                      <p>{refund.refund_method?.replace(/_/g, ' ') || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                      <p>{new Date(refund.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Reason */}
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Reason</Label>
                    <p className="text-sm">{refund.reason_description}</p>
                    {refund.customer_notes && (
                      <>
                        <Label className="text-sm font-medium text-muted-foreground mt-2">Notes</Label>
                        <p className="text-sm">{refund.customer_notes}</p>
                      </>
                    )}
                  </div>

                  {/* Timeline */}
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground mb-3 block">Progress Timeline</Label>
                    <div className="space-y-3">
                      {timeline.map((event, index) => {
                        const EventIcon = event.icon;
                        return (
                          <div key={index} className="flex items-start space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              event.status === 'completed' ? 'bg-green-100 text-green-600' :
                              event.status === 'current' ? 'bg-blue-100 text-blue-600' :
                              'bg-gray-100 text-gray-400'
                            }`}>
                              <EventIcon className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{event.title}</p>
                              <p className="text-sm text-muted-foreground">{event.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(event.date).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Last updated: {new Date(refund.updated_at).toLocaleString()}
                    </div>
                    {onContactSupport && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onContactSupport(refund.id, 'refund')}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Contact Support
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Package Returns Results */}
      {packageReturns && packageReturns.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Package Returns ({packageReturns.length})
          </h3>
          
          {packageReturns.map((packageReturn) => {
            const statusConfig = RETURN_STATUS_CONFIG[packageReturn.status as keyof typeof RETURN_STATUS_CONFIG];
            const StatusIcon = statusConfig?.icon || AlertCircle;
            const timeline = formatReturnTimeline(packageReturn, 'return');
            
            return (
              <Card key={packageReturn.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-blue-600" />
                      Package Return
                    </CardTitle>
                    <Badge className={statusConfig?.color || 'bg-gray-100 text-gray-800'}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusConfig?.label || packageReturn.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">RMA Number</Label>
                      <p className="font-mono font-semibold">{packageReturn.rma_number}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Quote ID</Label>
                      <p className="font-mono">{packageReturn.quote.display_id}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Return Type</Label>
                      <p>{packageReturn.return_type.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                      <p>{new Date(packageReturn.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Items to Return</Label>
                    <p className="text-sm">
                      {packageReturn.return_all_items 
                        ? 'All items in the order' 
                        : `${packageReturn.selected_items?.length || 0} selected items`
                      }
                    </p>
                  </div>

                  {/* Reason */}
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Reason</Label>
                    <p className="text-sm">{packageReturn.return_reason}</p>
                    {packageReturn.customer_notes && (
                      <>
                        <Label className="text-sm font-medium text-muted-foreground mt-2">Notes</Label>
                        <p className="text-sm">{packageReturn.customer_notes}</p>
                      </>
                    )}
                  </div>

                  {/* Timeline */}
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground mb-3 block">Progress Timeline</Label>
                    <div className="space-y-3">
                      {timeline.map((event, index) => {
                        const EventIcon = event.icon;
                        return (
                          <div key={index} className="flex items-start space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              event.status === 'completed' ? 'bg-green-100 text-green-600' :
                              event.status === 'current' ? 'bg-blue-100 text-blue-600' :
                              'bg-gray-100 text-gray-400'
                            }`}>
                              <EventIcon className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{event.title}</p>
                              <p className="text-sm text-muted-foreground">{event.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(event.date).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Last updated: {new Date(packageReturn.updated_at).toLocaleString()}
                    </div>
                    {onContactSupport && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onContactSupport(packageReturn.id, 'return')}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Contact Support
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Help Section */}
      {hasResults && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Need Help?</strong> If you have questions about your return status or need to make changes, please contact our support team with your return ID or RMA number.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ReturnStatusTracker;