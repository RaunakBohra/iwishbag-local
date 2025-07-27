import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PurchaseItemDialog } from '@/components/admin/PurchaseItemDialog';
import { HSNCreationModal } from '@/components/admin/HSNCreationModal';
import { UploadedFilesDisplay } from '@/components/quote/UploadedFilesDisplay';
import { SmartHSNSearch } from '@/components/admin/hsn-components/SmartHSNSearch';
import { SleekProductTable } from '@/components/admin/SleekProductTable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { smartCalculationEngine } from '@/services/SmartCalculationEngine';
import { currencyService } from '@/services/CurrencyService';
import { smartWeightEstimator } from '@/services/SmartWeightEstimator';
import { hsnWeightService, type HSNWeightData } from '@/services/HSNWeightService';
import { unifiedDataEngine, type HSNMasterRecord } from '@/services/UnifiedDataEngine';
import { smartQuoteCacheService } from '@/services/SmartQuoteCacheService';
import { supabase } from '@/integrations/supabase/client';
import { 
  Package,
  User,
  Calendar,
  Clock,
  DollarSign,
  Truck,
  MessageSquare,
  FileText,
  Settings,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Edit2,
  Send,
  Check,
  X,
  AlertCircle,
  Info,
  TrendingUp,
  Globe,
  Hash,
  Link,
  Weight,
  MapPin,
  CreditCard,
  Building2,
  Mail,
  Phone,
  Copy,
  Download,
  Share2,
  Printer,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock3,
  Zap,
  Shield,
  Activity,
  Eye,
  Lock,
  Plus,
  Minus,
  ChevronUp,
  Trash2,
  Upload,
  Save,
  Lightbulb,
  TrendingDown,
  Target,
  Sparkles,
  Receipt,
  Banknote,
  ShoppingCart,
  Store,
  BarChart3,
  PiggyBank,
  AlertTriangle,
  ExternalLink,
  Search,
  MessageCircle,
  NotebookPen,
  Percent,
  IndianRupee,
  HandCoins,
  PackageCheck,
  ShieldCheck,
  CircleDollarSign,
  WalletCards,
  ClipboardCheck,
  FileCheck,
  LinkIcon,
  XOctagon,
  RefreshCcw,
  Loader2,
  Circle,
  Calculator,
  Plane,
  Scale
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuoteMessaging } from '@/components/messaging/QuoteMessaging';
import { ShareQuoteButtonV2 } from '@/components/admin/ShareQuoteButtonV2';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// Props interface for the component
interface UnifiedQuoteOrderSystemProps {
  quote?: any; // Quote data from parent component
  onUpdate?: (updates: any) => void; // Callback for updates
  isAdmin?: boolean; // Admin mode flag
}

// Mock quote data removed - component now requires proper quote data from parent

// HSN codes will be fetched from database

// Status configurations
const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-500', icon: FileText },
  pending: { label: 'Pending', color: 'bg-yellow-500', icon: Clock },
  sent: { label: 'Sent', color: 'bg-blue-500', icon: Send },
  approved: { label: 'Approved', color: 'bg-green-500', icon: CheckCircle },
  paid: { label: 'Paid', color: 'bg-emerald-500', icon: CreditCard },
  ordered: { label: 'Ordered', color: 'bg-purple-500', icon: ShoppingCart },
  shipped: { label: 'Shipped', color: 'bg-indigo-500', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-600', icon: PackageCheck }
};

// Helper to determine if in order mode
const isOrderMode = (status: string) => ['paid', 'ordered', 'shipped', 'delivered'].includes(status);

