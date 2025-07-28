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
  console.log('🚀 CustomerQuoteDetail component loaded');
  
  // Simple working version first
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Quote Details</h1>
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <p className="text-green-800 font-semibold">✅ CustomerQuoteDetail component is working!</p>
            <p className="text-green-700 mt-2">URL: {window.location.pathname}</p>
            <p className="text-green-700">Time: {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerQuoteDetail;

console.log('📁 CustomerQuoteDetail module loaded successfully');