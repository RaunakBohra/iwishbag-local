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
  console.log('🚀🚀🚀 CustomerQuoteDetail component loaded and rendering! 🚀🚀🚀');
  
  // Test with very obvious styling to see if it's rendering
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      background: 'linear-gradient(45deg, #ff0000, #00ff00, #0000ff)',
      color: 'white',
      fontSize: '32px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center'
    }}>
      <div>
        <h1>🎯 CUSTOMER QUOTE DETAIL IS RENDERING! 🎯</h1>
        <p>URL: {window.location.pathname}</p>
        <p>Time: {new Date().toLocaleString()}</p>
        <p>This should overlay everything if rendering correctly!</p>
      </div>
    </div>
  );
};

export default CustomerQuoteDetail;

console.log('📁 CustomerQuoteDetail module loaded successfully');