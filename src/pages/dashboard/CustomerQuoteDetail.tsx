import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { smartCalculationEngine } from '@/services/SmartCalculationEngine';
import { optimizedCurrencyService } from '@/services/OptimizedCurrencyService';
import { customerDisplayUtils } from '@/utils/customerDisplayUtils';
import type { Tables } from '@/integrations/supabase/types';
import type { UnifiedQuote } from '@/types/unified-quote';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Loader2, 
  ShoppingCart,
  Download,
  Share2,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Package,
  AlertCircle,
  Info,
  Shield,
  Sparkles,
  Truck,
} from 'lucide-react';

// Customer Components
import { ModernQuoteLayout } from '@/components/customer/ModernQuoteLayout';
import { ModernItemsDisplay } from '@/components/customer/ModernItemsDisplay';
import { QuoteActivityTimeline } from '@/components/customer/QuoteActivityTimeline';
import { EnhancedSmartTaxBreakdown } from '@/components/admin/tax/EnhancedSmartTaxBreakdown';
import { DiscountDisplay } from '@/components/dashboard/DiscountDisplay';
import { MembershipDashboard } from '@/components/dashboard/MembershipDashboard';
import { MembershipService } from '@/services/MembershipService';
import { useCartStore } from '@/stores/cartStore';

type Quote = Tables<'quotes'>;

interface CustomerQuoteDetailProps {
  // Props can be added later if needed
}

const CustomerQuoteDetail: React.FC<CustomerQuoteDetailProps> = () => {
  console.log('🚀 CustomerQuoteDetail component rendering');
  
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Simple quote data fetching
  const {
    data: quoteData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['customer-quote', id],
    queryFn: async () => {
      if (!id) throw new Error('No quote ID provided');

      const { data: quote, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Basic access check
      if (quote.user_id !== user?.id) {
        throw new Error('Access denied to this quote');
      }

      return quote;
    },
    enabled: Boolean(id && user),
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading quote details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !quoteData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-sm text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Quote Not Found</h2>
          <p className="text-gray-600 mb-6">
            {error?.message || "The quote you're looking for doesn't exist."}
          </p>
          <Button onClick={() => navigate('/dashboard')} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Success state with quote data
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Quote Details</h1>
            <p className="text-gray-600 mt-1">Quote ID: {quoteData.id}</p>
          </div>
        </div>

        {/* Quote Information Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                <Badge variant={quoteData.status === 'approved' ? 'default' : 'secondary'}>
                  {quoteData.status}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Total Amount</label>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                ${quoteData.final_total_usd?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Created</label>
              <p className="mt-1 text-gray-900">
                {new Date(quoteData.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Route</label>
              <p className="mt-1 text-gray-900">
                {quoteData.origin_country} → {quoteData.destination_country}
              </p>
            </div>
          </div>
        </div>

        {/* Items */}
        {quoteData.items && Array.isArray(quoteData.items) && quoteData.items.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Items</h2>
            <div className="space-y-4">
              {quoteData.items.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {item.name || item.product_name || `Item ${index + 1}`}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Quantity: {item.quantity || 1} • Weight: {item.weight || 0} kg
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ${(item.costprice_origin || item.price || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {quoteData.status === 'approved' && (
          <div className="mt-6 flex gap-3">
            <Button className="bg-green-600 hover:bg-green-700">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="outline">
              <Share2 className="h-4 w-4 mr-2" />
              Share Quote
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerQuoteDetail;

console.log('📁 CustomerQuoteDetail module loaded successfully');