export default function UnifiedQuoteOrderSystem({ 
  quote: propQuote, 
  onUpdate, 
  isAdmin = false 
}: UnifiedQuoteOrderSystemProps = {}) {
  // Utility function to safely convert to number and prevent NaN
  const safeNumber = (value: any, fallback: number = 0): number => {
    if (value === null || value === undefined || value === '') return fallback;
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  };

  // Safe toFixed function to prevent "Cannot read properties of undefined (reading 'toFixed')" errors
  const safeToFixed = (value: any, decimals: number = 2): string => {
    const num = safeNumber(value, 0);
    return num.toFixed(decimals);
  };

  // Helper to calculate tax percentage from amount and base
  const calculateTaxPercentage = (taxAmount: number, baseAmount: number): number => {
    if (!baseAmount || baseAmount === 0) return 0;
    return (taxAmount / baseAmount) * 100;
  };

  // Helper to format tax percentage display
  const formatTaxPercentage = (rate: number): string => {
    if (rate === 0) return '0.0';
    // Smart percentage detection: if rate > 1, assume it's already in percentage format
    if (rate > 1) return rate.toFixed(1);
    // If rate <= 1, assume it's decimal and convert to percentage
    return (rate * 100).toFixed(1);
  };

  // Helper to create proper QuoteItem structure for calculator
  const createQuoteItem = (item: any, index: number) => {
    const weight = safeNumber(item.weight);
    const price = safeNumber(item.price);
    const quantity = safeNumber(item.quantity, 1);
    
    return {
      id: item.id || `item-${Date.now()}-${index}`,
      name: item.product_name || '',
      url: item.product_url || '',
      image: item.image_url || '',
      customer_notes: item.customer_notes || '',
      quantity,
      costprice_origin: price,
      weight,
      hsn_code: item.hsn_code || '',
      category: item.category || '',
      tax_method: item.tax_method || 'hsn',
      valuation_method: item.valuation_method || 'actual_price',
      minimum_valuation_usd: safeNumber(item.minimum_valuation_usd),
      actual_price: safeNumber(item.actual_price || item.price),
      smart_data: {
        weight_confidence: weight > 0 ? 0.8 : 0.3,
        price_confidence: price > 0 ? 0.9 : 0.5,
        category_detected: item.category || 'General',
        customs_suggestions: [
          ...(item.hsn_code ? [`HSN ${item.hsn_code} classification`] : ['Manual classification needed']),
          ...(item.valuation_method === 'minimum_valuation' ? ['Using HSN minimum valuation'] : []),
          ...(item.valuation_method === 'higher_of_both' ? ['Using higher of product/HSN minimum'] : [])
        ],
        optimization_hints: [
          ...(weight < 0.1 ? ['Consider weight verification'] : []),
          ...(price < 1 ? ['Price seems unusually low'] : []),
          ...(item.hsn_code ? [] : ['HSN code missing - may affect tax calculation']),
          ...(item.valuation_method === 'actual_price' && safeNumber(item.minimum_valuation_usd) > price 
            ? ['HSN minimum valuation exceeds product price'] : []),
          ...(quantity > 10 ? ['Bulk quantity - consider wholesale pricing'] : []),
          ...(item.category === 'Electronics' && !item.hsn_code ? ['Electronics require HSN classification'] : [])
        ],
        weight_source: weight > 0 ? 'manual' : 'estimated',
        weight_suggestions: {
          hsn_weight: weight,
          hsn_min: Math.max(0.1, weight * 0.8), // Minimum 0.1kg
          hsn_max: weight * 1.2,
          hsn_packaging: Math.max(0.05, weight * 0.1), // Minimum 50g packaging
          ml_weight: weight,
          hsn_confidence: item.hsn_code ? 0.8 : 0.3,
          ml_confidence: 0.6,
          // Enhanced with category-based suggestions
          category_weight_range: {
            'Electronics': { min: 0.1, max: 5.0, typical: 0.5 },
            'Clothing': { min: 0.1, max: 2.0, typical: 0.3 },
            'Books': { min: 0.2, max: 1.5, typical: 0.4 },
            'General': { min: 0.1, max: 10.0, typical: 1.0 }
          }[item.category] || { min: 0.1, max: 10.0, typical: 1.0 }
        }
      }
    };
  };

  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValues, setTempValues] = useState<Record<string, any>>({});
  const [purchaseDialogItem, setPurchaseDialogItem] = useState<any>(null);
  
  // Use provided quote data only - no mock data fallback
  const quote = propQuote;
  
  // Fix currency symbol based on origin country
  if (quote && !quote.currency_symbol) {
    const originCurrency = currencyService.getCurrencyForCountrySync(quote.origin_country);
    quote.currency_symbol = currencyService.getCurrencySymbol(originCurrency);
  }
  
  // Debug logging (reduced to prevent excessive logs)
  useEffect(() => {
    console.log('UnifiedQuoteOrderSystem received quote:', quote?.id);
    console.log('Quote items count:', quote?.items?.length);
    console.log('Customer insurance preference:', quote?.customer_data?.preferences?.insurance_opted_in);
    console.log('Currency symbol:', quote?.currency_symbol, 'for origin:', quote?.origin_country);
    if (quote?.items?.[0]) {
      console.log('🔍 [Initial] First item detailed:', JSON.stringify(quote.items[0], null, 2));
    }
  }, [quote?.id, quote?.items?.length]); // Only log when quote ID or items count changes
  
  // Trigger initial calculation on component mount to handle insurance auto-population
  useEffect(() => {
    if (quote?.id && items.length > 0 && !isRecalculating) {
      console.log('[UnifiedQuoteOrderSystem] Triggering initial calculation for insurance auto-population');
      recalculateQuote(items);
    }
  }, []); // Run only once on mount
  
  // Early return if no quote data
  if (!quote) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quote data...</p>
        </div>
      </div>
    );
  }
  
  const [items, setItems] = useState(quote?.items || []);
  const [notesPopoverOpen, setNotesPopoverOpen] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [showHSNCreateModal, setShowHSNCreateModal] = useState(false);
  const [newHSNData, setNewHSNData] = useState<any>(null);
  const [showCategoryCreateModal, setShowCategoryCreateModal] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState<any>(null);
  const [categories, setCategories] = useState<Array<{value: string, label: string}>>([
    { value: 'electronics', label: 'Electronics' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'beauty', label: 'Beauty & Personal Care' },
    { value: 'home', label: 'Home & Kitchen' },
    { value: 'sports', label: 'Sports & Outdoors' },
    { value: 'books', label: 'Books & Media' },
    { value: 'toys', label: 'Toys & Games' },
    { value: 'other', label: 'Other' }
  ]);
  const [adminNotes, setAdminNotes] = useState(quote.admin_notes || '');
  const [internalNotes, setInternalNotes] = useState(quote.internal_notes || '');
  const [insuranceAmount, setInsuranceAmount] = useState(safeNumber(quote.insurance));
  const [handlingAmount, setHandlingAmount] = useState(safeNumber(quote.handling));
  const [salesTaxAmount, setSalesTaxAmount] = useState(safeNumber(quote.calculation_data?.sales_tax_price || 0));
  
  // Track calculated values from SmartCalculationEngine
  const [calculatedHandling, setCalculatedHandling] = useState(0);
  const [calculatedInsurance, setCalculatedInsurance] = useState(0);
  const [forcePerItemBreakdown, setForcePerItemBreakdown] = useState(true);
  const [handlingMode, setHandlingMode] = useState<'auto' | 'manual'>('auto');
  const [costsDesignOption, setCostsDesignOption] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [showCalculatedValues, setShowCalculatedValues] = useState(false);
  const [domesticShipping, setDomesticShipping] = useState(safeNumber(quote.calculation_metadata?.domestic_shipping));
  const [internationalShipping, setInternationalShipping] = useState(safeNumber(quote.shipping));
  const [selectedShippingOptionId, setSelectedShippingOptionId] = useState<string | null>(
    quote.operational_data?.shipping?.selected_option || null
  );
  const [discountAmount, setDiscountAmount] = useState(safeNumber(quote.discount));
  const [debugData, setDebugData] = useState<any>(null);
  const [availableShippingOptions, setAvailableShippingOptions] = useState<any[]>([]);

  const StatusIcon = statusConfig[quote.status as keyof typeof statusConfig]?.icon || FileText;
  const statusColor = statusConfig[quote.status as keyof typeof statusConfig]?.color || 'bg-gray-500';
  
  // Extract tax calculations from quote data
  // First check if we have item-level breakdowns (new HSN system)
  const hasItemBreakdowns = quote?.calculation_data?.item_breakdowns?.length > 0;
  
  // Calculate totals from item-level taxes if available
  const itemLevelCustoms = safeNumber(
    hasItemBreakdowns 
      ? quote.calculation_data.item_breakdowns.reduce((sum, item) => sum + safeNumber(item.customs), 0)
      : 0
  );
  const itemLevelSalesTax = safeNumber(
    hasItemBreakdowns
      ? quote.calculation_data.item_breakdowns.reduce((sum, item) => sum + safeNumber(item.sales_tax), 0)
      : 0
  );
  const itemLevelDestinationTax = safeNumber(
    hasItemBreakdowns
      ? quote.calculation_data.item_breakdowns.reduce((sum, item) => sum + safeNumber(item.destination_tax), 0)
      : 0
  );
  
  // Extract tax rates and amounts with proper fallbacks
  const customsPercentage = safeNumber(
    quote?.calculation_data?.tax_calculation?.customs_percentage || 
    quote?.tax_rates?.customs ||
    quote?.operational_data?.customs?.percentage || 
    0
  );
  const extractedCustomsAmount = safeNumber(
    quote?.customs || // From transformed data
    itemLevelCustoms || // From item-level calculations
    quote?.calculation_data?.breakdown?.customs || 0
  );
                       
  const extractedSalesTaxAmount = safeNumber(
    quote?.sales_tax || // From transformed data
    itemLevelSalesTax || // From item-level calculations
    quote?.calculation_data?.breakdown?.sales_tax || 0
  );
                        
  const destinationTaxRate = safeNumber(
    quote?.calculation_data?.tax_calculation?.destination_tax_rate || 
    quote?.tax_rates?.destination_tax ||
    quote?.calculation_data?.breakdown?.destination_tax_rate || 
    13 // Default 13% VAT for Nepal
  );
  const extractedDestinationTaxAmount = safeNumber(
    quote?.destination_tax || // From transformed data
    itemLevelDestinationTax || // From item-level calculations
    quote?.calculation_data?.breakdown?.destination_tax || 0
  );
  
  // Safe debug data accessor to prevent null pointer exceptions
  const safeDebugData = debugData || {};
  const safeShippingData = safeDebugData.shipping_data || {};
  const safeConfigStatus = safeDebugData.config_status || {};
  const safeCalculationBreakdown = safeDebugData.calculation_breakdown || {};
  const safeDetailedCalculations = safeDebugData.detailed_calculations || {};
  const safeHsnData = safeDebugData.hsn_data || {};

  // Debug logging
  console.log('💰 Tax Extraction Debug:', {
    has_item_breakdowns: hasItemBreakdowns,
    item_count: quote?.calculation_data?.item_breakdowns?.length || 0,
    item_level_totals: {
      customs: itemLevelCustoms,
      sales_tax: itemLevelSalesTax,
      destination_tax: itemLevelDestinationTax
    },
    final_amounts: {
      customs: extractedCustomsAmount,
      sales_tax: extractedSalesTaxAmount,
      destination_tax: extractedDestinationTaxAmount
    },
    rates: {
      customs_percentage: customsPercentage,
      destination_tax_rate: destinationTaxRate
    }
  });
  
  // Calculate gateway fee
  const subtotalForGateway = items.reduce((sum, item) => sum + (safeNumber(item.price) * safeNumber(item.quantity, 1)), 0) +
                            safeNumber(internationalShipping) +
                            safeNumber(domesticShipping) +
                            safeNumber(handlingAmount) +
                            safeNumber(insuranceAmount) +
                            safeNumber(salesTaxAmount) +
                            extractedCustomsAmount +
                            extractedDestinationTaxAmount;
  const gatewayFee = (subtotalForGateway * 0.029) + 0.30;

  // Check if we're in order mode
  const orderMode = isOrderMode(quote.status);

  // Calculate days until expiry
  const daysUntilExpiry = quote.expires_at ? Math.ceil(
    (new Date(quote.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  ) : null;



  // Recalculate quote when items change
  const recalculateQuote = async (updatedItems: any[], skipSave = false) => {
    console.log('🔍 [UNIFIED] recalculateQuote called with items:', updatedItems, 'skipSave:', skipSave);
    try {
      setIsRecalculating(true);
      
      // Create detailed item mapping with analysis
      const mappedItems = updatedItems.map((item, index) => createQuoteItem(item, index));
      
      // Analyze valuation method preferences
      const methods = items.map(item => item.valuation_method || 'actual_price');
      const uniqueMethods = [...new Set(methods)];
      const valuationPreference = (() => {
        if (uniqueMethods.length > 1) return 'per_item_choice';
        const singleMethod = uniqueMethods[0];
        if (singleMethod === 'minimum_valuation') return 'minimum_valuation';
        if (singleMethod === 'higher_of_both') return 'higher_of_both';
        return 'product_value';
      })();

      // Create the full input structure
      const calculationInput = {
        quote: {
          id: quote.id,
          items: mappedItems,
          destination_country: quote.destination_country || 'IN',
          origin_country: quote.origin_country,
          status: quote.status,
          calculation_data: quote.calculation_metadata || {},
          operational_data: {},
          customer_data: quote.customer_data || {}
        },
        preferences: {
          speed_priority: 'medium',
          cost_priority: 'medium',
          show_all_options: true
        },
        tax_calculation_preferences: {
          calculation_method_preference: quote.tax_method || 'hsn_only',
          valuation_method_preference: valuationPreference,
          admin_id: isAdmin ? 'admin-user' : undefined,
          force_per_item_calculation: forcePerItemBreakdown
        }
      };

      // 🔍 COMPREHENSIVE CALCULATOR INPUT DEBUG LOG
      console.group('🧮 SMART CALCULATION ENGINE - INPUT ANALYSIS');
      
      console.log('📋 QUOTE OVERVIEW:', {
        quote_id: calculationInput.quote.id,
        item_count: calculationInput.quote.items.length,
        route: `${calculationInput.quote.origin_country} → ${calculationInput.quote.destination_country}`,
        status: calculationInput.quote.status,
        tax_method: calculationInput.tax_calculation_preferences.calculation_method_preference,
        valuation_method: calculationInput.tax_calculation_preferences.valuation_method_preference
      });

      console.log('📦 ITEMS DETAILED ANALYSIS:');
      calculationInput.quote.items.forEach((item, index) => {
        console.log(`   Item ${index + 1}:`, {
          id: item.id,
          name: item.name,
          price: `$${item.costprice_origin}`,
          quantity: item.quantity,
          weight: `${item.weight}kg`,
          hsn_code: item.hsn_code || 'Not classified',
          category: item.category,
          valuation_method: item.valuation_method,
          minimum_valuation_usd: `$${item.minimum_valuation_usd}`,
          actual_price: `$${item.actual_price}`,
          smart_data_confidence: {
            weight_confidence: item.smart_data.weight_confidence,
            price_confidence: item.smart_data.price_confidence,
            weight_source: item.smart_data.weight_source
          },
          optimization_hints: item.smart_data.optimization_hints,
          customs_suggestions: item.smart_data.customs_suggestions
        });
      });

      console.log('🎯 TAX CALCULATION STRATEGY:', {
        calculation_method: calculationInput.tax_calculation_preferences.calculation_method_preference,
        valuation_method: calculationInput.tax_calculation_preferences.valuation_method_preference,
        per_item_methods: methods,
        unique_methods: uniqueMethods,
        admin_context: calculationInput.tax_calculation_preferences.admin_id
      });

      console.log('🚢 SHIPPING & ROUTE ANALYSIS:', {
        origin_country: calculationInput.quote.origin_country,
        destination_country: calculationInput.quote.destination_country,
        shipping_preferences: calculationInput.preferences,
        show_all_options: calculationInput.preferences.show_all_options
      });

      console.log('📊 FINANCIAL INPUTS SUMMARY:', {
        total_items_value: mappedItems.reduce((sum, item) => sum + (item.costprice_origin * item.quantity), 0),
        total_weight: mappedItems.reduce((sum, item) => sum + (item.weight * item.quantity), 0),
        items_with_hsn: mappedItems.filter(item => item.hsn_code).length,
        items_with_minimum_valuation: mappedItems.filter(item => item.minimum_valuation_usd > 0).length,
        highest_value_item: Math.max(...mappedItems.map(item => item.costprice_origin)),
        categories: [...new Set(mappedItems.map(item => item.category))],
        weight_sources: [...new Set(mappedItems.map(item => item.smart_data.weight_source))]
      });

      console.groupEnd();

      // Execute calculation with comprehensive logging
      console.log('🚀 Executing SmartCalculationEngine.calculateWithShippingOptions...');
      const calculationResult = await smartCalculationEngine.calculateWithShippingOptions(calculationInput);

      // 🔍 COMPREHENSIVE CALCULATOR OUTPUT ANALYSIS
      console.group('📊 SMART CALCULATION ENGINE - OUTPUT ANALYSIS');
      
      console.log('✅ CALCULATION SUCCESS:', {
        success: calculationResult.success,
        has_updated_quote: !!calculationResult.updated_quote,
        has_shipping_options: !!calculationResult.shipping_options,
        has_hsn_breakdown: !!calculationResult.hsn_tax_breakdown,
        has_smart_recommendations: !!calculationResult.smart_recommendations,
        processing_time: 'Available in engine logs'
      });

      if (calculationResult.calculation_data || calculationResult.updated_quote) {
        const calcData = calculationResult.calculation_data || calculationResult.updated_quote?.calculation_data;
        console.log('💰 FINANCIAL BREAKDOWN:', {
          subtotal: calcData?.breakdown?.subtotal || calcData?.totals?.items_total,
          shipping: calcData?.breakdown?.shipping || calcData?.totals?.shipping_total,
          customs: calcData?.breakdown?.customs || calcData?.totals?.customs_total,
          sales_tax: calcData?.breakdown?.sales_tax || calcData?.totals?.sales_tax,
          destination_tax: calcData?.breakdown?.destination_tax || calcData?.totals?.destination_tax,
          handling: calcData?.breakdown?.handling || calcData?.totals?.handling,
          insurance: calcData?.breakdown?.insurance || calcData?.totals?.insurance,
          final_total: calcData?.totals?.final_total
        });

        console.log('📊 TAX RATES APPLIED:', {
          customs_rate: calcData?.tax_calculation?.customs_rate || calcData?.totals?.customs_rate,
          sales_tax_rate: calcData?.tax_calculation?.sales_tax_rate || calcData?.totals?.sales_tax_rate,
          destination_tax_rate: calcData?.tax_calculation?.destination_tax_rate || calcData?.totals?.destination_tax_rate,
          calculation_method: calcData?.tax_calculation?.method
        });
      }

      if (calculationResult.hsn_tax_breakdown) {
        console.log('🏷️ HSN TAX BREAKDOWN:', {
          total_items_processed: calculationResult.hsn_tax_breakdown.length,
          items_with_customs: calculationResult.hsn_tax_breakdown.filter(item => item.total_customs > 0).length,
          total_customs_calculated: calculationResult.hsn_tax_breakdown.reduce((sum, item) => sum + item.total_customs, 0),
          total_destination_tax: calculationResult.hsn_tax_breakdown.reduce((sum, item) => sum + item.total_local_taxes, 0),
          items_detail: calculationResult.hsn_tax_breakdown.map(item => ({
            name: item.item_name,
            hsn: item.hsn_code,
            customs: item.total_customs,
            local_taxes: item.total_local_taxes,
            total: item.total_taxes
          }))
        });
      }

      if (calculationResult.hsn_calculation_summary) {
        console.log('📈 HSN CALCULATION SUMMARY:', calculationResult.hsn_calculation_summary);
      }

      if (calculationResult.shipping_options) {
        console.log('🚢 SHIPPING OPTIONS GENERATED:', {
          options_count: calculationResult.shipping_options.length,
          carriers: [...new Set(calculationResult.shipping_options.map(opt => opt.carrier))],
          price_range: {
            min: Math.min(...calculationResult.shipping_options.map(opt => opt.cost)),
            max: Math.max(...calculationResult.shipping_options.map(opt => opt.cost))
          },
          delivery_range: {
            fastest: Math.min(...calculationResult.shipping_options.map(opt => opt.estimated_days)),
            slowest: Math.max(...calculationResult.shipping_options.map(opt => opt.estimated_days))
          }
        });
      }

      if (calculationResult.smart_recommendations) {
        console.log('🧠 SMART RECOMMENDATIONS:', {
          recommendations_count: calculationResult.smart_recommendations.length,
          recommendation_types: [...new Set(calculationResult.smart_recommendations.map(rec => rec.type))],
          recommendations: calculationResult.smart_recommendations
        });
      }

      if (calculationResult.optimization_suggestions) {
        console.log('⚡ OPTIMIZATION SUGGESTIONS:', {
          suggestions_count: calculationResult.optimization_suggestions.length,
          suggestions: calculationResult.optimization_suggestions
        });
      }

      console.groupEnd();

      // 🔧 CAPTURE DEBUG DATA for in-page display (reduced logging)
      if (!calculationResult || !calculationResult.shipping_options) {
        console.warn('🚨 [DEBUG] Missing calculation data:', { calculationResult: !!calculationResult, shipping_options: calculationResult?.shipping_options?.length });
      }
      
      const selectedShippingOption = calculationResult.shipping_options?.find(opt => 
        opt.id === calculationResult.updated_quote?.operational_data?.shipping?.selected_option
      );
      
      // 🔍 DEBUG: Log quote items structure before calculation
      console.log('🔍 [Debug] Quote items structure:', {
        quoteId: quote.id,
        items: quote.items,
        itemsType: typeof quote.items,
        itemsIsArray: Array.isArray(quote.items),
        itemsLength: quote.items?.length,
        firstItem: quote.items?.[0],
        firstItemKeys: quote.items?.[0] ? Object.keys(quote.items[0]) : 'No first item',
        firstItemFullData: quote.items?.[0] ? JSON.stringify(quote.items[0], null, 2) : 'No first item'
      });
      
      // Use items.price for accurate calculation in origin currency (field name corrected)
      const itemsValue = quote.items?.reduce((sum, item) => {
        const itemTotal = (item.price || 0) * (item.quantity || 1);
        // Only log if there are issues with the calculation
        if (isNaN(itemTotal) || !item.price) {
          console.warn('🔍 [Debug] Item calculation issue:', {
            name: item.product_name || item.name,
            price: item.price || item.costprice_origin,
            quantity: item.quantity,
            itemTotal,
            isNaN: isNaN(itemTotal)
          });
        }
        return sum + itemTotal;
      }, 0) || 0;
      
      const totalWeight = quote.items?.reduce((sum, item) => sum + ((item.weight || 0) * (item.quantity || 1)), 0) || 0;
      
      const calculationDebugData = {
        route: `${quote.origin_country} → ${quote.destination_country}`,
        currency_used: currencyService.getCurrencyForCountrySync(quote.origin_country),
        calculation_timestamp: new Date().toLocaleString(),
        // Core calculation breakdown
        calculation_breakdown: {
          items_total: calculationResult.updated_quote?.calculation_data?.breakdown?.items_total || 0,
          shipping: calculationResult.updated_quote?.calculation_data?.breakdown?.shipping || 0,
          handling: calculationResult.updated_quote?.calculation_data?.breakdown?.handling || 0,
          insurance: calculationResult.updated_quote?.calculation_data?.breakdown?.insurance || 0,
          customs: calculationResult.updated_quote?.calculation_data?.breakdown?.customs || 0,
          taxes: calculationResult.updated_quote?.calculation_data?.breakdown?.taxes || 0,
          final_total: calculationResult.updated_quote?.final_total_usd || 0,
        },
        // Detailed calculation formulas
        detailed_calculations: {
          shipping: selectedShippingOption ? {
            formula: `Total shipping cost (calculated by SmartCalculationEngine)`,
            carrier: selectedShippingOption.carrier,
            name: selectedShippingOption.name,
            weight: totalWeight,
            total_cost_usd: selectedShippingOption.cost_usd,
            days: selectedShippingOption.days,
            explanation: `Shipping cost calculated by SmartCalculationEngine based on route configuration and weight`,
            // Add breakdown data if available
            breakdown: selectedShippingOption.route_data ? {
              base_cost: selectedShippingOption.route_data.base_shipping_cost || 0,
              weight_tier: selectedShippingOption.route_data.weight_tier_used || 'N/A',
              weight_rate: selectedShippingOption.route_data.weight_rate_per_kg || 0,
              weight_cost: selectedShippingOption.route_data.weight_cost || 0,
              delivery_premium: selectedShippingOption.route_data.delivery_premium || 0,
            } : undefined
          } : { formula: 'No shipping option selected', total: 0 },
          
          handling: selectedShippingOption?.handling_charge ? {
            formula: `Base ${selectedShippingOption.handling_charge.base_fee} + (${itemsValue} × ${selectedShippingOption.handling_charge.percentage_of_value}%)`,
            base_fee: selectedShippingOption.handling_charge.base_fee,
            items_value: itemsValue,
            percentage: selectedShippingOption.handling_charge.percentage_of_value,
            percentage_amount: (itemsValue * selectedShippingOption.handling_charge.percentage_of_value) / 100,
            before_constraints: selectedShippingOption.handling_charge.base_fee + ((itemsValue * selectedShippingOption.handling_charge.percentage_of_value) / 100),
            min_fee: selectedShippingOption.handling_charge.min_fee,
            max_fee: selectedShippingOption.handling_charge.max_fee,
            total: Math.max(
              selectedShippingOption.handling_charge.min_fee,
              Math.min(
                selectedShippingOption.handling_charge.base_fee + ((itemsValue * selectedShippingOption.handling_charge.percentage_of_value) / 100),
                selectedShippingOption.handling_charge.max_fee
              )
            ),
            // 🔍 DEBUG: Raw values used in calculation
            debug_info: {
              quote_costprice_total_usd: quote.costprice_total_usd,
              quote_items_length: quote.items?.length || 0,
              calculated_items_value: itemsValue,
              items_breakdown: quote.items?.map(item => ({
                name: item.product_name || item.name || 'UNDEFINED NAME',
                price: item.price || item.costprice_origin || 'UNDEFINED PRICE',
                quantity: item.quantity || 'UNDEFINED QTY',
                line_total: (item.price || item.costprice_origin || 0) * (item.quantity || 1)
              })) || [],
              is_items_value_nan: isNaN(itemsValue),
              math_check: {
                base_fee_valid: !isNaN(selectedShippingOption.handling_charge.base_fee),
                percentage_valid: !isNaN(selectedShippingOption.handling_charge.percentage_of_value),
                multiplication_result: itemsValue * selectedShippingOption.handling_charge.percentage_of_value,
                percentage_calculation: (itemsValue * selectedShippingOption.handling_charge.percentage_of_value) / 100
              }
            },
            explanation: `Handling charge: base fee + percentage of items value, constrained by min/max limits`
          } : { formula: 'No handling config found', total: 0 },
          
          insurance: selectedShippingOption?.insurance_options?.available ? {
            formula: `${itemsValue} × ${selectedShippingOption.insurance_options.coverage_percentage}% (max ${selectedShippingOption.insurance_options.max_coverage})`,
            items_value: itemsValue,
            coverage_percentage: selectedShippingOption.insurance_options.coverage_percentage,
            percentage_amount: (itemsValue * selectedShippingOption.insurance_options.coverage_percentage) / 100,
            max_coverage: selectedShippingOption.insurance_options.max_coverage,
            min_fee: selectedShippingOption.insurance_options.min_fee || 0,
            total: selectedShippingOption.insurance_options.min_fee ? 
              Math.max(
                Math.min((itemsValue * selectedShippingOption.insurance_options.coverage_percentage) / 100, selectedShippingOption.insurance_options.max_coverage),
                selectedShippingOption.insurance_options.min_fee
              ) :
              Math.min((itemsValue * selectedShippingOption.insurance_options.coverage_percentage) / 100, selectedShippingOption.insurance_options.max_coverage),
            is_optional: !selectedShippingOption.insurance_options.default_enabled,
            customer_opted_in: quote.customer_data?.preferences?.insurance_opted_in || false,
            // 🔍 DEBUG: Raw values used in calculation
            debug_info: {
              quote_costprice_total_usd: quote.costprice_total_usd,
              calculated_items_value: itemsValue,
              is_items_value_nan: isNaN(itemsValue),
              coverage_percentage_valid: !isNaN(selectedShippingOption.insurance_options.coverage_percentage),
              math_check: {
                multiplication_result: itemsValue * selectedShippingOption.insurance_options.coverage_percentage,
                percentage_calculation: (itemsValue * selectedShippingOption.insurance_options.coverage_percentage) / 100
              }
            },
            explanation: `Insurance: percentage of items value up to maximum coverage limit`
          } : { formula: 'Insurance not available', total: 0 }
        },
        // Shipping options data
        shipping_data: calculationResult.shipping_options ? {
          options_count: calculationResult.shipping_options.length,
          selected_option: selectedShippingOption,
          all_options: calculationResult.shipping_options.map(opt => ({
            id: opt.id,
            carrier: opt.carrier,
            name: opt.name,
            cost: opt.cost_usd,
            days: opt.days,
            has_handling_config: !!opt.handling_charge,
            has_insurance_config: !!opt.insurance_options,
          })),
        } : null,
        // HSN tax data
        hsn_data: calculationResult.hsn_tax_breakdown ? {
          items_processed: calculationResult.hsn_tax_breakdown.length,
          total_customs: calculationResult.hsn_calculation_summary?.total_customs || 0,
          total_local_taxes: calculationResult.hsn_calculation_summary?.total_local_taxes || 0,
          calculation_method: calculationResult.updated_quote?.calculation_method_preference,
        } : null,
        // Configuration status
        config_status: {
          has_handling_config: calculationResult.shipping_options?.some(opt => !!opt.handling_charge) || false,
          has_insurance_config: calculationResult.shipping_options?.some(opt => !!opt.insurance_options) || false,
          delivery_options_count: calculationResult.shipping_options?.length || 0,
        }
      };

      setDebugData(calculationDebugData);
      
      // Store available shipping options
      console.log('🚢 [SHIPPING OPTIONS DEBUG]:', {
        has_shipping_options: !!calculationResult.shipping_options,
        shipping_options_count: calculationResult.shipping_options?.length || 0,
        first_option: calculationResult.shipping_options?.[0],
        origin: calculationInput.quote.origin_country,
        destination: calculationInput.quote.destination_country,
        route: `${calculationInput.quote.origin_country} → ${calculationInput.quote.destination_country}`,
        calculation_success: calculationResult.success
      });
      
      if (calculationResult.shipping_options && calculationResult.shipping_options.length > 0) {
        setAvailableShippingOptions(calculationResult.shipping_options);
        
        // If no shipping option is selected, select the first one
        if (!selectedShippingOptionId) {
          const firstOption = calculationResult.shipping_options[0];
          setSelectedShippingOptionId(firstOption.id);
          setInternationalShipping(firstOption.cost_usd);
        } else {
          // Update shipping cost based on selected option
          const selectedOption = calculationResult.shipping_options.find(opt => opt.id === selectedShippingOptionId);
          if (selectedOption) {
            setInternationalShipping(selectedOption.cost_usd);
          }
        }
      }

      // Update calculated values for input fields
      const calculatedHandlingValue = calculationResult.updated_quote?.calculation_data?.breakdown?.handling || 0;
      let calculatedInsuranceValue = calculationResult.updated_quote?.calculation_data?.breakdown?.insurance || 0;
      
      console.log('[UnifiedQuoteOrderSystem] Initial insurance calculation:', {
        from_calculation_result: calculatedInsuranceValue,
        customer_preference: quote.customer_data?.preferences?.insurance_opted_in,
        breakdown: calculationResult.updated_quote?.calculation_data?.breakdown
      });
      
      // 🔧 FALLBACK: If SmartCalculationEngine returns 0 for insurance, use CalculationDefaultsService
      const calculationShippingOptions = calculationResult.shipping_options || [];
      if (calculatedInsuranceValue === 0 && calculationShippingOptions.length > 0) {
        console.log('[UnifiedQuoteOrderSystem] Insurance fallback: Using CalculationDefaultsService');
        const selectedShippingOption = calculationShippingOptions.find(opt => opt.selected) || calculationShippingOptions[0];
        
        if (selectedShippingOption) {
          try {
            console.log('[UnifiedQuoteOrderSystem] Fallback selected shipping option:', {
              id: selectedShippingOption.id,
              name: selectedShippingOption.name,
              hasInsuranceOptions: !!selectedShippingOption.insurance_options,
              insuranceConfig: selectedShippingOption.insurance_options
            });
            
            const { calculationDefaultsService } = await import('@/services/CalculationDefaultsService');
            
            // 🔧 TEMPORARY: Force default_enabled for IN-NP route testing
            if (selectedShippingOption.insurance_options && !selectedShippingOption.insurance_options.default_enabled) {
              console.log('[UnifiedQuoteOrderSystem] TEMP FIX: Forcing default_enabled for testing');
              selectedShippingOption.insurance_options.default_enabled = true;
            }
            
            calculatedInsuranceValue = calculationDefaultsService.calculateInsuranceDefault(
              calculationResult.updated_quote,
              selectedShippingOption,
              quote.customer_data?.preferences?.insurance_opted_in || false
            );
            console.log('[UnifiedQuoteOrderSystem] Fallback insurance calculated:', calculatedInsuranceValue);
          } catch (error) {
            console.error('[UnifiedQuoteOrderSystem] Fallback insurance calculation failed:', error);
          }
        }
      }
      
      setCalculatedHandling(calculatedHandlingValue);
      setCalculatedInsurance(calculatedInsuranceValue);
      
      // Auto-fill input fields with route-based calculations
      if (handlingMode === 'auto') {
        setHandlingAmount(calculatedHandlingValue);
      }
      // Auto-populate insurance if customer requested it
      console.log('[UnifiedQuoteOrderSystem] Insurance auto-population check:', {
        customer_opted_in: quote.customer_data?.preferences?.insurance_opted_in,
        calculated_insurance: calculatedInsuranceValue,
        should_auto_populate: quote.customer_data?.preferences?.insurance_opted_in && calculatedInsuranceValue > 0
      });
      if (quote.customer_data?.preferences?.insurance_opted_in && calculatedInsuranceValue > 0) {
        console.log('[UnifiedQuoteOrderSystem] Auto-populating insurance amount:', calculatedInsuranceValue);
        setInsuranceAmount(calculatedInsuranceValue);
      }

      // Update the quote with new calculation and enhanced data
      if (onUpdate && calculationResult) {
        const updateData = {
          calculation_data: calculationResult.updated_quote?.calculation_data || calculationResult.calculation_data || calculationResult,
          final_total_usd: calculationResult.updated_quote?.final_total_usd ||
                          calculationResult.calculation_data?.totals?.final_total || 
                          calculationResult.totals?.final_total || 
                          0,
          // Include enhanced calculation metadata
          hsn_tax_breakdown: calculationResult.hsn_tax_breakdown,
          hsn_calculation_summary: calculationResult.hsn_calculation_summary,
          smart_recommendations: calculationResult.smart_recommendations,
          optimization_suggestions: calculationResult.optimization_suggestions,
          // Update items with any enhanced data from calculation
          items: calculationResult.updated_quote?.items || updatedItems,
          // Save shipping cost and selected option
          shipping: internationalShipping,
          operational_data: {
            ...quote.operational_data,
            shipping: {
              selected_option: selectedShippingOptionId,
              cost_usd: internationalShipping,
              available_options: availableShippingOptions
            }
          }
        };
        
        console.log('🔄 Enhanced calculation update:', {
          has_hsn_breakdown: !!calculationResult.hsn_tax_breakdown,
          has_smart_recommendations: !!calculationResult.smart_recommendations,
          total_customs: calculationResult.hsn_calculation_summary?.total_customs,
          items_with_minimum_valuation: calculationResult.hsn_calculation_summary?.items_with_minimum_valuation,
          shipping_option_selected: selectedShippingOptionId,
          shipping_cost: internationalShipping
        });
        
        if (!skipSave) {
          console.log('🔍 [UNIFIED] Calling onUpdate from recalculateQuote with:', {
            ...updateData,
            item_breakdowns_count: updateData.calculation_data?.item_breakdowns?.length || 0,
            item_breakdowns_sample: updateData.calculation_data?.item_breakdowns?.[0] || null,
            has_hsn_breakdown: !!updateData.hsn_tax_breakdown,
            hsn_items_count: updateData.hsn_tax_breakdown?.length || 0
          });
          onUpdate(updateData);
          console.log('🔍 [UNIFIED] onUpdate completed from recalculateQuote');
        } else {
          console.log('🔍 [UNIFIED] Skipping onUpdate call from recalculateQuote (skipSave=true)');
        }
      }
    } catch (error) {
      console.group('❌ CALCULATION ERROR ANALYSIS');
      console.error('Error recalculating quote:', error);
      console.log('📋 ERROR CONTEXT:', {
        quote_id: quote?.id,
        items_count: updatedItems?.length,
        error_message: error?.message,
        error_type: error?.constructor?.name,
        timestamp: new Date().toISOString()
      });
      console.groupEnd();
    } finally {
      setIsRecalculating(false);
    }
  };

  // Inline edit handlers
  const startEdit = (fieldId: string, currentValue: any) => {
    setEditingField(fieldId);
    setTempValues({ ...tempValues, [fieldId]: currentValue });
  };

  const saveEdit = async (fieldId: string, itemId?: string) => {
    // Update items if it's an item field
    if (itemId) {
      const [field] = fieldId.split('-');
      const updatedItems = items.map(item => 
        item.id === itemId ? { ...item, [field]: tempValues[fieldId] } : item
      );
      setItems(updatedItems);
      
      // Recalculate if price, weight, or HSN changed
      if (['price', 'weight', 'hsn_code'].includes(field)) {
        await recalculateQuote(updatedItems);
      }
      
      // Call onUpdate callback if provided to save items
      if (onUpdate) {
        onUpdate({
          items: updatedItems
        });
      }
    }
    
    setEditingField(null);
    setTempValues({});
  };

  const cancelEdit = () => {
    setEditingField(null);
    setTempValues({});
  };

  // Remove duplicate calculateInsurance function - already defined above

  // Render inline editable field
  const InlineEdit = ({ 
    fieldId, 
    value, 
    type = 'text', 
    prefix = '', 
    suffix = '',
    className = '',
    itemId,
    placeholder = '',
    customDisplay
  }: any) => {
    const isEditing = editingField === fieldId;
    const startEditFn = () => startEdit(fieldId, value);

    // If customDisplay is provided, use it for rendering
    if (customDisplay) {
      const rendered = customDisplay(value, isEditing, startEditFn);
      // If customDisplay returns something in edit mode, show input
      if (isEditing && rendered === null) {
        return (
          <div className="flex items-center gap-1">
            {prefix && <span className="text-gray-500">{prefix}</span>}
            <Input
              type={type}
              value={tempValues[fieldId] || value}
              onChange={(e) => setTempValues({ ...tempValues, [fieldId]: e.target.value })}
              className={cn("h-7", className)}
              placeholder={placeholder}
              autoFocus
              onBlur={() => saveEdit(fieldId, itemId)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit(fieldId, itemId);
                if (e.key === 'Escape') cancelEdit();
              }}
            />
            {suffix && <span className="text-gray-500">{suffix}</span>}
          </div>
        );
      }
      // Otherwise show custom display
      return rendered;
    }

    // Default behavior without customDisplay
    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          {prefix && <span className="text-gray-500">{prefix}</span>}
          <Input
            type={type}
            value={tempValues[fieldId] || value}
            onChange={(e) => setTempValues({ ...tempValues, [fieldId]: e.target.value })}
            className={cn("h-7 w-20", className)}
            placeholder={placeholder}
            autoFocus
            onBlur={() => saveEdit(fieldId, itemId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit(fieldId, itemId);
              if (e.key === 'Escape') cancelEdit();
            }}
          />
          {suffix && <span className="text-gray-500">{suffix}</span>}
        </div>
      );
    }

    return (
      <div
        className="cursor-pointer hover:bg-blue-50 px-2 py-1 -mx-2 -my-1 rounded inline-flex items-center gap-1 group"
        onClick={() => startEdit(fieldId, value)}
      >
        {prefix && <span className="text-gray-500">{prefix}</span>}
        <span>{value || placeholder || '-'}</span>
        {suffix && <span className="text-gray-500">{suffix}</span>}
        <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-50" />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="w-full">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Quotes
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold">
                    {orderMode ? 'Order' : 'Quote'} {quote.tracking_id}
                  </h1>
                  <Badge className={cn(statusColor, 'text-white')}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig[quote.status as keyof typeof statusConfig]?.label}
                  </Badge>
                  {!orderMode && daysUntilExpiry <= 3 && (
                    <Badge variant="destructive">
                      <Clock className="w-3 h-3 mr-1" />
                      Expires in {daysUntilExpiry} days
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Created on {new Date(quote.created_at).toLocaleDateString()} • 
                  Last updated {new Date(quote.updated_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {orderMode && (
                <>
                  <Button variant="outline" size="sm">
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Payment Link
                  </Button>
                  <Button variant="outline" size="sm">
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Issue Refund
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <ShareQuoteButtonV2
                quote={{
                  id: quote.id,
                  display_id: quote.id,
                  status: quote.status,
                  share_token: null, // Will be generated by the component
                  customer_data: quote.customer,
                  items: quote.items
                }}
                onShareUpdate={(shareData) => {
                  // Handle share update callback
                  if (onUpdate) {
                    onUpdate({
                      share_token: shareData.share_token
                    });
                  }
                }}
              />
              <Button size="sm">
                <Send className="w-4 h-4 mr-2" />
                {orderMode ? 'Send Update' : 'Send to Customer'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-6 py-6">
        {/* Debug Panel for Empty Calculation Data */}
        {(!quote.calculation_data || Object.keys(quote.calculation_data).length === 0) && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <span className="font-medium text-orange-800">Missing Calculation Data</span>
                <p className="text-sm text-orange-700 mt-1">
                  This quote has no calculation data. Click recalculate to compute shipping and taxes.
                </p>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => recalculateQuote(items)}
                disabled={isRecalculating}
                className="ml-4"
              >
                {isRecalculating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Recalculating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Recalculate Now
                  </>
                )}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-[1fr_300px] gap-6">
          {/* Main Content */}
          <div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="items">Items & Tax</TabsTrigger>
                <TabsTrigger value="shipping">Shipping & Fees</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6 space-y-6">
                {/* Customer Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={quote.customer?.avatar || ''} />
                        <AvatarFallback>{(quote.customer?.name || 'G').charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{quote.customer?.name || 'Guest Customer'}</h3>
                          <Badge variant="secondary">
                            <Sparkles className="w-3 h-3 mr-1" />
                            {quote.customer?.type || 'Guest'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">{quote.customer?.email || 'No email provided'}</p>
                        <div className="grid grid-cols-3 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-gray-500">Location</p>
                            <p className="text-sm font-medium flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {quote.customer?.location || quote.destination_country}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Customer Since</p>
                            <p className="text-sm font-medium">
                              {new Date(quote.customer?.customer_since || quote.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Total Orders</p>
                            <p className="text-sm font-medium">{quote.customer?.total_orders || 0}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Customer Preferences */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Customer Preferences
                    </CardTitle>
                    <CardDescription>
                      Services and options requested by the customer
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Insurance Preference */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                            quote.customer_data?.preferences?.insurance_opted_in 
                              ? 'bg-green-100 text-green-600' 
                              : 'bg-gray-200 text-gray-400'
                          }`}>
                            {quote.customer_data?.preferences?.insurance_opted_in ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <Circle className="w-3 h-3" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">Insurance Coverage</p>
                            <p className="text-xs text-gray-500">Loss/damage protection</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {quote.customer_data?.preferences?.insurance_opted_in ? (
                            <>
                              <span className="text-sm font-medium text-green-600">
                                Requested
                              </span>
                              {insuranceAmount > 0 ? (
                                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                  Applied: {debugData?.currency_symbol || '$'}{insuranceAmount.toFixed(2)}
                                </span>
                              ) : calculatedInsurance > 0 ? (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-7 px-2 text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                  onClick={() => setInsuranceAmount(calculatedInsurance)}
                                >
                                  Add Customer Insurance ({debugData?.currency_symbol || '$'}{safeToFixed(calculatedInsurance)})
                                </Button>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-sm text-gray-500">Not requested</span>
                          )}
                        </div>
                      </div>

                      {/* Future preferences can be added here */}
                      <div className="text-xs text-gray-400 italic">
                        Additional customer preferences will appear here when available
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Smart Recommendations (replaces status timeline) */}
                {!orderMode && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Lightbulb className="w-5 h-5" />
                        Smart Recommendations
                      </CardTitle>
                      <CardDescription>
                        AI-powered suggestions to optimize this quote
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(quote.recommendations || []).map((rec, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                              rec.type === 'savings' && "bg-green-100",
                              rec.type === 'update' && "bg-blue-100",
                              rec.type === 'optimization' && "bg-purple-100",
                              rec.type === 'alert' && "bg-yellow-100"
                            )}>
                              {rec.type === 'savings' && <TrendingDown className="w-4 h-4 text-green-600" />}
                              {rec.type === 'update' && <RefreshCw className="w-4 h-4 text-blue-600" />}
                              {rec.type === 'optimization' && <Target className="w-4 h-4 text-purple-600" />}
                              {rec.type === 'alert' && <AlertCircle className="w-4 h-4 text-yellow-600" />}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{rec.text}</p>
                              {rec.impact && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Potential impact: <span className="font-medium text-green-600">{rec.impact}</span>
                                </p>
                              )}
                            </div>
                            <Button size="sm" variant="ghost">
                              Apply
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Purchase Tracking (Order Mode Only) */}
                {orderMode && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Store className="w-5 h-5" />
                        Purchase Information
                      </CardTitle>
                      <CardDescription>
                        Track actual purchase details and variances
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {items.map((item) => (
                          <div key={item.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-medium">{item.product_name}</h4>
                                <p className="text-sm text-gray-500">Seller: {item.seller}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {!item.actual_price ? (
                                  <Badge variant="outline" className="bg-yellow-50">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Pending Purchase
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-green-50">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Purchased
                                  </Badge>
                                )}
                                {item.receipt_url && (
                                  <Button variant="outline" size="sm">
                                    <Receipt className="w-4 h-4 mr-2" />
                                    View Receipt
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            {item.actual_price ? (
                              <>
                                <div className="grid grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <p className="text-gray-500">Order ID</p>
                                    <p className="font-mono">{item.seller_order_id || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">Tracking #</p>
                                    <p className="font-mono">{item.seller_tracking || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">Price Variance</p>
                                    <p className={cn(
                                      "font-medium",
                                      item.actual_price > item.price ? "text-red-600" : "text-green-600"
                                    )}>
                                      {item.actual_price > item.price ? '+' : '-'}
                                      ${Math.abs(safeNumber(item.actual_price) - safeNumber(item.price)).toFixed(2)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">Weight Variance</p>
                                    <p className={cn(
                                      "font-medium",
                                      item.actual_weight > item.weight ? "text-red-600" : "text-green-600"
                                    )}>
                                      {item.actual_weight > item.weight ? '+' : '-'}
                                      {Math.abs((item.actual_weight || 0) - (item.weight || 0)).toFixed(3)}kg
                                    </p>
                                  </div>
                                </div>

                                {item.actual_price > item.price && (
                                  <Alert className="mt-3">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                      Price increased by ${(safeNumber(item.actual_price) - safeNumber(item.price)).toFixed(2)}. 
                                      <Button variant="link" size="sm" className="px-2">
                                        Generate payment link
                                      </Button>
                                    </AlertDescription>
                                  </Alert>
                                )}
                              </>
                            ) : (
                              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                                <p>Waiting for purchase. Customer payment received.</p>
                                <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
                                  <div>
                                    <span className="text-gray-500">Estimated Price:</span>
                                    <span className="ml-1 font-medium">${safeNumber(item.price).toFixed(2)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Estimated Weight:</span>
                                    <span className="ml-1 font-medium">{item.weight}kg</span>
                                  </div>
                                </div>
                                <div className="mt-3 flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => {
                                    setPurchaseDialogItem(item);
                                  }}>
                                    <ShoppingCart className="w-4 h-4 mr-2" />
                                    Purchase Now
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Purchase Payment Method */}
                        <div className="border-t pt-4">
                          <h4 className="font-medium mb-3">Purchase Payment</h4>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-gray-500">Method</p>
                              <p className="font-medium">Company Card ****{quote.payment?.purchase?.card_last4 || '4242'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Amount</p>
                              <p className="font-medium">${quote.payment?.purchase?.amount || 0}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Date</p>
                              <p className="font-medium">
                                {quote.payment?.purchase?.purchased_at ? new Date(quote.payment.purchase.purchased_at).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Customer Payment (Order Mode) */}
                {orderMode && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <WalletCards className="w-5 h-5" />
                        Customer Payment Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-green-50 rounded-lg">
                            <p className="text-sm text-gray-600">Amount Paid</p>
                            <p className="text-2xl font-bold text-green-600">
                              {quote.currency_symbol}{(quote.payment?.customer?.amount || 0).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {quote.payment?.customer?.paid_at 
                                ? `Paid on ${new Date(quote.payment.customer.paid_at).toLocaleDateString()}`
                                : 'Payment pending'}
                            </p>
                          </div>
                          <div className="p-4 bg-red-50 rounded-lg">
                            <p className="text-sm text-gray-600">Additional Due</p>
                            <p className="text-2xl font-bold text-red-600">
                              ${quote.additional_due || 0}
                            </p>
                            <Button size="sm" className="mt-2">
                              <LinkIcon className="w-3 h-3 mr-1" />
                              Generate Link
                            </Button>
                          </div>
                        </div>
                        
                        {quote.payment?.customer?.method && (
                          <div className="flex items-center gap-3 text-sm">
                            <CreditCard className="w-4 h-4 text-gray-500" />
                            <span>
                              Paid via {quote.payment.customer.method}
                              {quote.payment.customer.card_last4 && ` ending in ${quote.payment.customer.card_last4}`}
                            </span>
                            {quote.payment.customer.payment_id && (
                              <>
                                <span className="text-gray-400">•</span>
                                <span>ID: {quote.payment.customer.payment_id}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="items" className="mt-6 space-y-6">
                {/* Customer Uploaded Files */}
                {quote.customer_data?.sessionId && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Customer Uploaded Files
                      </CardTitle>
                      <CardDescription>
                        Files uploaded by customer during quote request - review for accurate pricing
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <UploadedFilesDisplay 
                        sessionId={quote.customer_data.sessionId} 
                        isAdmin={true} 
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Items Management */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Items & Tax Management</CardTitle>
                        <CardDescription>
                          Configure products, pricing, and tax settings per item
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Upload className="w-4 h-4 mr-2" />
                          Import
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => {
                            // Add new item
                            const newItem = {
                              id: `item-${Date.now()}`,
                              product_name: 'New Product',
                              product_url: '',
                              quantity: 1,
                              price: 0,
                              weight: 0.1,
                              hsn_code: '8517',
                              category: 'Electronics',
                              tax_method: 'hsn',
                              valuation_method: 'actual_price',
                              minimum_valuation_usd: 0,
                              seller: 'Unknown',
                              image_url: '',
                              dimensions: { length: 0, width: 0, height: 0 },
                              weight_source: 'manual'
                            };
                            const updatedItems = [...items, newItem];
                            setItems(updatedItems);
                            toast({
                              title: "Item Added",
                              description: "New item added. Please update the details."
                            });
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Item
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <SleekProductTable 
                      items={items}
                      selectedShippingOption={selectedShippingOptionId ? availableShippingOptions.find(opt => opt.id === selectedShippingOptionId) : undefined}
                      quote={quote}
                      onUpdateItem={(itemId, updates) => {
                        console.log('🔍 [UNIFIED] onUpdateItem called:', { itemId, updates });
                        const updatedItems = items.map(item => 
                          item.id === itemId ? { ...item, ...updates } : item
                        );
                        console.log('🔍 [UNIFIED] Updated items array:', updatedItems);
                        setItems(updatedItems);
                        console.log('🔍 [UNIFIED] Items state updated');
                        
                        // Clear cache if tax_method, valuation_method, or hsn_code changed
                        if (updates.tax_method || updates.valuation_method || updates.hsn_code) {
                          console.log('🧹 [CACHE] Clearing cache due to tax/valuation/HSN change:', updates);
                          smartQuoteCacheService.invalidateQuoteCache(quote?.id || '');
                          smartCalculationEngine.clearCacheForQuote(quote?.id || '');
                        }
                        
                        // 🚨 CRITICAL: Call onUpdate to save to database immediately
                        if (onUpdate) {
                          console.log('🔍 [UNIFIED] Calling onUpdate to save items to database...');
                          onUpdate({ items: updatedItems });
                          console.log('🔍 [UNIFIED] onUpdate called with updated items');
                        } else {
                          console.warn('🔍 [UNIFIED] ⚠️ onUpdate callback is missing - items will not be saved!');
                        }
                      }}
                      onDeleteItem={(itemId) => {
                        const updatedItems = items.filter(item => item.id !== itemId);
                        setItems(updatedItems);
                        recalculateQuote(updatedItems);
                      }}
                      onDuplicateItem={(item) => {
                        const newItem = { 
                          ...item, 
                          id: `item-${Date.now()}`,
                          product_name: item.product_name + ' (Copy)'
                        };
                        const updatedItems = [...items, newItem];
                        setItems(updatedItems);
                        recalculateQuote(updatedItems);
                      }}
                      onRecalculate={(updatedItems) => {
                        const itemsToUse = updatedItems || items;
                        const skipSave = !!updatedItems; // Skip save if updatedItems provided (already saved by onUpdateItem)
                        console.log('🔍 [UNIFIED] onRecalculate called with items:', { 
                          received: !!updatedItems, 
                          itemCount: itemsToUse.length,
                          skipSave 
                        });
                        recalculateQuote(itemsToUse, skipSave);
                      }}
                    />
                  </CardContent>
                </Card>


                {/* Additional Costs */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CircleDollarSign className="w-5 h-5" />
                        <CardTitle className="text-lg">Additional Costs & Adjustments</CardTitle>
                      </div>
                      <Select 
                        value={costsDesignOption.toString()} 
                        onValueChange={(value) => setCostsDesignOption(Number(value) as 1 | 2 | 3 | 4 | 5)}
                      >
                        <SelectTrigger className="w-48 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1. Stripe-Inspired Minimal</SelectItem>
                          <SelectItem value="2">2. Dashboard Compact Grid</SelectItem>
                          <SelectItem value="3">3. Modern Inline Design</SelectItem>
                          <SelectItem value="4">4. Card-Based Tight</SelectItem>
                          <SelectItem value="5">5. Shopify Professional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <CardDescription>
                      Configure shipping, insurance, handling, and discounts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Design Option 1: Stripe-Inspired Minimal List */}
                    {costsDesignOption === 1 && (
                      <div className="space-y-4">
                        <div className="divide-y divide-gray-100">
                        {/* International Shipping */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <Label className="text-sm font-medium text-gray-700">International Shipping</Label>
                            {availableShippingOptions.length > 0 && (
                              <Select 
                                value={selectedShippingOptionId || ''} 
                                onValueChange={(value) => {
                                  setSelectedShippingOptionId(value);
                                  const option = availableShippingOptions.find(opt => opt.id === value);
                                  if (option) {
                                    setInternationalShipping(option.cost_usd);
                                    recalculateQuote(items);
                                  }
                                }}
                              >
                                <SelectTrigger className="w-48 h-8 text-xs border-gray-200">
                                  <SelectValue placeholder="Select shipping method" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableShippingOptions.map((option) => (
                                    <SelectItem key={option.id} value={option.id}>
                                      <div className="flex items-center justify-between w-full">
                                        <span>{option.name} ({option.carrier})</span>
                                        <span className="text-xs text-gray-500 ml-2">{option.days}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all bg-blue-50 border border-blue-200 text-blue-700">
                              <DollarSign className="h-4 w-4" />
                              <span className="font-mono">{internationalShipping.toFixed(2)}</span>
                            </button>
                            <span className="text-xs text-gray-500">International carrier shipping</span>
                            {selectedShippingOptionId && availableShippingOptions.length > 0 && (
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                {availableShippingOptions.find(opt => opt.id === selectedShippingOptionId)?.name}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Domestic Shipping */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-3 block">Domestic Shipping</Label>
                          <div className="flex items-center gap-3 flex-wrap">
                            <button
                              onClick={() => {
                                const newValue = prompt('Enter domestic shipping cost:', domesticShipping.toString());
                                if (newValue !== null) setDomesticShipping(Number(newValue) || 0);
                              }}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-gray-600 hover:bg-gray-100 border border-gray-200"
                            >
                              <DollarSign className="h-4 w-4" />
                              <span className="font-mono">{domesticShipping.toFixed(2)}</span>
                            </button>
                            <span className="text-xs text-gray-500">Last mile delivery cost</span>
                          </div>
                        </div>
                        
                        {/* Handling Fee */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <Label className="text-sm font-medium text-gray-700">Handling Fee</Label>
                            <div className="flex items-center gap-2">
                              <Select value={handlingMode} onValueChange={(v: 'auto' | 'manual') => {
                                setHandlingMode(v);
                                if (v === 'auto') {
                                  setHandlingAmount(calculatedHandling);
                                }
                              }}>
                                <SelectTrigger className="w-20 h-7 text-xs border-gray-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="auto">Auto</SelectItem>
                                  <SelectItem value="manual">Manual</SelectItem>
                                </SelectContent>
                              </Select>
                              {calculatedHandling > 0 && handlingMode === 'manual' && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-7 px-2 text-xs border-gray-200"
                                  onClick={() => setHandlingAmount(calculatedHandling)}
                                >
                                  Use Calc ({debugData?.currency_symbol || '$'}{safeToFixed(calculatedHandling)})
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <button
                              onClick={() => {
                                if (handlingMode === 'manual') {
                                  const newValue = prompt('Enter handling fee:', handlingAmount.toString());
                                  if (newValue !== null) setHandlingAmount(Number(newValue) || 0);
                                }
                              }}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all border ${
                                handlingMode === 'auto' 
                                  ? 'bg-green-50 border-green-200 text-green-700' 
                                  : 'text-gray-600 hover:bg-gray-100 border-gray-200'
                              }`}
                            >
                              <DollarSign className="h-4 w-4" />
                              <span className="font-mono">{handlingAmount.toFixed(2)}</span>
                            </button>
                            <span className="text-xs text-gray-500">Order processing & packaging</span>
                            {calculatedHandling > 0 && (
                              <span className={`text-xs px-2 py-1 rounded ${handlingMode === 'auto' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                {handlingMode === 'auto' ? 'Auto: Route-based' : `Calculated: ${debugData?.currency_symbol || '$'}${safeToFixed(calculatedHandling)}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {/* Insurance */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Label className="text-sm font-medium text-gray-700">Insurance</Label>
                              {calculatedInsurance > 0 && (
                                <span className="text-xs text-gray-500">
                                  (calc: {debugData?.currency_symbol || '$'}{safeToFixed(calculatedInsurance)})
                                </span>
                              )}
                              {quote.customer_data?.preferences?.insurance_opted_in && insuranceAmount > 0 && (
                                <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  Customer Requested
                                </Badge>
                              )}
                            </div>
                            {calculatedInsurance > 0 && insuranceAmount !== calculatedInsurance && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 px-2 text-xs border-gray-200"
                                onClick={() => setInsuranceAmount(calculatedInsurance)}
                              >
                                Use Calculated
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <button
                              onClick={() => {
                                const newValue = prompt('Enter insurance amount:', insuranceAmount.toString());
                                if (newValue !== null) setInsuranceAmount(Number(newValue) || 0);
                              }}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-gray-600 hover:bg-gray-100 border border-gray-200"
                            >
                              <DollarSign className="h-4 w-4" />
                              <span className="font-mono">{insuranceAmount.toFixed(2)}</span>
                            </button>
                            <span className="text-xs text-gray-500">Loss/damage protection</span>
                            {insuranceAmount > 0 && (
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                                Active: {debugData?.currency_symbol || '$'}{insuranceAmount.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Discount */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-3 block">Discount</Label>
                          <div className="flex items-center gap-3 flex-wrap">
                            <button
                              onClick={() => {
                                const newValue = prompt('Enter discount amount:', discountAmount.toString());
                                if (newValue !== null) setDiscountAmount(Number(newValue) || 0);
                              }}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-gray-600 hover:bg-gray-100 border border-gray-200"
                            >
                              <DollarSign className="h-4 w-4" />
                              <span className="font-mono">{discountAmount.toFixed(2)}</span>
                            </button>
                            <Select defaultValue="amount">
                              <SelectTrigger className="w-24 h-8 text-xs border-gray-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="amount">Amount</SelectItem>
                                <SelectItem value="percent">Percent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {/* Sales Tax */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-3 block">Sales Tax</Label>
                          <div className="flex items-center gap-3 flex-wrap">
                            <button
                              onClick={() => {
                                const route = `${quote.origin_country}-${quote.destination_country}`;
                                if (route !== 'US-NP') {
                                  toast({
                                    title: "Sales Tax Disabled",
                                    description: "Sales tax only applies to US→Nepal shipments",
                                    variant: "warning"
                                  });
                                  return;
                                }
                                const newValue = prompt('Enter sales tax amount:', salesTaxAmount.toString());
                                if (newValue !== null) setSalesTaxAmount(Number(newValue) || 0);
                              }}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all border ${
                                `${quote.origin_country}-${quote.destination_country}` === 'US-NP'
                                  ? 'text-gray-600 hover:bg-gray-100 border-gray-200'
                                  : 'text-gray-400 cursor-not-allowed border-gray-100 bg-gray-50'
                              }`}
                              disabled={`${quote.origin_country}-${quote.destination_country}` !== 'US-NP'}
                            >
                              <Receipt className="h-4 w-4" />
                              <span className="font-mono">{salesTaxAmount.toFixed(2)}</span>
                            </button>
                            <span className="text-xs text-gray-500">
                              {`${quote.origin_country}-${quote.destination_country}` === 'US-NP' ? 'US state tax' : 'Only for US→NP'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    )}
                    
                    {/* Design Option 2: Ultra-Compact Single Row */}
                    {costsDesignOption === 2 && (
                      <div className="space-y-3">
                        {/* Single Row Grid */}
                        <div className="grid grid-cols-5 gap-3">
                          {/* International Shipping */}
                          <div className="group p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all">
                            <div className="flex items-center gap-1.5 mb-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-xs font-semibold text-gray-900">International</span>
                              {availableShippingOptions.length > 0 && selectedShippingOptionId && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                                  {availableShippingOptions.find(opt => opt.id === selectedShippingOptionId)?.name?.substring(0, 3) || 'Exp'}
                                </span>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              <button
                                onClick={() => {
                                  const newValue = prompt('Enter international shipping cost:', internationalShipping.toString());
                                  if (newValue !== null) setInternationalShipping(Number(newValue) || 0);
                                }}
                                className="w-full px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md font-mono text-sm font-bold text-blue-900 hover:text-blue-600 transition-all flex items-center gap-1 group"
                              >
                                <DollarSign className="w-3 h-3 group-hover:scale-110 transition-transform" />
                                {internationalShipping.toFixed(2)}
                              </button>
                              {availableShippingOptions.length > 0 && (
                                <Select 
                                  value={selectedShippingOptionId || ''} 
                                  onValueChange={(value) => {
                                    setSelectedShippingOptionId(value);
                                    const option = availableShippingOptions.find(opt => opt.id === value);
                                    if (option) setInternationalShipping(option.cost_usd);
                                  }}
                                >
                                  <SelectTrigger className="h-7 text-xs border-gray-300 hover:border-blue-400 transition-colors">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableShippingOptions.map((option) => (
                                      <SelectItem key={option.id} value={option.id}>
                                        {option.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </div>

                          {/* Domestic Shipping */}
                          <div className="group p-3 bg-white border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-sm transition-all">
                            <div className="flex items-center gap-1.5 mb-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-xs font-semibold text-gray-900">Domestic</span>
                            </div>
                            <button
                              onClick={() => {
                                const newValue = prompt('Enter domestic shipping cost:', domesticShipping.toString());
                                if (newValue !== null) setDomesticShipping(Number(newValue) || 0);
                              }}
                              className="w-full px-2.5 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 rounded-md font-mono text-sm font-bold text-green-900 hover:text-green-600 transition-all flex items-center gap-1 group"
                            >
                              <DollarSign className="w-3 h-3 group-hover:scale-110 transition-transform" />
                              {domesticShipping.toFixed(2)}
                            </button>
                          </div>

                          {/* Handling Fee */}
                          <div className="group p-3 bg-white border border-gray-200 rounded-lg hover:border-orange-300 hover:shadow-sm transition-all">
                            <div className="flex items-center gap-1.5 mb-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              <span className="text-xs font-semibold text-gray-900">Handling</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                handlingMode === 'auto' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {handlingMode === 'auto' ? 'A' : 'M'}
                              </span>
                              <Select 
                                value={handlingMode} 
                                onValueChange={(value: 'auto' | 'manual') => setHandlingMode(value)}
                              >
                                <SelectTrigger className="h-5 w-5 text-xs border-0 bg-transparent p-0">
                                  <MoreHorizontal className="w-3 h-3" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="auto">Auto</SelectItem>
                                  <SelectItem value="manual">Manual</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <button
                              onClick={() => {
                                if (handlingMode === 'manual') {
                                  const newValue = prompt('Enter handling fee:', handlingAmount.toString());
                                  if (newValue !== null) setHandlingAmount(Number(newValue) || 0);
                                }
                              }}
                              className={`w-full px-2.5 py-1.5 border rounded-md font-mono text-sm font-bold transition-all flex items-center gap-1 group ${
                                handlingMode === 'auto' 
                                  ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed' 
                                  : 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-900 hover:text-orange-600 cursor-pointer'
                              }`}
                              disabled={handlingMode === 'auto'}
                            >
                              <DollarSign className={`w-3 h-3 transition-transform ${handlingMode === 'manual' ? 'group-hover:scale-110' : ''}`} />
                              {handlingAmount.toFixed(2)}
                            </button>
                          </div>

                          {/* Insurance */}
                          <div className="group p-3 bg-white border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-sm transition-all">
                            <div className="flex items-center gap-1.5 mb-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              <span className="text-xs font-semibold text-gray-900">Insurance</span>
                              {quote.customer_data?.preferences?.insurance_opted_in && (
                                <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                                  Req
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                const newValue = prompt('Enter insurance amount:', insuranceAmount.toString());
                                if (newValue !== null) setInsuranceAmount(Number(newValue) || 0);
                              }}
                              className="w-full px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md font-mono text-sm font-bold text-purple-900 hover:text-purple-600 transition-all flex items-center gap-1 group"
                            >
                              <DollarSign className="w-3 h-3 group-hover:scale-110 transition-transform" />
                              {insuranceAmount.toFixed(2)}
                            </button>
                          </div>

                          {/* Discount */}
                          <div className="group p-3 bg-white border border-gray-200 rounded-lg hover:border-red-300 hover:shadow-sm transition-all">
                            <div className="flex items-center gap-1.5 mb-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span className="text-xs font-semibold text-gray-900">Discount</span>
                              <Select defaultValue="amount">
                                <SelectTrigger className="h-5 w-6 text-xs border-0 bg-transparent p-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="amount">$</SelectItem>
                                  <SelectItem value="percent">%</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <button
                              onClick={() => {
                                const newValue = prompt('Enter discount amount:', discountAmount.toString());
                                if (newValue !== null) setDiscountAmount(Number(newValue) || 0);
                              }}
                              className="w-full px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md font-mono text-sm font-bold text-red-900 hover:text-red-600 transition-all flex items-center gap-1 group"
                            >
                              <DollarSign className="w-3 h-3 group-hover:scale-110 transition-transform" />
                              {discountAmount.toFixed(2)}
                            </button>
                          </div>
                          
                          {/* Sales Tax */}
                          <div className="group p-3 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all">
                            <div className="flex items-center gap-1.5 mb-2">
                              <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                              <span className="text-xs font-semibold text-gray-900">Sales Tax</span>
                              {`${quote.origin_country}-${quote.destination_country}` === 'US-NP' && (
                                <Badge variant="outline" className="text-xs h-5 px-1">
                                  US→NP
                                </Badge>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                const route = `${quote.origin_country}-${quote.destination_country}`;
                                if (route !== 'US-NP') {
                                  toast({
                                    title: "Sales Tax Disabled",
                                    description: "Sales tax only applies to US→Nepal shipments",
                                    variant: "warning"
                                  });
                                  return;
                                }
                                const newValue = prompt('Enter sales tax amount:', salesTaxAmount.toString());
                                if (newValue !== null) setSalesTaxAmount(Number(newValue) || 0);
                              }}
                              className={`w-full px-2.5 py-1.5 border rounded-md font-mono text-sm font-bold transition-all flex items-center gap-1 group ${
                                `${quote.origin_country}-${quote.destination_country}` === 'US-NP'
                                  ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-900 hover:text-indigo-600'
                                  : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                              }`}
                              disabled={`${quote.origin_country}-${quote.destination_country}` !== 'US-NP'}
                            >
                              <DollarSign className="w-3 h-3 group-hover:scale-110 transition-transform" />
                              {salesTaxAmount.toFixed(2)}
                            </button>
                          </div>
                        </div>

                        {/* Summary Bar */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                          <div className="flex items-center gap-4">
                            <span className="text-gray-600">Products: <span className="font-mono font-semibold">${items.reduce((sum, item) => sum + (safeNumber(item.price) * safeNumber(item.quantity, 1)), 0).toFixed(2)}</span></span>
                            <span className="text-gray-600">Fees: <span className="font-mono font-semibold">${(safeNumber(internationalShipping) + safeNumber(domesticShipping) + safeNumber(handlingAmount) + safeNumber(insuranceAmount) + safeNumber(salesTaxAmount)).toFixed(2)}</span></span>
                            {discountAmount > 0 && (
                              <span className="text-red-600">Discount: <span className="font-mono font-semibold">-${discountAmount.toFixed(2)}</span></span>
                            )}
                          </div>
                          <div className="font-bold text-green-600">
                            Total: <span className="font-mono text-lg">${(items.reduce((sum, item) => sum + (safeNumber(item.price) * safeNumber(item.quantity, 1)), 0) + safeNumber(internationalShipping) + safeNumber(domesticShipping) + safeNumber(handlingAmount) + safeNumber(insuranceAmount) + safeNumber(salesTaxAmount) - safeNumber(discountAmount)).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Design Option 3: Modern Inline Design */}
                    {costsDesignOption === 3 && (
                      <div className="space-y-6">
                        <div className="flex flex-wrap gap-4">
                          {/* International Shipping */}
                          <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Plane className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 uppercase tracking-wide">International</div>
                              <button
                                onClick={() => {
                                  const newValue = prompt('Enter international shipping cost:', internationalShipping.toString());
                                  if (newValue !== null) setInternationalShipping(Number(newValue) || 0);
                                }}
                                className="font-mono text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
                              >
                                ${internationalShipping.toFixed(2)}
                              </button>
                            </div>
                            {availableShippingOptions.length > 0 && (
                              <Select 
                                value={selectedShippingOptionId || ''} 
                                onValueChange={(value) => {
                                  setSelectedShippingOptionId(value);
                                  const option = availableShippingOptions.find(opt => opt.id === value);
                                  if (option) setInternationalShipping(option.cost_usd);
                                }}
                              >
                                <SelectTrigger className="w-28 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableShippingOptions.map((option) => (
                                    <SelectItem key={option.id} value={option.id}>
                                      {option.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>

                          {/* Domestic Shipping */}
                          <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <Truck className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 uppercase tracking-wide">Domestic</div>
                              <button
                                onClick={() => {
                                  const newValue = prompt('Enter domestic shipping cost:', domesticShipping.toString());
                                  if (newValue !== null) setDomesticShipping(Number(newValue) || 0);
                                }}
                                className="font-mono text-xl font-bold text-gray-900 hover:text-green-600 transition-colors"
                              >
                                ${domesticShipping.toFixed(2)}
                              </button>
                            </div>
                          </div>

                          {/* Handling */}
                          <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                              <Package className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 uppercase tracking-wide">Handling</div>
                              <button
                                onClick={() => {
                                  if (handlingMode === 'manual') {
                                    const newValue = prompt('Enter handling fee:', handlingAmount.toString());
                                    if (newValue !== null) setHandlingAmount(Number(newValue) || 0);
                                  }
                                }}
                                className={`font-mono text-xl font-bold transition-colors ${
                                  handlingMode === 'auto' 
                                    ? 'text-gray-900 cursor-not-allowed' 
                                    : 'text-gray-900 hover:text-orange-600 cursor-pointer'
                                }`}
                                disabled={handlingMode === 'auto'}
                              >
                                ${handlingAmount.toFixed(2)}
                              </button>
                            </div>
                            <Select 
                              value={handlingMode} 
                              onValueChange={(value: 'auto' | 'manual') => setHandlingMode(value)}
                            >
                              <SelectTrigger className="w-16 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="auto">Auto</SelectItem>
                                <SelectItem value="manual">Manual</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Insurance */}
                          <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <Shield className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 uppercase tracking-wide">Insurance</div>
                              <button
                                onClick={() => {
                                  const newValue = prompt('Enter insurance amount:', insuranceAmount.toString());
                                  if (newValue !== null) setInsuranceAmount(Number(newValue) || 0);
                                }}
                                className="font-mono text-xl font-bold text-gray-900 hover:text-purple-600 transition-colors"
                              >
                                ${insuranceAmount.toFixed(2)}
                              </button>
                            </div>
                            {quote.customer_data?.preferences?.insurance_opted_in && (
                              <div className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-md">
                                Requested
                              </div>
                            )}
                          </div>
                          
                          {/* Sales Tax */}
                          <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                              <Receipt className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 uppercase tracking-wide">Sales Tax</div>
                              <button
                                onClick={() => {
                                  const route = `${quote.origin_country}-${quote.destination_country}`;
                                  if (route !== 'US-NP') {
                                    toast({
                                      title: "Sales Tax Disabled",
                                      description: "Sales tax only applies to US→Nepal shipments",
                                      variant: "warning"
                                    });
                                    return;
                                  }
                                  const newValue = prompt('Enter sales tax amount:', salesTaxAmount.toString());
                                  if (newValue !== null) setSalesTaxAmount(Number(newValue) || 0);
                                }}
                                className={`font-mono text-xl font-bold transition-colors ${
                                  `${quote.origin_country}-${quote.destination_country}` === 'US-NP'
                                    ? 'text-gray-900 hover:text-indigo-600'
                                    : 'text-gray-400 cursor-not-allowed'
                                }`}
                                disabled={`${quote.origin_country}-${quote.destination_country}` !== 'US-NP'}
                              >
                                ${salesTaxAmount.toFixed(2)}
                              </button>
                            </div>
                            {`${quote.origin_country}-${quote.destination_country}` === 'US-NP' && (
                              <Badge variant="outline" className="text-xs">
                                Active
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Discount & Summary Row */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                <Percent className="w-5 h-5 text-red-600" />
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 uppercase tracking-wide">Discount</div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      const newValue = prompt('Enter discount amount:', discountAmount.toString());
                                      if (newValue !== null) setDiscountAmount(Number(newValue) || 0);
                                    }}
                                    className="font-mono text-xl font-bold text-gray-900 hover:text-red-600 transition-colors"
                                  >
                                    ${discountAmount.toFixed(2)}
                                  </button>
                                  <Select defaultValue="amount">
                                    <SelectTrigger className="w-16 h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="amount">$</SelectItem>
                                      <SelectItem value="percent">%</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500 uppercase tracking-wide">Total Impact</div>
                            <div className="font-mono text-2xl font-bold text-green-600">
                              ${(items.reduce((sum, item) => sum + (safeNumber(item.price) * safeNumber(item.quantity, 1)), 0) + safeNumber(internationalShipping) + safeNumber(domesticShipping) + safeNumber(handlingAmount) + safeNumber(insuranceAmount) + safeNumber(salesTaxAmount) - safeNumber(discountAmount)).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Design Option 4: Card-Based (But Tight) */}
                    {costsDesignOption === 4 && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          {/* Left Column - Shipping & Handling */}
                          <div className="space-y-3">
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Plane className="w-4 h-4 text-blue-600" />
                                  <span className="font-medium text-blue-900">International</span>
                                </div>
                                {availableShippingOptions.length > 0 && (
                                  <Select 
                                    value={selectedShippingOptionId || ''} 
                                    onValueChange={(value) => {
                                      setSelectedShippingOptionId(value);
                                      const option = availableShippingOptions.find(opt => opt.id === value);
                                      if (option) setInternationalShipping(option.cost_usd);
                                    }}
                                  >
                                    <SelectTrigger className="w-24 h-7 text-xs bg-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableShippingOptions.map((option) => (
                                        <SelectItem key={option.id} value={option.id}>
                                          {option.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  const newValue = prompt('Enter international shipping cost:', internationalShipping.toString());
                                  if (newValue !== null) setInternationalShipping(Number(newValue) || 0);
                                }}
                                className="font-mono text-2xl font-bold text-blue-900 hover:text-blue-600 transition-colors"
                              >
                                ${internationalShipping.toFixed(2)}
                              </button>
                            </div>

                            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                              <div className="flex items-center gap-2 mb-2">
                                <Truck className="w-4 h-4 text-green-600" />
                                <span className="font-medium text-green-900">Domestic</span>
                              </div>
                              <button
                                onClick={() => {
                                  const newValue = prompt('Enter domestic shipping cost:', domesticShipping.toString());
                                  if (newValue !== null) setDomesticShipping(Number(newValue) || 0);
                                }}
                                className="font-mono text-2xl font-bold text-green-900 hover:text-green-600 transition-colors"
                              >
                                ${domesticShipping.toFixed(2)}
                              </button>
                            </div>

                            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Package className="w-4 h-4 text-orange-600" />
                                  <span className="font-medium text-orange-900">Handling</span>
                                </div>
                                <Select 
                                  value={handlingMode} 
                                  onValueChange={(value: 'auto' | 'manual') => setHandlingMode(value)}
                                >
                                  <SelectTrigger className="w-16 h-7 text-xs bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="auto">Auto</SelectItem>
                                    <SelectItem value="manual">Manual</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <button
                                onClick={() => {
                                  if (handlingMode === 'manual') {
                                    const newValue = prompt('Enter handling fee:', handlingAmount.toString());
                                    if (newValue !== null) setHandlingAmount(Number(newValue) || 0);
                                  }
                                }}
                                className={`font-mono text-2xl font-bold transition-colors ${
                                  handlingMode === 'auto' 
                                    ? 'text-orange-900 cursor-not-allowed' 
                                    : 'text-orange-900 hover:text-orange-600 cursor-pointer'
                                }`}
                                disabled={handlingMode === 'auto'}
                              >
                                ${handlingAmount.toFixed(2)}
                              </button>
                            </div>
                          </div>

                          {/* Right Column - Insurance, Discount & Summary */}
                          <div className="space-y-3">
                            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-4 h-4 text-purple-600" />
                                  <span className="font-medium text-purple-900">Insurance</span>
                                </div>
                                {quote.customer_data?.preferences?.insurance_opted_in && (
                                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  const newValue = prompt('Enter insurance amount:', insuranceAmount.toString());
                                  if (newValue !== null) setInsuranceAmount(Number(newValue) || 0);
                                }}
                                className="font-mono text-2xl font-bold text-purple-900 hover:text-purple-600 transition-colors"
                              >
                                ${insuranceAmount.toFixed(2)}
                              </button>
                            </div>

                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Percent className="w-4 h-4 text-red-600" />
                                  <span className="font-medium text-red-900">Discount</span>
                                </div>
                                <Select defaultValue="amount">
                                  <SelectTrigger className="w-14 h-7 text-xs bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="amount">$</SelectItem>
                                    <SelectItem value="percent">%</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <button
                                onClick={() => {
                                  const newValue = prompt('Enter discount amount:', discountAmount.toString());
                                  if (newValue !== null) setDiscountAmount(Number(newValue) || 0);
                                }}
                                className="font-mono text-2xl font-bold text-red-900 hover:text-red-600 transition-colors"
                              >
                                ${discountAmount.toFixed(2)}
                              </button>
                            </div>

                            <div className="p-4 bg-gray-900 text-white rounded-xl">
                              <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Final Total</div>
                              <div className="font-mono text-3xl font-bold">
                                ${(items.reduce((sum, item) => sum + (safeNumber(item.price) * safeNumber(item.quantity, 1)), 0) + safeNumber(internationalShipping) + safeNumber(domesticShipping) + safeNumber(handlingAmount) + safeNumber(insuranceAmount) - safeNumber(discountAmount)).toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                Products: ${items.reduce((sum, item) => sum + (safeNumber(item.price) * safeNumber(item.quantity, 1)), 0).toFixed(2)} • 
                                Fees: ${(safeNumber(internationalShipping) + safeNumber(domesticShipping) + safeNumber(handlingAmount) + safeNumber(insuranceAmount)).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Design Option 5: Shopify-Style Professional */}
                    {costsDesignOption === 5 && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                          {/* International Shipping */}
                          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Plane className="w-6 h-6 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">International Shipping</h4>
                                <p className="text-sm text-gray-500">
                                  {availableShippingOptions.length > 0 && selectedShippingOptionId 
                                    ? `${availableShippingOptions.find(opt => opt.id === selectedShippingOptionId)?.name || 'Just Express'} • International carrier`
                                    : 'International carrier shipping'
                                  }
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {availableShippingOptions.length > 0 && (
                                <Select 
                                  value={selectedShippingOptionId || ''} 
                                  onValueChange={(value) => {
                                    setSelectedShippingOptionId(value);
                                    const option = availableShippingOptions.find(opt => opt.id === value);
                                    if (option) setInternationalShipping(option.cost_usd);
                                  }}
                                >
                                  <SelectTrigger className="w-36 border-gray-300">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableShippingOptions.map((option) => (
                                      <SelectItem key={option.id} value={option.id}>
                                        <div>
                                          <div className="font-medium">{option.name}</div>
                                          <div className="text-xs text-gray-500">${safeToFixed(option.cost_usd)}</div>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              <button
                                onClick={() => {
                                  const newValue = prompt('Enter international shipping cost:', internationalShipping.toString());
                                  if (newValue !== null) setInternationalShipping(Number(newValue) || 0);
                                }}
                                className="px-4 py-2 font-mono text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors border border-gray-300 rounded-md hover:border-blue-300"
                              >
                                ${internationalShipping.toFixed(2)}
                              </button>
                            </div>
                          </div>

                          {/* Domestic Shipping */}
                          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <Truck className="w-6 h-6 text-green-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">Domestic Shipping</h4>
                                <p className="text-sm text-gray-500">Last mile delivery to customer address</p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                const newValue = prompt('Enter domestic shipping cost:', domesticShipping.toString());
                                if (newValue !== null) setDomesticShipping(Number(newValue) || 0);
                              }}
                              className="px-4 py-2 font-mono text-lg font-semibold text-gray-900 hover:text-green-600 transition-colors border border-gray-300 rounded-md hover:border-green-300"
                            >
                              ${domesticShipping.toFixed(2)}
                            </button>
                          </div>

                          {/* Handling Fee */}
                          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                <Package className="w-6 h-6 text-orange-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">Handling Fee</h4>
                                <p className="text-sm text-gray-500">
                                  {handlingMode === 'auto' 
                                    ? 'Automatically calculated based on route and weight'
                                    : 'Manual override for special handling requirements'
                                  }
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Select 
                                value={handlingMode} 
                                onValueChange={(value: 'auto' | 'manual') => setHandlingMode(value)}
                              >
                                <SelectTrigger className="w-24 border-gray-300">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="auto">Auto</SelectItem>
                                  <SelectItem value="manual">Manual</SelectItem>
                                </SelectContent>
                              </Select>
                              <button
                                onClick={() => {
                                  if (handlingMode === 'manual') {
                                    const newValue = prompt('Enter handling fee:', handlingAmount.toString());
                                    if (newValue !== null) setHandlingAmount(Number(newValue) || 0);
                                  }
                                }}
                                className={`px-4 py-2 font-mono text-lg font-semibold border border-gray-300 rounded-md transition-colors ${
                                  handlingMode === 'auto' 
                                    ? 'text-gray-900 cursor-not-allowed bg-gray-50' 
                                    : 'text-gray-900 hover:text-orange-600 hover:border-orange-300 cursor-pointer'
                                }`}
                                disabled={handlingMode === 'auto'}
                              >
                                ${handlingAmount.toFixed(2)}
                              </button>
                            </div>
                          </div>

                          {/* Insurance */}
                          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Shield className="w-6 h-6 text-purple-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">Package Insurance</h4>
                                <p className="text-sm text-gray-500">
                                  {quote.customer_data?.preferences?.insurance_opted_in 
                                    ? 'Customer requested protection for high-value items'
                                    : 'Optional coverage for loss or damage during transit'
                                  }
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {quote.customer_data?.preferences?.insurance_opted_in && (
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
                                  Requested
                                </span>
                              )}
                              <button
                                onClick={() => {
                                  const newValue = prompt('Enter insurance amount:', insuranceAmount.toString());
                                  if (newValue !== null) setInsuranceAmount(Number(newValue) || 0);
                                }}
                                className="px-4 py-2 font-mono text-lg font-semibold text-gray-900 hover:text-purple-600 transition-colors border border-gray-300 rounded-md hover:border-purple-300"
                              >
                                ${insuranceAmount.toFixed(2)}
                              </button>
                            </div>
                          </div>

                          {/* Discount */}
                          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                <Percent className="w-6 h-6 text-red-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">Discount</h4>
                                <p className="text-sm text-gray-500">Apply promotional discount or customer credit</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Select defaultValue="amount">
                                <SelectTrigger className="w-20 border-gray-300">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="amount">Amount</SelectItem>
                                  <SelectItem value="percent">Percent</SelectItem>
                                </SelectContent>
                              </Select>
                              <button
                                onClick={() => {
                                  const newValue = prompt('Enter discount amount:', discountAmount.toString());
                                  if (newValue !== null) setDiscountAmount(Number(newValue) || 0);
                                }}
                                className="px-4 py-2 font-mono text-lg font-semibold text-gray-900 hover:text-red-600 transition-colors border border-gray-300 rounded-md hover:border-red-300"
                              >
                                ${discountAmount.toFixed(2)}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Professional Summary */}
                        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h4>
                          <div className="grid grid-cols-4 gap-6">
                            <div className="text-center">
                              <div className="text-sm text-gray-500 mb-2">Product Subtotal</div>
                              <div className="font-mono text-xl font-bold text-gray-900">
                                ${items.reduce((sum, item) => sum + (safeNumber(item.price) * safeNumber(item.quantity, 1)), 0).toFixed(2)}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm text-gray-500 mb-2">Shipping & Fees</div>
                              <div className="font-mono text-xl font-bold text-gray-900">
                                ${(safeNumber(internationalShipping) + safeNumber(domesticShipping) + safeNumber(handlingAmount) + safeNumber(insuranceAmount)).toFixed(2)}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm text-gray-500 mb-2">Total Discount</div>
                              <div className="font-mono text-xl font-bold text-red-600">
                                -${safeNumber(discountAmount).toFixed(2)}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm text-gray-500 mb-2">Final Total</div>
                              <div className="font-mono text-2xl font-bold text-green-600">
                                ${(items.reduce((sum, item) => sum + (safeNumber(item.price) * safeNumber(item.quantity, 1)), 0) + safeNumber(internationalShipping) + safeNumber(domesticShipping) + safeNumber(handlingAmount) + safeNumber(insuranceAmount) - safeNumber(discountAmount)).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="shipping" className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Shipping Configuration</CardTitle>
                    <CardDescription>
                      Manage shipping routes, carriers, and costs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Route Visualization */}
                      <div className="bg-gray-50 rounded-lg p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="font-medium">{quote.origin_country}</span>
                          </div>
                          <div className="flex-1 mx-4 border-t-2 border-dashed border-gray-300 relative">
                            <Truck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">DE</span>
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          </div>
                          <div className="flex-1 mx-4 border-t-2 border-dashed border-gray-300"></div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{quote.destination_country || 'IN'}</span>
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>

                      {/* Shipping Options */}
                      <div className="space-y-4">
                        <h3 className="font-medium flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Available Shipping Methods
                        </h3>
                        {availableShippingOptions.length > 0 ? (
                          <div className="space-y-3">
                            {availableShippingOptions.map((option: any) => (
                              <div
                                key={option.id}
                                className={cn(
                                  "p-4 border rounded-lg cursor-pointer transition-all",
                                  selectedShippingOptionId === option.id 
                                    ? "border-blue-500 bg-blue-50 shadow-sm" 
                                    : "border-gray-200 hover:border-gray-300"
                                )}
                                onClick={() => {
                                  setSelectedShippingOptionId(option.id);
                                  setInternationalShipping(option.cost_usd);
                                  recalculateQuote(items);
                                }}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-medium">{option.name}</h4>
                                      {selectedShippingOptionId === option.id && (
                                        <Badge variant="secondary" className="text-xs">Selected</Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                      <span className="flex items-center gap-1">
                                        <Truck className="w-3 h-3" />
                                        {option.carrier}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {option.days}
                                      </span>
                                      {option.tracking_available && (
                                        <span className="flex items-center gap-1">
                                          <Package className="w-3 h-3" />
                                          Tracking included
                                        </span>
                                      )}
                                    </div>
                                    {option.description && (
                                      <p className="text-xs text-gray-500 mt-2">{option.description}</p>
                                    )}
                                  </div>
                                  <div className="text-right ml-4">
                                    <p className="font-semibold">${safeToFixed(option.cost_usd)}</p>
                                    <p className="text-xs text-gray-500">USD</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No shipping options available</p>
                            <p className="text-sm mt-1">Please check the route configuration</p>
                          </div>
                        )}
                      </div>

                      {/* Shipping Route Details */}
                      {selectedShippingOptionId && (
                        <div className="space-y-4 border-t pt-4">
                          <h3 className="font-medium">Route Details</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-500">Handling Fee</p>
                              <p className="font-medium">{quote.currency_symbol || '$'}{calculatedHandling.toFixed(2)}</p>
                              {selectedShippingOptionId && availableShippingOptions.find(opt => opt.id === selectedShippingOptionId)?.handling_charge && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Base + {availableShippingOptions.find(opt => opt.id === selectedShippingOptionId)?.handling_charge.percentage_of_value}% of value
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Insurance</p>
                              <p className="font-medium">
                                {insuranceAmount > 0 
                                  ? `${quote.currency_symbol || '$'}${insuranceAmount.toFixed(2)}` 
                                  : 'Not included'}
                              </p>
                              {selectedShippingOptionId && availableShippingOptions.find(opt => opt.id === selectedShippingOptionId)?.insurance_options?.available && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {availableShippingOptions.find(opt => opt.id === selectedShippingOptionId)?.insurance_options.coverage_percentage}% coverage available
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Comprehensive Shipping Cost Breakdown */}
                      {(internationalShipping > 0 || domesticShipping > 0 || handlingAmount > 0) && (
                        <div className="space-y-4 border-t pt-4">
                          <h3 className="font-medium flex items-center gap-2">
                            <Calculator className="w-4 h-4" />
                            Cost Breakdown
                          </h3>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="space-y-3">
                              {/* Product Subtotal */}
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Product Subtotal</span>
                                <span className="font-medium">
                                  {quote.currency_symbol || '$'}
                                  {items.reduce((sum, item) => sum + (safeNumber(item.price) * safeNumber(item.quantity, 1)), 0).toFixed(2)}
                                </span>
                              </div>

                              {/* Shipping Costs */}
                              {internationalShipping > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 flex items-center gap-1">
                                    <Plane className="w-3 h-3" />
                                    International Shipping
                                  </span>
                                  <span className="font-medium">
                                    {quote.currency_symbol || '$'}{internationalShipping.toFixed(2)}
                                  </span>
                                </div>
                              )}

                              {domesticShipping > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 flex items-center gap-1">
                                    <Truck className="w-3 h-3" />
                                    Domestic Delivery
                                  </span>
                                  <span className="font-medium">
                                    {quote.currency_symbol || '$'}{domesticShipping.toFixed(2)}
                                  </span>
                                </div>
                              )}

                              {handlingAmount > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Processing & Handling</span>
                                  <span className="font-medium">
                                    {quote.currency_symbol || '$'}{handlingAmount.toFixed(2)}
                                  </span>
                                </div>
                              )}

                              {insuranceAmount > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    Insurance Coverage
                                  </span>
                                  <span className="font-medium">
                                    {quote.currency_symbol || '$'}{insuranceAmount.toFixed(2)}
                                  </span>
                                </div>
                              )}

                              <Separator className="my-2" />

                              {/* Total Shipping & Fees */}
                              <div className="flex justify-between">
                                <span className="font-medium">Total Shipping & Fees</span>
                                <span className="font-semibold text-lg">
                                  {quote.currency_symbol || '$'}
                                  {(
                                    safeNumber(internationalShipping) +
                                    safeNumber(domesticShipping) +
                                    safeNumber(handlingAmount) +
                                    safeNumber(insuranceAmount)
                                  ).toFixed(2)}
                                </span>
                              </div>
                            </div>

                            {/* Estimated Timeline */}
                            {selectedShippingOptionId && (
                              <div className="mt-4 pt-4 border-t">
                                <h4 className="text-sm font-medium mb-2">Estimated Timeline</h4>
                                <div className="text-xs text-gray-600 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span>Order Processing: 1-2 business days</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span>
                                      International Transit: {availableShippingOptions.find(opt => opt.id === selectedShippingOptionId)?.days || 'N/A'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span>Customs Clearance: 2-4 business days</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>Final Delivery: 1-2 business days</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Legacy shipping options (if any) */}
                      {quote.shipping_options && quote.shipping_options.length > 0 && (
                        <div className="space-y-4 border-t pt-4">
                          <h3 className="font-medium text-gray-600">Legacy Options</h3>
                          <div className="space-y-3">
                            {quote.shipping_options.map((option: any, index: number) => (
                              <div
                                key={index}
                                className={cn(
                                  "p-4 border rounded-lg cursor-pointer transition-colors opacity-60",
                                  option.selected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                                )}
                                onClick={() => {
                                  // Update shipping selection
                                  const updatedOptions = quote.shipping_options.map((opt: any, i: number) => ({
                                    ...opt,
                                    selected: i === index
                                  }));
                                  if (onUpdate) {
                                    onUpdate({
                                      shipping_options: updatedOptions,
                                      shipping: option.cost
                                    });
                                  }
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Truck className="w-5 h-5 text-gray-600" />
                                    <div>
                                      <p className="font-medium">{option.name}</p>
                                      <p className="text-sm text-gray-500">
                                        {option.delivery_time} • {option.carrier}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">${safeNumber(option.cost).toFixed(2)}</p>
                                    {option.tracking_available && (
                                      <p className="text-xs text-green-600">Tracking included</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Communication & Notes */}
                      <div className="space-y-4">
                        <h3 className="font-medium">Customer Communication</h3>
                        <div>
                          <Label>Notes for Customer</Label>
                          <textarea 
                            placeholder="Add any notes that will be visible to the customer..."
                            className="mt-2 flex min-h-[80px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:border-teal-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50 md:text-sm transition-colors"
                            rows={3}
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                          />
                          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            Visible to customer on quote
                          </p>
                        </div>
                        
                        <div>
                          <Label>Internal Notes</Label>
                          <textarea 
                            placeholder="Private notes for internal reference..."
                            className="mt-2 flex min-h-[80px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:border-teal-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50 md:text-sm transition-colors"
                            rows={3}
                            value={internalNotes}
                            onChange={(e) => setInternalNotes(e.target.value)}
                          />
                          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Only visible to admin users
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Activity Timeline</CardTitle>
                    <CardDescription>
                      Track all changes and updates to this {orderMode ? 'order' : 'quote'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(quote.activity_log || quote.activities || []).map((activity, index) => (
                        <div key={activity.id} className="flex gap-4">
                          <div className="relative">
                            {index < (quote.activity_log || quote.activities || []).length - 1 && (
                              <div className="absolute top-8 left-4 w-px h-full bg-gray-200" />
                            )}
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center",
                              activity.type === 'status' ? "bg-blue-100" :
                              activity.type === 'payment' ? "bg-green-100" :
                              activity.type === 'purchase' ? "bg-purple-100" :
                              "bg-gray-100"
                            )}>
                              {activity.type === 'status' && <Activity className="w-4 h-4 text-blue-600" />}
                              {activity.type === 'payment' && <CreditCard className="w-4 h-4 text-green-600" />}
                              {activity.type === 'purchase' && <ShoppingCart className="w-4 h-4 text-purple-600" />}
                              {activity.type === 'system' && <Zap className="w-4 h-4 text-gray-600" />}
                            </div>
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{activity.action}</p>
                              <Badge variant="secondary" className="text-xs">
                                {activity.user}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="messages" className="mt-6">
                <QuoteMessaging
                  quoteId={quote.id}
                  quoteUserId={quote.user_id || quote.customer?.id}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price Summary - Enhanced for Orders */}
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">
                  {orderMode ? 'Order Summary' : 'Price Summary'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{quote.currency_symbol || '$'}{
                      safeNumber(quote.subtotal) > 0 
                        ? safeNumber(quote.subtotal).toFixed(2)
                        : items.reduce((sum, item) => sum + (safeNumber(item.price) * safeNumber(item.quantity, 1)), 0).toFixed(2)
                    }</span>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    {(safeNumber(quote.shipping) > 0 || safeNumber(internationalShipping) > 0) && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Shipping</span>
                        <span>{quote.currency_symbol || '$'}{(safeNumber(quote.shipping) || safeNumber(internationalShipping)).toFixed(2)}</span>
                      </div>
                    )}
                    {safeNumber(quote.customs) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Customs ({(() => {
                            const rate = safeNumber(quote.tax_rates?.customs);
                            // If we have a rate, format it properly
                            if (rate > 0) return formatTaxPercentage(rate);
                            // Fallback: calculate from customs amount and subtotal
                            const subtotal = safeNumber(quote.subtotal) > 0 
                              ? safeNumber(quote.subtotal)
                              : items.reduce((sum, item) => sum + (safeNumber(item.price) * safeNumber(item.quantity, 1)), 0);
                            if (subtotal > 0) {
                              return calculateTaxPercentage(safeNumber(quote.customs), subtotal).toFixed(1);
                            }
                            return '0.0';
                          })()}%)
                        </span>
                        <span>{quote.currency_symbol || '$'}{safeNumber(quote.customs).toFixed(2)}</span>
                      </div>
                    )}
                    {safeNumber(quote.sales_tax) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Sales Tax ({(() => {
                            const rate = safeNumber(quote.tax_rates?.sales_tax);
                            if (rate > 0) return formatTaxPercentage(rate);
                            // Fallback calculation
                            const subtotal = safeNumber(quote.subtotal) > 0 
                              ? safeNumber(quote.subtotal)
                              : items.reduce((sum, item) => sum + (safeNumber(item.price) * safeNumber(item.quantity, 1)), 0);
                            return subtotal > 0 ? calculateTaxPercentage(safeNumber(quote.sales_tax), subtotal).toFixed(1) : '0.0';
                          })()}%)
                        </span>
                        <span>{quote.currency_symbol || '$'}{safeNumber(quote.sales_tax).toFixed(2)}</span>
                      </div>
                    )}
                    {safeNumber(quote.destination_tax) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          VAT/GST ({(() => {
                            const rate = safeNumber(quote.tax_rates?.destination_tax);
                            if (rate > 0) return formatTaxPercentage(rate);
                            // Fallback calculation based on total after customs
                            const baseForVAT = safeNumber(quote.subtotal) + safeNumber(quote.customs) + safeNumber(quote.shipping);
                            return baseForVAT > 0 ? calculateTaxPercentage(safeNumber(quote.destination_tax), baseForVAT).toFixed(1) : '0.0';
                          })()}%)
                        </span>
                        <span>{quote.currency_symbol || '$'}{safeNumber(quote.destination_tax).toFixed(2)}</span>
                      </div>
                    )}
                    {safeNumber(quote.handling) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Handling</span>
                        <span>{quote.currency_symbol || '$'}{safeNumber(quote.handling).toFixed(2)}</span>
                      </div>
                    )}
                    {safeNumber(quote.insurance) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Insurance</span>
                        <span>{quote.currency_symbol || '$'}{safeNumber(quote.insurance).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{quote.currency_symbol || '$'}{(() => {
                      // If we have international shipping selected, add it to the total
                      const baseTotal = safeNumber(quote.total);
                      const shippingCost = safeNumber(internationalShipping);
                      // Only add if it's not already included in quote.total
                      if (shippingCost > 0 && !quote.shipping) {
                        return (baseTotal + shippingCost).toFixed(2);
                      }
                      return baseTotal.toFixed(2);
                    })()}</span>
                  </div>

                  {/* Margin Analysis for Orders */}
                  {orderMode && (
                    <>
                      <Separator />
                      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" />
                          Margin Analysis
                        </h4>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Selling Price</span>
                            <span className="font-medium">${quote.margin?.selling_price || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Purchase Cost</span>
                            <span className="text-red-600">-${quote.margin?.actual_purchase || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">All Expenses</span>
                            <span className="text-red-600">-${quote.margin?.other_expenses || 0}</span>
                          </div>
                          <Separator className="my-1" />
                          <div className="flex justify-between font-medium">
                            <span>Gross Margin</span>
                            <span className="text-green-600">${quote.margin?.gross_margin || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Margin %</span>
                            <span className="font-medium">{quote.margin?.margin_percentage || 0}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">CS Score</span>
                            <span className="font-medium text-blue-600">${quote.margin?.cs_score || 0}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-6 space-y-2">
                  <Button 
                    className="w-full"
                    onClick={() => {
                      // Save all changes
                      if (onUpdate) {
                        onUpdate({
                          items: items,
                          admin_notes: adminNotes,
                          internal_notes: internalNotes,
                          handling: handlingAmount,
                          insurance: insuranceAmount,
                          discount: discountAmount,
                          calculation_data: {
                            ...quote.calculation_metadata,
                            domestic_shipping: domesticShipping
                          },
                          operational_data: {
                            ...quote.operational_data,
                            activities: quote.activity_log || quote.activities
                          }
                        });
                        toast({
                          title: "Changes Saved",
                          description: "Quote has been updated successfully."
                        });
                      }
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      onClick={async () => {
                        setIsRecalculating(true);
                        try {
                          await recalculateQuote(items);
                          toast({
                            title: "Recalculated",
                            description: "Quote has been recalculated with latest rates."
                          });
                        } catch (error) {
                          toast({
                            title: "Recalculation Failed",
                            description: "Failed to recalculate quote. Please try again.",
                            variant: "destructive"
                          });
                        } finally {
                          setIsRecalculating(false);
                        }
                      }}
                      disabled={isRecalculating}
                    >
                      {isRecalculating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Recalculate
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={async () => {
                        try {
                          await smartQuoteCacheService.clearAllCaches();
                          toast({
                            title: "Cache Cleared",
                            description: "All calculation caches have been cleared."
                          });
                        } catch (error) {
                          toast({
                            title: "Cache Clear Failed",
                            description: "Failed to clear cache. Please try again.",
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Cache
                    </Button>
                  </div>
                  <div className="flex items-center space-x-2 mt-3">
                    <input
                      type="checkbox"
                      id="force-per-item"
                      checked={forcePerItemBreakdown}
                      onChange={(e) => setForcePerItemBreakdown(e.target.checked)}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="force-per-item" className="text-sm text-gray-600">
                      Force per-item tax breakdown (generates item_breakdowns even with single tax method)
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Actions - Only in Order Mode */}
            {orderMode && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Order Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm">
                      <LinkIcon className="w-3 h-3 mr-1" />
                      Payment Link
                    </Button>
                    <Button variant="outline" size="sm">
                      <RefreshCcw className="w-3 h-3 mr-1" />
                      Issue Refund
                    </Button>
                    <Button variant="outline" size="sm">
                      <Upload className="w-3 h-3 mr-1" />
                      Upload Receipt
                    </Button>
                    <Button variant="outline" size="sm">
                      <Truck className="w-3 h-3 mr-1" />
                      Update Tracking
                    </Button>
                    <Button variant="outline" size="sm">
                      <FileText className="w-3 h-3 mr-1" />
                      Download Invoice
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600">
                      <XOctagon className="w-3 h-3 mr-1" />
                      Cancel Order
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            {!orderMode && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm">
                      <Copy className="w-3 h-3 mr-1" />
                      Duplicate
                    </Button>
                    <Button variant="outline" size="sm">
                      <FileText className="w-3 h-3 mr-1" />
                      Convert to Order
                    </Button>
                    <Button variant="outline" size="sm">
                      <Clock className="w-3 h-3 mr-1" />
                      Extend Expiry
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600">
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Tax Breakdown - Always Visible */}
            {console.log('Tax breakdown check:', {
              hasCalculationData: !!quote?.calculation_data,
              calculationData: quote?.calculation_data,
              customsPercentage,
              customsAmount: extractedCustomsAmount,
              destinationTaxRate,
              destinationTaxAmount: extractedDestinationTaxAmount
            })}
            {quote?.calculation_data && (
              <Card className="mt-4 border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-purple-600" />
                    🎯 Detailed Tax & Calculation Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Debug Section for Current Quote */}
                  {console.log('🔍 [QUOTE DEBUG] Full quote data:', quote)}
                  {console.log('🔍 [QUOTE DEBUG] Items with tax methods:', items.map(item => ({ 
                    id: item.id, 
                    name: item.product_name, 
                    hsn: item.hsn_code, 
                    tax_method: item.tax_method || 'hsn',
                    price: item.price,
                    quantity: item.quantity 
                  })))}
                  
                  {/* Tax Method & Valuation Method */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-purple-50 p-2 rounded">
                      <div className="font-medium text-purple-700">Tax Method</div>
                      <div className="text-purple-600">
                        {quote.calculation_method_preference === 'hsn' ? 'HSN Based' : 
                         quote.calculation_method_preference === 'route' ? 'Route Based' : 'Manual'}
                      </div>
                    </div>
                    <div className="bg-orange-50 p-2 rounded">
                      <div className="font-medium text-orange-700">Valuation Method</div>
                      <div className="text-orange-600">
                        {quote.valuation_method_preference === 'product_value' ? 'Actual Price' : 
                         quote.valuation_method_preference === 'minimum_valuation' ? 'Minimum Valuation' : 'Higher of Both'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Current Items Analysis */}
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="font-medium text-gray-700 mb-2">📊 Current Items Analysis</div>
                    <div className="space-y-1 text-xs">
                      {items.map((item, index) => (
                        <div key={item.id} className="flex justify-between bg-white p-1 rounded">
                          <span>{item.product_name} (HSN: {item.hsn_code || 'None'})</span>
                          <span>Method: {item.tax_method || 'hsn'} | ${item.price} × {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Expected Tax Calculations */}
                  <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                    <div className="font-medium text-yellow-800 mb-2">📝 Expected Tax Calculations (For Debugging)</div>
                    <div className="space-y-2 text-xs">
                      <div className="font-medium">Quote: {quote.id} | Route: {quote.origin_country}→{quote.destination_country}</div>
                      {items.map((item, index) => {
                        const itemValue = (parseFloat(item.price || '0') * parseInt(item.quantity || '1'));
                        const hsnCode = item.hsn_code;
                        let expectedCustomsRate = 'Unknown';
                        let expectedDestTaxRate = 'Unknown';
                        
                        // Set expected values based on actual HSN database data
                        if (hsnCode === '620442') {
                          expectedCustomsRate = '12% (Clothing/Kurtas from HSN)';
                          expectedDestTaxRate = '13% (Nepal country VAT)';
                        } else if (hsnCode === '841451') {
                          expectedCustomsRate = '20% (Electric Fans from HSN)';
                          expectedDestTaxRate = '13% (Nepal country VAT)';
                        } else if (hsnCode === '3303') {
                          expectedCustomsRate = '25% (Perfumes/Fragrances from HSN)';
                          expectedDestTaxRate = '13% (Nepal country VAT)';
                        } else if (hsnCode === '920600') {
                          expectedCustomsRate = '15% (Drums/Percussion from HSN)';
                          expectedDestTaxRate = '13% (Nepal country VAT)';
                        } else if (hsnCode === '920710') {
                          expectedCustomsRate = '15% (Keyboards/Digital from HSN)';
                          expectedDestTaxRate = '13% (Nepal country VAT)';
                        }
                        
                        return (
                          <div key={item.id} className="bg-white p-2 rounded border">
                            <div className="font-medium text-yellow-800">{item.product_name}</div>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              <div>
                                <div>Value: ${itemValue} (${item.price} × {item.quantity})</div>
                                <div>HSN: {hsnCode || 'None'}</div>
                                <div>Method: {item.tax_method || 'hsn'}</div>
                              </div>
                              <div>
                                <div>Expected Customs: {expectedCustomsRate}</div>
                                <div>Expected Dest. Tax: {expectedDestTaxRate}</div>
                                {hsnCode && (
                                  <div className="text-blue-600">
                                    Should calc from HSN {hsnCode} rates
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Per-Item Tax Breakdown */}
                  {quote.calculation_data.item_breakdowns && quote.calculation_data.item_breakdowns.length > 0 ? (
                    <div className="border-l-2 border-blue-200 pl-3">
                      <div className="font-medium text-blue-700 mb-2">📦 Per-Item Tax Breakdown</div>
                      {console.log('🔍 [DEBUG] Item breakdowns:', quote.calculation_data.item_breakdowns)}
                      {quote.calculation_data.item_breakdowns.map((breakdown: any, index: number) => (
                        <div key={breakdown.item_id || index} className="bg-blue-50 p-2 rounded mb-2">
                          <div className="text-xs font-medium text-blue-800">{breakdown.item_name} (Method: {breakdown.tax_method})</div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mt-1">
                            <div>Customs: {breakdown.customs_rate}% = ${safeToFixed(breakdown.customs)}</div>
                            <div>Sales Tax: ${safeToFixed(breakdown.sales_tax || 0)}</div>
                            <div>Dest. Tax: ${safeToFixed(breakdown.destination_tax)}</div>
                          </div>
                          <div className="text-xs font-medium text-blue-700 mt-1">
                            Total Taxes: ${safeToFixed(breakdown.total_taxes)}
                          </div>
                        </div>
                      ))}
                      <div className="bg-blue-100 p-2 rounded text-xs font-medium">
                        <div className="flex justify-between">
                          <span>Total Item Customs:</span>
                          <span>${safeToFixed(quote.calculation_data.item_breakdowns.reduce((sum: number, item: any) => sum + (item.customs || 0), 0))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Item Dest. Tax:</span>
                          <span>${safeToFixed(quote.calculation_data.item_breakdowns.reduce((sum: number, item: any) => sum + (item.destination_tax || 0), 0))}</span>
                        </div>
                      </div>
                    </div>
                  ) : quote.calculation_data.hsn_tax_breakdown && quote.calculation_data.hsn_tax_breakdown.length > 0 ? (
                    <div className="border-l-2 border-purple-200 pl-3">
                      <div className="font-medium text-purple-700 mb-2">🏷️ HSN Tax Breakdown (Legacy)</div>
                      {console.log('🔍 [DEBUG] HSN breakdowns:', quote.calculation_data.hsn_tax_breakdown)}
                      {quote.calculation_data.hsn_tax_breakdown.map((breakdown: any, index: number) => (
                        <div key={breakdown.hsn_code || index} className="bg-purple-50 p-2 rounded mb-2">
                          <div className="text-xs font-medium text-purple-800">HSN {breakdown.hsn_code}: {breakdown.name}</div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mt-1">
                            <div>Customs: {breakdown.customs_rate}% = ${safeToFixed(breakdown.customs_amount)}</div>
                            <div>Sales Tax: ${safeToFixed(breakdown.sales_tax || 0)}</div>
                            <div>Dest. Tax: {breakdown.destination_tax_rate}% = ${safeToFixed(breakdown.destination_tax_amount)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-l-2 border-orange-200 pl-3">
                      <div className="font-medium text-orange-700 mb-1">⚠️ Legacy Customs Calculation</div>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div>Base: {quote.calculation_data.valuation_applied?.original_items_total ? `$${safeToFixed(quote.calculation_data.valuation_applied.original_items_total)}` : 'N/A'} (actual)</div>
                        {quote.calculation_data.valuation_applied?.customs_calculation_base && (
                          <div>Customs Base: ${safeToFixed(quote.calculation_data.valuation_applied.customs_calculation_base)} 
                            {quote.calculation_data.valuation_applied.adjustment_applied && ' (adjusted)'}
                          </div>
                        )}
                        <div>CIF Value: Base + Shipping (${internationalShipping.toFixed(2)}) + Insurance (${insuranceAmount.toFixed(2)})</div>
                        <div>Customs %: {customsPercentage}%</div>
                        <div className="font-medium text-orange-600">= ${extractedCustomsAmount.toFixed(2)}</div>
                        <div className="text-orange-500 text-xs mt-1">📝 Note: Using legacy calculation - per-item breakdown not available</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Sales Tax Detail (US→NP only) */}
                  {`${quote.origin_country}-${quote.destination_country}` === 'US-NP' && (
                    <div className="border-l-2 border-indigo-200 pl-3">
                      <div className="font-medium text-indigo-700 mb-1">Sales Tax (Origin)</div>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div>Route: {quote.origin_country}→{quote.destination_country}</div>
                        <div>Base: ${quote.calculation_data.breakdown?.items_total || 0}</div>
                        <div>Sales Tax: ${salesTaxAmount.toFixed(2)}</div>
                        <div className="text-indigo-600 font-medium">Applied to items first</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Destination Tax Detail */}
                  {quote.calculation_data.breakdown?.destination_tax && (
                    <div className="border-l-2 border-green-200 pl-3">
                      <div className="font-medium text-green-700 mb-1">Destination Tax (VAT/GST)</div>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div>Country: {quote.destination_country}</div>
                        <div>Type: {quote.destination_country === 'IN' ? 'GST' : quote.destination_country === 'NP' ? 'VAT' : 'Tax'}</div>
                        <div>Landed Cost: Items + Shipping + Insurance + Customs + Handling</div>
                        <div className="font-medium text-green-600">= ${safeToFixed(quote.calculation_data.breakdown.destination_tax)}</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Summary Totals */}
                  <div className="border-t pt-2 space-y-1 text-xs font-medium">
                    <div className="flex justify-between text-orange-600">
                      <span>Total Customs:</span>
                      <span>${extractedCustomsAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-indigo-600">
                      <span>Total Sales Tax:</span>
                      <span>${salesTaxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Total Destination Tax:</span>
                      <span>${(quote.calculation_data.breakdown?.destination_tax || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-purple-700 text-sm pt-1 border-t">
                      <span>Total All Taxes:</span>
                      <span>${(extractedCustomsAmount + salesTaxAmount + (quote.calculation_data.breakdown?.destination_tax || 0)).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Payment Gateway Fee Calculation */}
                  {quote?.calculation_data?.breakdown && (
                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                      <div className="text-xs font-medium text-blue-700 mb-2">💳 Payment Gateway Fee</div>
                      <div className="space-y-1 text-xs">
                        <div>Subtotal: ${(
                          quote.calculation_data.breakdown.items_total +
                          quote.calculation_data.breakdown.shipping +
                          domesticShipping +
                          extractedCustomsAmount +
                          salesTaxAmount +
                          (quote.calculation_data.breakdown.destination_tax || 0) +
                          handlingAmount +
                          insuranceAmount
                        ).toFixed(2)}</div>
                        <div>Fee: 2.9% + $0.30 = ${safeToFixed(quote.calculation_data.breakdown.fees)}</div>
                      </div>
                    </div>
                  )}

                  {/* Final Total */}
                  {quote?.calculation_data?.breakdown && (
                    <div className="bg-green-50 p-3 rounded border border-green-200">
                      <div className="flex justify-between text-sm font-bold text-green-700">
                        <span>Final Total:</span>
                        <span>${safeToFixed(quote.calculation_data.total_cost)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 🔧 DEBUG DISPLAY - Calculation Breakdown */}
            {(debugData || quote?.calculation_data) && (
              <Card className="mt-4 border-cyan-200 bg-cyan-50/20">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-600" />
                    🔧 Calculation Debug Data & Tax Breakdown
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {safeDebugData.calculation_timestamp ? `Last calculation: ${safeDebugData.calculation_timestamp}` : 'Tax calculation details'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Route & Currency */}
                  {debugData && (
                    <div className="bg-white p-3 rounded-lg border">
                      <div className="text-xs font-medium text-gray-600 mb-2">Route & Currency</div>
                      <div className="space-y-1 text-xs">
                        <div><strong>Route:</strong> {debugData?.route || 'N/A'}</div>
                        <div><strong>Currency:</strong> {debugData?.currency_used || 'N/A'}</div>
                      </div>
                    </div>
                  )}

                  {/* Enhanced Tax Breakdown */}
                  <div className="bg-white p-3 rounded-lg border border-purple-200">
                    <div className="text-xs font-medium text-purple-700 mb-2">🎯 Detailed Tax & Calculation Breakdown</div>
                    <div className="space-y-3">
                      {/* Tax Method & Valuation Method */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-purple-50 p-2 rounded">
                          <div className="font-medium text-purple-700">Tax Method</div>
                          <div className="text-purple-600">
                            {quote.calculation_method_preference === 'hsn' ? 'HSN Based' : 
                             quote.calculation_method_preference === 'route' ? 'Route Based' : 'Manual'}
                          </div>
                        </div>
                        <div className="bg-orange-50 p-2 rounded">
                          <div className="font-medium text-orange-700">Valuation Method</div>
                          <div className="text-orange-600">
                            {quote.valuation_method_preference === 'product_value' ? 'Actual Price' : 
                             quote.valuation_method_preference === 'minimum_valuation' ? 'Minimum Valuation' : 'Higher of Both'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Customs Calculation Detail */}
                      <div className="border-l-2 border-orange-200 pl-3">
                        <div className="font-medium text-orange-700 mb-1">Customs Calculation</div>
                        <div className="space-y-1 text-xs text-gray-600">
                          <div>Base: ${items.reduce((sum, item) => sum + (safeNumber(item.price) * safeNumber(item.quantity, 1)), 0).toFixed(2)} (actual)</div>
                          <div>CIF Value: Base + Shipping (${internationalShipping.toFixed(2)}) + Insurance (${insuranceAmount.toFixed(2)})</div>
                          <div>Customs Rate: {customsPercentage}%</div>
                          <div className="font-medium text-orange-600">Customs Amount: ${extractedCustomsAmount.toFixed(2)}</div>
                        </div>
                      </div>
                      
                      {/* Item-wise Tax Breakdown (if available) */}
                      {hasItemBreakdowns && (
                        <div className="bg-indigo-50 p-3 rounded border border-indigo-200">
                          <div className="font-medium text-indigo-700 mb-2 text-xs">📦 Item-wise Tax Breakdown</div>
                          <div className="space-y-2">
                            {quote.calculation_data.item_breakdowns.map((itemBreakdown, idx) => (
                              <div key={idx} className="text-xs bg-white p-2 rounded border border-indigo-100">
                                <div className="font-medium text-gray-700">{itemBreakdown.item_name || `Item ${idx + 1}`}</div>
                                {itemBreakdown.hsn_code && (
                                  <div className="text-gray-500">HSN: {itemBreakdown.hsn_code}</div>
                                )}
                                <div className="grid grid-cols-3 gap-2 mt-1">
                                  <div>
                                    <span className="text-gray-500">Customs:</span>
                                    <span className="ml-1 font-medium">${(itemBreakdown.customs || 0).toFixed(2)}</span>
                                  </div>
                                  {itemBreakdown.sales_tax > 0 && (
                                    <div>
                                      <span className="text-gray-500">Sales:</span>
                                      <span className="ml-1 font-medium">${itemBreakdown.sales_tax.toFixed(2)}</span>
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-gray-500">VAT:</span>
                                    <span className="ml-1 font-medium">${(itemBreakdown.destination_tax || 0).toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Sales Tax Detail (US→NP only) */}
                      {`${quote.origin_country}-${quote.destination_country}` === 'US-NP' && extractedSalesTaxAmount > 0 && (
                        <div className="border-l-2 border-indigo-200 pl-3">
                          <div className="font-medium text-indigo-700 mb-1">Sales Tax (Origin)</div>
                          <div className="space-y-1 text-xs text-gray-600">
                            <div>Route: {quote.origin_country}→{quote.destination_country}</div>
                            <div>Sales Tax: ${extractedSalesTaxAmount.toFixed(2)}</div>
                            <div className="text-indigo-600 font-medium">Applied to items first</div>
                          </div>
                        </div>
                      )}
                      
                      {/* Destination Tax Detail */}
                      {extractedDestinationTaxAmount > 0 && (
                        <div className="border-l-2 border-green-200 pl-3">
                          <div className="font-medium text-green-700 mb-1">Destination Tax (VAT/GST)</div>
                          <div className="space-y-1 text-xs text-gray-600">
                            <div>Country: {quote.destination_country}</div>
                            <div>VAT/GST Rate: {destinationTaxRate.toFixed(1)}%</div>
                            <div className="font-medium text-green-600">VAT/GST Amount: ${extractedDestinationTaxAmount.toFixed(2)}</div>
                          </div>
                        </div>
                      )}
                      
                      {/* Payment Gateway Fee */}
                      <div className="border-l-2 border-blue-200 pl-3">
                        <div className="font-medium text-blue-700 mb-1">💳 Payment Gateway Fee</div>
                        <div className="space-y-1 text-xs text-gray-600">
                          <div>Subtotal: ${subtotalForGateway.toFixed(2)}</div>
                          <div>Fee: 2.9% + $0.30</div>
                          <div className="font-medium text-blue-600">Gateway Fee: ${gatewayFee.toFixed(2)}</div>
                        </div>
                      </div>
                      
                      {/* Summary Totals */}
                      <div className="bg-gray-50 p-2 rounded space-y-1 text-xs">
                        <div className="font-medium text-gray-700">Summary Totals</div>
                        <div className="flex justify-between">
                          <span>Total Customs:</span>
                          <span className="font-medium">${extractedCustomsAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Sales Tax:</span>
                          <span className="font-medium">${salesTaxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total VAT/GST:</span>
                          <span className="font-medium">${extractedDestinationTaxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span className="font-medium">Total All Taxes:</span>
                          <span className="font-bold text-purple-600">${(extractedCustomsAmount + salesTaxAmount + extractedDestinationTaxAmount).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Live Calculation Breakdown */}
                  {safeCalculationBreakdown.items_total !== undefined && (
                    <div className="bg-white p-3 rounded-lg border">
                      <div className="text-xs font-medium text-gray-600 mb-2">💰 Live Cost Breakdown</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span><strong>Items:</strong></span>
                          <span>{safeDebugData.currency_symbol || '$'}{safeCalculationBreakdown.items_total || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span><strong>Shipping:</strong></span>
                          <span>{safeDebugData.currency_symbol || '$'}{safeCalculationBreakdown.shipping || 0}</span>
                        </div>
                      <div className="flex justify-between">
                        <span><strong>Handling:</strong></span>
                        <span className={handlingMode === 'auto' && calculatedHandling > 0 ? 'text-green-600 font-semibold' : ''}>{safeDebugData.currency_symbol || '$'}{safeToFixed(handlingAmount)} {handlingMode === 'manual' && calculatedHandling > 0 && calculatedHandling !== handlingAmount ? '(calc: ' + (safeDebugData.currency_symbol || '$') + safeToFixed(calculatedHandling) + ')' : ''}</span>
                      </div>
                      <div className="flex justify-between">
                        <span><strong>Insurance:</strong></span>
                        <span className={calculatedInsurance > 0 && calculatedInsurance === insuranceAmount ? 'text-green-600 font-semibold' : ''}>{safeDebugData.currency_symbol || '$'}{safeToFixed(insuranceAmount)} {calculatedInsurance > 0 && calculatedInsurance !== insuranceAmount ? '(calc: ' + (safeDebugData.currency_symbol || '$') + safeToFixed(calculatedInsurance) + ')' : ''}</span>
                      </div>
                      <div className="flex justify-between">
                        <span><strong>Customs:</strong></span>
                        <span>{debugData?.currency_symbol || '$'}{debugData.calculation_breakdown.customs || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span><strong>Taxes:</strong></span>
                        <span>{debugData?.currency_symbol || '$'}{debugData.calculation_breakdown.taxes || 0}</span>
                      </div>
                      {debugData.calculation_breakdown.destination_tax && (
                        <div className="flex justify-between">
                          <span><strong>Destination Tax:</strong></span>
                          <span>{debugData?.currency_symbol || '$'}{debugData.calculation_breakdown.destination_tax || 0}</span>
                        </div>
                      )}
                      {domesticShipping > 0 && (
                        <div className="flex justify-between">
                          <span><strong>Domestic Shipping:</strong></span>
                          <span>{debugData?.currency_symbol || '$'}{domesticShipping.toFixed(2)}</span>
                        </div>
                      )}
                        <div className="border-t pt-1 mt-1 flex justify-between font-semibold">
                          <span><strong>Total:</strong></span>
                          <span>{debugData?.currency_symbol || '$'}{(
                            debugData.calculation_breakdown.items_total +
                            debugData.calculation_breakdown.shipping +
                            handlingAmount +
                            insuranceAmount +
                            debugData.calculation_breakdown.customs +
                            debugData.calculation_breakdown.taxes
                          ).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}


                  {/* Detailed Calculation Formulas */}
                  {debugData?.detailed_calculations && (
                    <div className="bg-white p-3 rounded-lg border">
                      <div className="text-xs font-medium text-gray-600 mb-2">🧮 Detailed Calculation Formulas</div>
                      <div className="space-y-3">
                        
                        {/* Shipping Calculation */}
                        <div className="border-l-2 border-blue-200 pl-3">
                          <div className="font-medium text-blue-700 mb-1">🚢 Shipping Calculation</div>
                          <div className="text-xs space-y-1">
                            <div><strong>Formula:</strong> <code className="bg-gray-100 px-1 rounded text-xs">{debugData.detailed_calculations.shipping.formula}</code></div>
                            {debugData.detailed_calculations.shipping.carrier && (
                              <>
                                <div><strong>Carrier:</strong> {debugData.detailed_calculations.shipping.carrier}</div>
                                <div><strong>Service:</strong> {debugData.detailed_calculations.shipping.name}</div>
                                <div><strong>Weight:</strong> {debugData.detailed_calculations.shipping.weight}kg</div>
                                <div><strong>Delivery Days:</strong> {debugData.detailed_calculations.shipping.days}</div>
                                
                                {/* Detailed Breakdown - Calculate if not available */}
                                <div className="bg-gray-50 p-2 rounded mt-2 space-y-1">
                                  <div className="font-semibold text-gray-700">📊 Cost Breakdown:</div>
                                  {debugData.detailed_calculations.shipping.breakdown ? (
                                    <>
                                      <div><strong>Base Cost:</strong> {debugData?.currency_symbol || '$'}{debugData.detailed_calculations.shipping.breakdown.base_cost || 0}</div>
                                      <div><strong>Weight Tier:</strong> {debugData.detailed_calculations.shipping.breakdown.weight_tier || 'N/A'}</div>
                                      <div><strong>Weight Cost:</strong> {debugData.detailed_calculations.shipping.weight}kg × {debugData?.currency_symbol || '$'}{debugData.detailed_calculations.shipping.breakdown.weight_rate || 0}/kg = {debugData?.currency_symbol || '$'}{debugData.detailed_calculations.shipping.breakdown.weight_cost || 0}</div>
                                      <div><strong>Delivery Premium:</strong> {debugData?.currency_symbol || '$'}{debugData.detailed_calculations.shipping.breakdown.delivery_premium || 0}</div>
                                      <div className="border-t pt-1 mt-1 font-semibold">
                                        <strong>Formula:</strong> {debugData?.currency_symbol || '$'}{debugData.detailed_calculations.shipping.breakdown.base_cost || 0} + {debugData?.currency_symbol || '$'}{debugData.detailed_calculations.shipping.breakdown.weight_cost || 0} + {debugData?.currency_symbol || '$'}{debugData.detailed_calculations.shipping.breakdown.delivery_premium || 0} = {debugData?.currency_symbol || '$'}{debugData.detailed_calculations.shipping.total_cost_usd}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="text-sm text-gray-600">For weight: {debugData.detailed_calculations.shipping.weight}kg on {debugData.route} route</div>
                                      <div className="text-sm text-gray-600">Total shipping cost: {debugData?.currency_symbol || '$'}{debugData.detailed_calculations.shipping.total_cost_usd}</div>
                                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                        <p className="text-xs text-yellow-800">
                                          Detailed breakdown requires recalculation. The current calculation shows a total of {debugData?.currency_symbol || '$'}{debugData.detailed_calculations.shipping.total_cost_usd} 
                                          for {debugData.detailed_calculations.shipping.weight}kg using {debugData.detailed_calculations.shipping.carrier}.
                                        </p>
                                        <p className="text-xs text-yellow-800 mt-1">
                                          Based on typical IN→NP rates: Base ₹25 + Weight ({debugData.detailed_calculations.shipping.weight}kg × ₹45/kg) + Delivery Premium
                                        </p>
                                      </div>
                                    </>
                                  )}
                                </div>
                                
                                <div className="bg-blue-50 p-2 rounded mt-1">
                                  <strong>Total Cost:</strong> {debugData?.currency_symbol || '$'}{debugData.detailed_calculations.shipping.total_cost_usd}
                                </div>
                              </>
                            )}
                            <div className="text-gray-600 italic">{debugData.detailed_calculations.shipping.explanation}</div>
                          </div>
                        </div>

                        {/* Handling Calculation */}
                        <div className="border-l-2 border-green-200 pl-3">
                          <div className="font-medium text-green-700 mb-1">📦 Handling Calculation</div>
                          <div className="text-xs space-y-1">
                            <div><strong>Formula:</strong> <code className="bg-gray-100 px-1 rounded text-xs">{debugData.detailed_calculations.handling.formula}</code></div>
                            {debugData.detailed_calculations.handling.base_fee !== undefined && (
                              <>
                                <div><strong>Base Fee:</strong> {debugData?.currency_symbol || '$'}{debugData.detailed_calculations.handling.base_fee}</div>
                                <div><strong>Items Value:</strong> {debugData?.currency_symbol || '$'}{debugData.detailed_calculations.handling.items_value}</div>
                                <div><strong>Percentage:</strong> {debugData.detailed_calculations.handling.percentage}%</div>
                                <div><strong>Percentage Amount:</strong> {debugData?.currency_symbol || '$'}{debugData.detailed_calculations.handling.percentage_amount.toFixed(2)}</div>
                                <div><strong>Before Constraints:</strong> {debugData?.currency_symbol || '$'}{debugData.detailed_calculations.handling.before_constraints.toFixed(2)}</div>
                                <div><strong>Min Fee:</strong> {debugData?.currency_symbol || '$'}{debugData.detailed_calculations.handling.min_fee}</div>
                                <div><strong>Max Fee:</strong> {debugData?.currency_symbol || '$'}{debugData.detailed_calculations.handling.max_fee}</div>
                                <div className="bg-green-50 p-2 rounded mt-1">
                                  <strong>Final Total:</strong> {debugData?.currency_symbol || '$'}{debugData.detailed_calculations.handling.total.toFixed(2)}
                                </div>
                              </>
                            )}
                            <div className="text-gray-600 italic">{debugData.detailed_calculations.handling.explanation}</div>
                            
                            {/* Debug Info for NaN Troubleshooting */}
                            {debugData.detailed_calculations.handling.debug_info && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                                <div className="font-medium text-red-700 mb-1">🔍 Debug Information</div>
                                <div><strong>Quote costprice_total_usd:</strong> {debugData.detailed_calculations.handling.debug_info.quote_costprice_total_usd}</div>
                                <div><strong>Items count:</strong> {debugData.detailed_calculations.handling.debug_info.quote_items_length}</div>
                                <div><strong>Calculated items value:</strong> {debugData.detailed_calculations.handling.debug_info.calculated_items_value}</div>
                                <div><strong>Is NaN:</strong> {debugData.detailed_calculations.handling.debug_info.is_items_value_nan ? 'YES' : 'NO'}</div>
                                {debugData.detailed_calculations.handling.debug_info.items_breakdown && (
                                  <div className="mt-1">
                                    <strong>Items breakdown:</strong>
                                    {debugData.detailed_calculations.handling.debug_info.items_breakdown.map((item, idx) => (
                                      <div key={idx} className="ml-2 text-xs">
                                        {item.name}: {item.costprice_origin} × {item.quantity} = {item.line_total}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="mt-1">
                                  <strong>Math checks:</strong>
                                  <div className="ml-2">Base fee valid: {debugData.detailed_calculations.handling.debug_info.math_check.base_fee_valid ? 'YES' : 'NO'}</div>
                                  <div className="ml-2">Percentage valid: {debugData.detailed_calculations.handling.debug_info.math_check.percentage_valid ? 'YES' : 'NO'}</div>
                                  <div className="ml-2">Multiplication: {debugData.detailed_calculations.handling.debug_info.math_check.multiplication_result}</div>
                                  <div className="ml-2">Final calc: {debugData.detailed_calculations.handling.debug_info.math_check.percentage_calculation}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Insurance Calculation */}
                        <div className="border-l-2 border-purple-200 pl-3">
                          <div className="font-medium text-purple-700 mb-1">🔒 Insurance Calculation</div>
                          <div className="text-xs space-y-1">
                            <div><strong>Formula:</strong> <code className="bg-gray-100 px-1 rounded text-xs">{debugData.detailed_calculations.insurance.formula}</code></div>
                            {debugData.detailed_calculations.insurance.items_value !== undefined && (
                              <>
                                <div><strong>Items Value:</strong> {debugData?.currency_symbol || '$'}{debugData.detailed_calculations.insurance.items_value}</div>
                                <div><strong>Coverage:</strong> {debugData.detailed_calculations.insurance.coverage_percentage}%</div>
                                <div><strong>Percentage Amount:</strong> {debugData?.currency_symbol || '$'}{debugData.detailed_calculations.insurance.percentage_amount.toFixed(2)}</div>
                                <div><strong>Max Coverage:</strong> ${debugData.detailed_calculations.insurance.max_coverage}</div>
                                {debugData.detailed_calculations.insurance.min_fee > 0 && (
                                  <div><strong>Min Fee:</strong> {debugData?.currency_symbol || '$'}{debugData.detailed_calculations.insurance.min_fee}</div>
                                )}
                                <div><strong>Optional:</strong> {debugData.detailed_calculations.insurance.is_optional ? 'Yes' : 'No'}</div>
                                <div><strong>Customer Opted In:</strong> {debugData.detailed_calculations.insurance.customer_opted_in ? 'Yes' : 'No'}</div>
                                <div className="bg-purple-50 p-2 rounded mt-1">
                                  <strong>Total:</strong> {debugData?.currency_symbol || '$'}{debugData.detailed_calculations.insurance.total.toFixed(2)}
                                </div>
                              </>
                            )}
                            <div className="text-gray-600 italic">{debugData.detailed_calculations.insurance.explanation}</div>
                            
                            {/* Debug Info for NaN Troubleshooting */}
                            {debugData.detailed_calculations.insurance.debug_info && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                                <div className="font-medium text-red-700 mb-1">🔍 Debug Information</div>
                                <div><strong>Quote costprice_total_usd:</strong> {debugData.detailed_calculations.insurance.debug_info.quote_costprice_total_usd}</div>
                                <div><strong>Calculated items value:</strong> {debugData.detailed_calculations.insurance.debug_info.calculated_items_value}</div>
                                <div><strong>Is NaN:</strong> {debugData.detailed_calculations.insurance.debug_info.is_items_value_nan ? 'YES' : 'NO'}</div>
                                <div><strong>Coverage % valid:</strong> {debugData.detailed_calculations.insurance.debug_info.coverage_percentage_valid ? 'YES' : 'NO'}</div>
                                <div className="mt-1">
                                  <strong>Math checks:</strong>
                                  <div className="ml-2">Multiplication: {debugData.detailed_calculations.insurance.debug_info.math_check.multiplication_result}</div>
                                  <div className="ml-2">Final calc: {debugData.detailed_calculations.insurance.debug_info.math_check.percentage_calculation}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* Shipping Options */}
                  {debugData?.shipping_data && (
                    <div className="bg-white p-3 rounded-lg border">
                      <div className="text-xs font-medium text-gray-600 mb-2">🚢 Shipping Options</div>
                      <div className="space-y-1 text-xs">
                        <div><strong>Available Options:</strong> {debugData?.shipping_data?.options_count || 0}</div>
                        {debugData?.shipping_data?.selected_option && (
                          <div><strong>Selected:</strong> {debugData?.shipping_data?.selected_option?.carrier} - {debugData?.shipping_data?.selected_option?.name}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Configuration Status */}
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="text-xs font-medium text-gray-600 mb-2">⚙️ Config Status</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${debugData?.config_status?.has_handling_config ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <strong>Handling Config:</strong> {debugData?.config_status?.has_handling_config ? 'Found' : 'Missing'}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${debugData?.config_status?.has_insurance_config ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <strong>Insurance Config:</strong> {debugData?.config_status?.has_insurance_config ? 'Found' : 'Missing'}
                      </div>
                      <div><strong>Delivery Options:</strong> {debugData?.config_status?.delivery_options_count || 0}</div>
                    </div>
                  </div>

                  {/* HSN Data */}
                  {safeHsnData.items_processed !== undefined && (
                    <div className="bg-white p-3 rounded-lg border">
                      <div className="text-xs font-medium text-gray-600 mb-2">🏷️ HSN Tax Data</div>
                      <div className="space-y-1 text-xs">
                        <div><strong>Items Processed:</strong> {safeHsnData.items_processed || 0}</div>
                        <div><strong>Method:</strong> {safeHsnData.calculation_method || 'N/A'}</div>
                        <div><strong>HSN Customs:</strong> {safeHsnData.total_customs || 0}</div>
                        <div><strong>HSN Local Tax:</strong> {safeHsnData.total_local_taxes || 0}</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      
      {/* Purchase Item Dialog */}
      {purchaseDialogItem && (
        <PurchaseItemDialog
          open={!!purchaseDialogItem}
          onOpenChange={(open) => !open && setPurchaseDialogItem(null)}
          item={purchaseDialogItem}
          quoteId={quote.id}
          onSuccess={() => {
            setPurchaseDialogItem(null);
            // Refresh data if callback provided
            onUpdate?.({ refresh: true });
          }}
        />
      )}
      
      {/* HSN Creation Modal */}
      <HSNCreationModal
        open={showHSNCreateModal}
        onOpenChange={setShowHSNCreateModal}
        initialData={newHSNData ? {
          hsn_code: newHSNData.code || newHSNData.hsn_code || '',
          product_name: newHSNData.product_name,
          weight: newHSNData.weight,
          category: newHSNData.category
        } : undefined}
        onSuccess={async (hsnData) => {
          toast({
            title: 'HSN Code Created',
            description: 'The HSN code has been created successfully.',
          });
          
          // Apply weight to current item if available
          if (hsnData.weight_data?.typical_weights?.per_unit?.average && newHSNData) {
            const weight_avg = hsnData.weight_data.typical_weights.per_unit.average;
            // Update the item that initiated the HSN creation
            setItems(items.map(item => 
              item.product_name === newHSNData.product_name
                ? { 
                    ...item, 
                    weight: weight_avg,
                    weight_source: 'HSN Database',
                    weight_confidence: 1.0,
                    hsn_code: hsnData.hsn_code,
                    hsn_category: hsnData.category
                  } 
                : item
            ));
          }
          
          
          setNewHSNData(null);
        }}
      />

      {/* Category Creation Modal */}
      <Dialog open={showCategoryCreateModal} onOpenChange={setShowCategoryCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Add New Category
            </DialogTitle>
            <DialogDescription>
              Create a new product category. This will be added to the category list for future use.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="category_name">Category Name</Label>
              <Input 
                id="category_name"
                value={newCategoryData?.name || ''}
                onChange={(e) => setNewCategoryData({...newCategoryData, name: e.target.value})}
                placeholder="e.g., Automotive, Pet Supplies"
              />
            </div>
            
            <div>
              <Label htmlFor="category_description">Description (Optional)</Label>
              <Input 
                id="category_description"
                value={newCategoryData?.description || ''}
                onChange={(e) => setNewCategoryData({...newCategoryData, description: e.target.value})}
                placeholder="Brief description of this category"
              />
            </div>
            
            <div>
              <Label htmlFor="category_keywords">Keywords (Optional)</Label>
              <Input 
                id="category_keywords"
                value={newCategoryData?.keywords?.join(', ') || ''}
                onChange={(e) => {
                  const keywordsList = e.target.value.split(',').map(k => k.trim()).filter(k => k);
                  setNewCategoryData({...newCategoryData, keywords: keywordsList});
                }}
                placeholder="keyword1, keyword2, keyword3"
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated keywords to help classify products
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (!newCategoryData?.name?.trim()) {
                toast({
                  title: 'Category name required',
                  description: 'Please enter a name for the category.',
                  variant: 'destructive'
                });
                return;
              }
              
              // Create category value from name
              const categoryValue = newCategoryData.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
              
              // Add to categories list
              const newCategory = {
                value: categoryValue,
                label: newCategoryData.name
              };
              setCategories([...categories, newCategory]);
              
              // Auto-select the new category in HSN modal
              if (newHSNData) {
                setNewHSNData({...newHSNData, category: categoryValue});
              }
              
              toast({
                title: 'Category Added',
                description: `"${newCategoryData.name}" has been added to the category list.`,
                variant: 'default'
              });
              
              setShowCategoryCreateModal(false);
              setNewCategoryData(null);
            }}>
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}