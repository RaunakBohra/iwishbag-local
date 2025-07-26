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
  ReceiptText,
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
import { SmartDualWeightField } from '@/components/admin/SmartDualWeightField';
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
    const originCurrency = currencyService.getCurrencyForCountrySync(quote.origin_country || 'US');
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
  
  // Fetch HSN codes from database
  useEffect(() => {
    const fetchHSNCodes = async () => {
      try {
        setIsLoadingHSN(true);
        
        // Fetch HSN codes directly from database with keywords and category for enhanced search
        const { data: hsnRecords, error } = await supabase
          .from('hsn_master')
          .select('hsn_code, description, category, subcategory, tax_data, keywords')
          .eq('is_active', true)
          .order('hsn_code');
        
        if (error) {
          throw error;
        }
        
        // Transform HSN records to match the expected format
        const transformedCodes = (hsnRecords || []).map((record: any) => ({
          code: record.hsn_code,
          description: record.description,
          category: record.category,
          subcategory: record.subcategory,
          keywords: record.keywords || [], // Include keywords for enhanced search
          rate: record.tax_data?.typical_rates?.customs?.common || 
                record.tax_data?.typical_rates?.gst?.standard || 
                18 // Default GST rate
        }));
        
        setHsnCodes(transformedCodes);
        console.log(`✅ Loaded ${transformedCodes.length} HSN codes from database:`, transformedCodes.map(c => c.code));
      } catch (error) {
        console.error('❌ Failed to fetch HSN codes:', error);
        toast({
          title: 'Failed to load HSN codes',
          description: 'Using fallback HSN data. Please refresh the page.',
          variant: 'destructive'
        });
        
        // Fallback to basic HSN codes if fetch fails
        setHsnCodes([
          { code: '8517', description: 'Telephone sets, including smartphones', rate: 22 },
          { code: '8471', description: 'Automatic data processing machines', rate: 18 },
        ]);
      } finally {
        setIsLoadingHSN(false);
      }
    };
    
    fetchHSNCodes();
  }, []); // Run once on mount
  
  console.log('Tax rates debug:', {
    customs_rate: quote?.tax_rates?.customs,
    destination_tax_rate: quote?.tax_rates?.destination_tax,
    sales_tax_rate: quote?.tax_rates?.sales_tax,
    customs_amount: quote?.customs,
    destination_tax_amount: quote?.destination_tax,
    subtotal: quote?.subtotal
  });
  
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
  const [hsnSearchOpen, setHsnSearchOpen] = useState<string | null>(null);
  const [hsnSearchQuery, setHsnSearchQuery] = useState<Record<string, string>>({});
  const [notesPopoverOpen, setNotesPopoverOpen] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [showHSNCreateModal, setShowHSNCreateModal] = useState(false);
  const [newHSNData, setNewHSNData] = useState<any>(null);
  const [hsnCodes, setHsnCodes] = useState<Array<{code: string, description: string, rate: number}>>([]);
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
  const [isLoadingHSN, setIsLoadingHSN] = useState(true);
  const [adminNotes, setAdminNotes] = useState(quote.admin_notes || '');
  const [internalNotes, setInternalNotes] = useState(quote.internal_notes || '');
  const [insuranceAmount, setInsuranceAmount] = useState(safeNumber(quote.insurance));
  const [handlingAmount, setHandlingAmount] = useState(safeNumber(quote.handling));
  
  // Track calculated values from SmartCalculationEngine
  const [calculatedHandling, setCalculatedHandling] = useState(0);
  const [calculatedInsurance, setCalculatedInsurance] = useState(0);
  const [handlingMode, setHandlingMode] = useState<'auto' | 'manual'>('auto');
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

  // Check if we're in order mode
  const orderMode = isOrderMode(quote.status);

  // Calculate days until expiry
  const daysUntilExpiry = quote.expires_at ? Math.ceil(
    (new Date(quote.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  ) : null;

  // Populate HSN categories for existing items
  useEffect(() => {
    if (hsnCodes.length > 0 && items.length > 0) {
      const updatedItems = items.map(item => {
        if (item.hsn_code && !item.hsn_category) {
          const hsnData = hsnCodes.find(hsn => hsn.code === item.hsn_code);
          if (hsnData && hsnData.category) {
            return {
              ...item,
              hsn_category: hsnData.category
            };
          }
        }
        return item;
      });
      
      // Only update if categories were added
      const hasChanges = updatedItems.some((item, index) => 
        items[index].hsn_category !== item.hsn_category
      );
      
      if (hasChanges) {
        setItems(updatedItems);
      }
    }
  }, [hsnCodes]); // Only run when hsnCodes are loaded


  // Recalculate quote when items change
  const recalculateQuote = async (updatedItems: any[]) => {
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
          origin_country: quote.origin_country || 'US',
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
          admin_id: isAdmin ? 'admin-user' : undefined
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
          items_with_customs: calculationResult.hsn_tax_breakdown.filter(item => item.customs_amount > 0).length,
          total_customs_calculated: calculationResult.hsn_tax_breakdown.reduce((sum, item) => sum + item.customs_amount, 0),
          classification_sources: [...new Set(calculationResult.hsn_tax_breakdown.map(item => item.classification_source))]
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
          calculation_data: calculationResult.calculation_data || calculationResult,
          final_total_usd: calculationResult.calculation_data?.totals?.final_total || 
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
        
        onUpdate(updateData);
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
      
      // Call onUpdate callback if provided
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
        <div className="max-w-[1600px] mx-auto">
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

      <div className="max-w-[1600px] mx-auto px-6 py-6">
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

        <div className="grid grid-cols-12 gap-6">
          {/* Main Content */}
          <div className="col-span-8">
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
                                  Add Customer Insurance ({debugData?.currency_symbol || '$'}{calculatedInsurance.toFixed(2)})
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
                {/* Tax Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tax Configuration</CardTitle>
                    <CardDescription>
                      Configure how taxes are calculated for this quote
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label className="text-sm font-medium">Global Tax Method</Label>
                        <Select 
                          value={quote.tax_method || 'per_item'}
                          onValueChange={(value) => {
                            if (onUpdate) {
                              onUpdate({ tax_method: value });
                            }
                            recalculateQuote(items);
                          }}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="per_item">Per-Item Configuration</SelectItem>
                            <SelectItem value="global_hsn">Global HSN-based</SelectItem>
                            <SelectItem value="global_country">Global Country-based</SelectItem>
                            <SelectItem value="global_manual">Global Manual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Global Valuation Method</Label>
                        <Select 
                          value={quote.valuation_method || 'auto'}
                          onValueChange={(value) => {
                            if (onUpdate) {
                              onUpdate({ valuation_method: value });
                            }
                            recalculateQuote(items);
                          }}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto (Higher of Both)</SelectItem>
                            <SelectItem value="product_value">Product Value Only</SelectItem>
                            <SelectItem value="minimum_valuation">Minimum Valuation Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

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
                              image_url: ''
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
                    <div className="border rounded-lg">
                      <table className="w-full table-fixed">
                        <colgroup>
                          <col style={{ width: '30%' }} />  {/* Product */}
                          <col style={{ width: '15%' }} />  {/* Price & Qty */}
                          <col style={{ width: '22%' }} />  {/* Weight & HSN */}
                          <col style={{ width: '17%' }} />  {/* Tax & Valuation */}
                          {orderMode && <col style={{ width: '10%' }} />}  {/* Variance */}
                          <col style={{ width: orderMode ? '6%' : '16%' }} />  {/* Actions */}
                        </colgroup>
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left px-6 py-4 font-medium text-gray-700 text-xs uppercase tracking-wider">Product</th>
                            <th className="text-right px-4 py-4 font-medium text-gray-700 text-xs uppercase tracking-wider">Price</th>
                            <th className="text-left px-4 py-4 font-medium text-gray-700 text-xs uppercase tracking-wider">Weight & HSN</th>
                            <th className="text-left px-4 py-4 font-medium text-gray-700 text-xs uppercase tracking-wider">Tax & Valuation</th>
                            {orderMode && (
                              <th className="text-right px-4 py-4 font-medium text-gray-700 text-xs uppercase tracking-wider">Variance</th>
                            )}
                            <th className="text-center px-4 py-4 font-medium text-gray-700 text-xs uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {items.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-4 relative">
                                <div className="flex items-center gap-2 min-w-0">
                                  {item.image_url && (
                                    <img 
                                      src={item.image_url} 
                                      alt={item.product_name}
                                      className="w-10 h-10 object-cover rounded flex-shrink-0"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="flex-1 min-w-0">
                                        <InlineEdit
                                          fieldId={`product_name-${item.id}`}
                                          value={item.product_name}
                                          className="w-full text-sm"
                                          itemId={item.id}
                                          customDisplay={(value, isEditing, startEdit) => {
                                            if (isEditing) return null;
                                            return (
                                              <div 
                                                onClick={startEdit}
                                                className="cursor-pointer hover:bg-blue-50 px-2 py-1 -mx-2 -my-1 rounded group flex items-center gap-1"
                                                onMouseEnter={(e) => {
                                                  const rect = e.currentTarget.getBoundingClientRect();
                                                  const tooltip = e.currentTarget.querySelector('.tooltip-content');
                                                  if (tooltip) {
                                                    tooltip.style.position = 'fixed';
                                                    tooltip.style.left = `${rect.left}px`;
                                                    tooltip.style.top = `${rect.bottom + 4}px`;
                                                    tooltip.style.zIndex = '9999';
                                                  }
                                                }}
                                              >
                                                <span className="truncate block">{value || '-'}</span>
                                                <div 
                                                  className="tooltip-content opacity-0 group-hover:opacity-100 bg-gray-900 text-white shadow-xl border border-gray-700 rounded px-3 py-2 whitespace-nowrap text-sm pointer-events-none transition-opacity duration-0"
                                                  style={{ position: 'fixed' }}
                                                >
                                                  {value || '-'}
                                                  <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 border-l border-t border-gray-700 transform rotate-45"></div>
                                                </div>
                                                <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-50 flex-shrink-0" />
                                              </div>
                                            );
                                          }}
                                        />
                                      </div>
                                      {item.customer_notes && (
                                        <Popover open={notesPopoverOpen === item.id} onOpenChange={(open) => setNotesPopoverOpen(open ? item.id : null)}>
                                          <PopoverTrigger>
                                            <Badge variant="secondary" className="cursor-pointer flex-shrink-0">
                                              <MessageCircle className="w-3 h-3" />
                                            </Badge>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-80">
                                            <div className="space-y-2">
                                              <h4 className="font-medium text-sm">Customer Note</h4>
                                              <p className="text-sm text-gray-600">{item.customer_notes}</p>
                                            </div>
                                          </PopoverContent>
                                        </Popover>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <InlineEdit
                                        fieldId={`product_url-${item.id}`}
                                        value={item.product_url || ''}
                                        placeholder="Click to add URL..."
                                        className="flex-1 max-w-xs text-xs"
                                        itemId={item.id}
                                        customDisplay={(value, isEditing, startEdit) => {
                                          if (!value && !isEditing) {
                                            return null; // Will show placeholder
                                          }
                                          if (isEditing) {
                                            return null; // Will show input
                                          }
                                          // Show blue domain box + edit button
                                          return (
                                            <div className="group flex items-center gap-1">
                                              <a 
                                                href={value}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 rounded-md border border-blue-200 hover:border-blue-300 transition-all duration-200 text-xs font-medium"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                {(() => {
                                                  try {
                                                    const domain = new URL(value).hostname;
                                                    return domain;
                                                  } catch {
                                                    return 'Link';
                                                  }
                                                })()}
                                              </a>
                                              <button 
                                                onClick={startEdit}
                                                className="w-6 h-6 p-1 hover:bg-gray-100 rounded transition-all duration-200 text-gray-600 hover:text-gray-800 opacity-0 group-hover:opacity-100"
                                                title="Edit URL"
                                              >
                                                <Edit2 className="w-4 h-4" />
                                              </button>
                                            </div>
                                          );
                                        }}
                                      />
                                    </div>
                                    
                                    {/* Files Section - Admin can manage customer uploaded files */}
                                    {item.files && item.files.length > 0 && (
                                      <div className="mt-2">
                                        <div className="flex flex-wrap gap-1">
                                          {item.files.map((file, fileIndex) => (
                                            <div key={fileIndex} className="inline-flex items-center gap-1 bg-green-50 border border-green-200 rounded px-2 py-1 text-xs">
                                              <FileText className="h-3 w-3 text-green-600" />
                                              <span className="text-green-800 font-medium truncate max-w-16">
                                                {file.file?.name || 'File'}
                                              </span>
                                              {file.url && (
                                                <a 
                                                  href={file.url} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer" 
                                                  className="text-green-600 hover:text-green-800"
                                                  title="View file"
                                                >
                                                  <Eye className="h-3 w-3" />
                                                </a>
                                              )}
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const updatedFiles = item.files.filter((_, i) => i !== fileIndex);
                                                  const updatedItems = items.map(i => 
                                                    i.id === item.id ? { ...i, files: updatedFiles } : i
                                                  );
                                                  setItems(updatedItems);
                                                  recalculateQuote(updatedItems);
                                                }}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded p-0.5"
                                                title="Remove file"
                                              >
                                                <X className="h-3 w-3" />
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <div className="space-y-2">
                                  <InlineEdit
                                    fieldId={`price-${item.id}`}
                                    value={item.price}
                                    type="number"
                                    prefix="$"
                                    className="font-semibold text-gray-900 text-base inline-block text-right"
                                    itemId={item.id}
                                  />
                                  <div className="text-xs text-gray-500 flex items-center justify-end gap-1">
                                    <span>×</span>
                                    <InlineEdit
                                      fieldId={`quantity-${item.id}`}
                                      value={item.quantity}
                                      type="number"
                                      className="w-12 text-right"
                                      itemId={item.id}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="space-y-2 overflow-hidden">
                                  <div className="w-full min-w-0">
                                    <SmartDualWeightField
                                      value={item.weight || 0}
                                      onChange={(weight) => {
                                        const updatedItems = items.map(i => 
                                          i.id === item.id ? { ...i, weight } : i
                                        );
                                        setItems(updatedItems);
                                        recalculateQuote(updatedItems);
                                      }}
                                      productName={item.product_name || ''}
                                      hsnCode={item.hsn_code || ''}
                                      productUrl={item.product_url}
                                      onSourceSelected={(source) => {
                                        console.log(`Weight source selected for item ${item.id}:`, source);
                                        // Update item's smart_data with weight source
                                        const updatedItems = items.map(i => 
                                          i.id === item.id ? { 
                                            ...i, 
                                            smart_data: {
                                              ...i.smart_data,
                                              weight_source: source
                                            }
                                          } : i
                                        );
                                        setItems(updatedItems);
                                      }}
                                      label=""
                                      className="compact-mode w-full max-w-none"
                                    />
                                    {item.weight_source && (
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <button className="absolute -right-5 top-1/2 -translate-y-1/2">
                                            <Info className={cn(
                                              "w-3 h-3",
                                              item.weight_source === 'HSN Database' && "text-green-600",
                                              item.weight_source === 'AI Prediction' && "text-yellow-600",
                                              item.weight_source === 'Category Average' && "text-orange-600",
                                              !item.weight_source && "text-gray-400"
                                            )} />
                                          </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-64 p-3" side="left">
                                          <div className="space-y-2 text-xs">
                                            <div className="font-medium flex items-center gap-2">
                                              <Scale className="w-3 h-3" />
                                              Weight Source
                                            </div>
                                            <div className="space-y-1">
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">Source:</span>
                                                <span className="font-medium">{item.weight_source || 'Manual Entry'}</span>
                                              </div>
                                              {item.weight_confidence && (
                                                <div className="flex justify-between">
                                                  <span className="text-gray-600">Confidence:</span>
                                                  <span className="font-medium">{Math.round(item.weight_confidence * 100)}%</span>
                                                </div>
                                              )}
                                              {item.weight_source === 'HSN Database' && (
                                                <div className="text-green-600 text-xs mt-2">
                                                  <div>Weight from official HSN database</div>
                                                  {item.hsn_weight_range && (
                                                    <div className="mt-1 p-2 bg-green-50 rounded border-green-200 border">
                                                      <div className="text-xs text-green-700">
                                                        <div><strong>Range:</strong> {item.hsn_weight_range.min}kg - {item.hsn_weight_range.max}kg</div>
                                                        <div><strong>Average:</strong> {item.hsn_weight_range.average}kg</div>
                                                        {item.hsn_weight_range.packaging && (
                                                          <div><strong>Packaging:</strong> +{item.hsn_weight_range.packaging}kg</div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                              {/* Weight range validation for any source with HSN range data */}
                                              {item.hsn_weight_range && item.weight && (
                                                <div className="mt-2 pt-2 border-t border-gray-200">
                                                  <div className="text-xs">
                                                    <div className="font-medium text-gray-700 mb-1">HSN Weight Range Validation:</div>
                                                    {item.weight >= item.hsn_weight_range.min && item.weight <= item.hsn_weight_range.max ? (
                                                      <div className="text-green-600 flex items-center gap-1">
                                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                        Within normal range ({item.hsn_weight_range.min}-{item.hsn_weight_range.max}kg)
                                                      </div>
                                                    ) : (
                                                      <div className="text-red-600 flex items-center gap-1">
                                                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                                        Outside range ({item.hsn_weight_range.min}-{item.hsn_weight_range.max}kg)
                                                        {item.weight < item.hsn_weight_range.min && (
                                                          <span className="ml-1">- too light</span>
                                                        )}
                                                        {item.weight > item.hsn_weight_range.max && (
                                                          <span className="ml-1">- too heavy</span>
                                                        )}
                                                      </div>
                                                    )}
                                                    <div className="flex gap-1 mt-2">
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          const updatedItems = items.map(i => 
                                                            i.id === item.id ? { 
                                                              ...i, 
                                                              weight: item.hsn_weight_range.min,
                                                              weight_source: 'HSN Minimum'
                                                            } : i
                                                          );
                                                          setItems(updatedItems);
                                                          recalculateQuote(updatedItems);
                                                        }}
                                                        className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                                                      >
                                                        Use Min ({item.hsn_weight_range.min}kg)
                                                      </button>
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          const updatedItems = items.map(i => 
                                                            i.id === item.id ? { 
                                                              ...i, 
                                                              weight: item.hsn_weight_range.average,
                                                              weight_source: 'HSN Average'
                                                            } : i
                                                          );
                                                          setItems(updatedItems);
                                                          recalculateQuote(updatedItems);
                                                        }}
                                                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                                      >
                                                        Use Avg ({item.hsn_weight_range.average}kg)
                                                      </button>
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          const updatedItems = items.map(i => 
                                                            i.id === item.id ? { 
                                                              ...i, 
                                                              weight: item.hsn_weight_range.max,
                                                              weight_source: 'HSN Maximum'
                                                            } : i
                                                          );
                                                          setItems(updatedItems);
                                                          recalculateQuote(updatedItems);
                                                        }}
                                                        className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                                                      >
                                                        Use Max ({item.hsn_weight_range.max}kg)
                                                      </button>
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                    )}
                                  </div>
                                  <Popover open={hsnSearchOpen === item.id} onOpenChange={(open) => setHsnSearchOpen(open ? item.id : null)}>
                                    <PopoverTrigger>
                                      <Badge variant="outline" className="cursor-pointer text-xs px-2 py-1">
                                        {item.hsn_code ? (
                                          <div className="text-center">
                                            <div className="font-medium">{item.hsn_code}</div>
                                            {item.hsn_category && (
                                              <div className="text-gray-500 text-[10px] capitalize mt-0.5">
                                                {item.hsn_category}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          'No HSN'
                                        )}
                                      </Badge>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80">
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2 pb-2">
                                          <Search className="w-4 h-4 text-gray-500" />
                                          <Input 
                                            placeholder="Search HSN code, description, or keywords..." 
                                            className="h-8 flex-1"
                                            autoFocus
                                            value={hsnSearchQuery[item.id] || ''}
                                            onChange={(e) => setHsnSearchQuery({
                                              ...hsnSearchQuery,
                                              [item.id]: e.target.value
                                            })}
                                          />
                                        </div>
                                        <div className="space-y-1 max-h-64 overflow-y-auto">
                                          {isLoadingHSN ? (
                                            <div className="flex items-center justify-center py-4">
                                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                              <span className="text-sm text-gray-500">Loading HSN codes...</span>
                                            </div>
                                          ) : (() => {
                                            const query = hsnSearchQuery[item.id]?.toLowerCase() || '';
                                            console.log(`🔍 [HSN Search Debug] Query: "${query}", Total HSN codes: ${hsnCodes.length}`);
                                            const filtered = hsnCodes.filter(hsn => {
                                              // Search in HSN code
                                              if (hsn.code.toLowerCase().includes(query)) return true;
                                              
                                              // Search in description
                                              if (hsn.description.toLowerCase().includes(query)) return true;
                                              
                                              // Search in keywords array
                                              if (hsn.keywords && Array.isArray(hsn.keywords)) {
                                                return hsn.keywords.some(keyword => 
                                                  keyword.toLowerCase().includes(query)
                                                );
                                              }
                                              
                                              return false;
                                            });
                                            
                                            console.log(`🔍 [HSN Search Debug] Filtered results: ${filtered.length}, Show button condition: ${filtered.length === 0}`);
                                            
                                            if (filtered.length === 0) {
                                              return (
                                                <div className="text-center py-6 px-4">
                                                  <div className="mb-3">
                                                    <Package className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                                    <p className="text-sm text-gray-600 font-medium mb-1">No HSN code found</p>
                                                    <p className="text-xs text-gray-500">
                                                      {query ? `No results for "${hsnSearchQuery[item.id]}"` : 'Start typing to search HSN codes'}
                                                    </p>
                                                  </div>
                                                  <Button
                                                    size="sm"
                                                    variant="default"
                                                    className="bg-blue-600 hover:bg-blue-700"
                                                    onClick={() => {
                                                      setNewHSNData({
                                                        code: hsnSearchQuery[item.id] || '',
                                                        product_name: item.product_name,
                                                        weight: item.weight,
                                                        category: item.category
                                                      });
                                                      setShowHSNCreateModal(true);
                                                      setHsnSearchOpen(null);
                                                    }}
                                                  >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Add New HSN Code
                                                  </Button>
                                                  <p className="text-xs text-gray-500 mt-2">
                                                    Create a new HSN entry for this product
                                                  </p>
                                                </div>
                                              );
                                            }
                                            
                                            return filtered.map((hsn) => {
                                              // Find matching keywords for display
                                              const matchingKeywords = hsn.keywords ? 
                                                hsn.keywords.filter(keyword => 
                                                  keyword.toLowerCase().includes(query)
                                                ) : [];
                                              
                                              // Create inline component for weight preview
                                              const WeightPreview = () => {
                                                const [weightData, setWeightData] = React.useState(null);
                                                const [loading, setLoading] = React.useState(true);
                                                
                                                React.useEffect(() => {
                                                  hsnWeightService.getHSNWeight(hsn.code)
                                                    .then(data => {
                                                      setWeightData(data);
                                                      setLoading(false);
                                                    })
                                                    .catch(() => {
                                                      setLoading(false);
                                                    });
                                                }, []);
                                                
                                                if (loading) {
                                                  return (
                                                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                                                      ⏳ Loading...
                                                    </span>
                                                  );
                                                }
                                                
                                                if (weightData && weightData.average > 0) {
                                                  return (
                                                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                                      📦 {weightData.min}-{weightData.max}kg (avg: {weightData.average}kg)
                                                    </span>
                                                  );
                                                }
                                                
                                                return (
                                                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                                                    📦 No weight data
                                                  </span>
                                                );
                                              };
                                              
                                              return (
                                            <div
                                              key={hsn.code}
                                              className="p-2 hover:bg-gray-100 rounded cursor-pointer border-l-2 border-transparent hover:border-blue-300"
                                              onClick={async () => {
                                                // Update HSN code and category
                                                let updatedItem = { 
                                                  ...item, 
                                                  hsn_code: hsn.code,
                                                  hsn_category: hsn.category || hsn.subcategory || ''
                                                };
                                                
                                                // Fetch weight data from HSN
                                                try {
                                                  const weightData = await hsnWeightService.getHSNWeight(hsn.code);
                                                  if (weightData && weightData.average > 0) {
                                                    // Store additional weight context for validation
                                                    updatedItem = {
                                                      ...updatedItem,
                                                      weight: weightData.average,
                                                      weight_source: 'HSN Database',
                                                      weight_confidence: weightData.confidence,
                                                      // Add HSN weight range for validation
                                                      hsn_weight_range: {
                                                        min: weightData.min,
                                                        max: weightData.max,
                                                        average: weightData.average,
                                                        packaging: weightData.packaging
                                                      }
                                                    };
                                                    
                                                    // Enhanced toast notification with range
                                                    const totalWeight = weightData.average + (weightData.packaging || 0);
                                                    const rangeDisplay = `Range: ${weightData.min}-${weightData.max}kg`;
                                                    const packagingDisplay = weightData.packaging ? ` + ${weightData.packaging}kg packaging` : '';
                                                    
                                                    toast({
                                                      title: 'Weight Auto-filled from HSN',
                                                      description: `Set to ${weightData.average}kg (${rangeDisplay})${packagingDisplay}. Total: ${totalWeight}kg`,
                                                      variant: 'default'
                                                    });
                                                  }
                                                } catch (error) {
                                                  console.error('Failed to fetch HSN weight:', error);
                                                }
                                                
                                                setItems(items.map(i => 
                                                  i.id === item.id ? updatedItem : i
                                                ));
                                                setHsnSearchOpen(null);
                                                
                                                // Trigger recalculation if weight changed
                                                if (updatedItem.weight !== item.weight) {
                                                  await recalculateQuote(items.map(i => 
                                                    i.id === item.id ? updatedItem : i
                                                  ));
                                                }
                                              }}
                                            >
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                  <p className="font-medium text-sm">{hsn.code}</p>
                                                  {hsn.category && (
                                                    <Badge variant="outline" className="text-xs px-1.5 py-0 h-4 capitalize">
                                                      {hsn.category}
                                                    </Badge>
                                                  )}
                                                  <WeightPreview />
                                                </div>
                                                <p className="text-xs text-gray-500">{hsn.description}</p>
                                                {matchingKeywords.length > 0 && (
                                                  <div className="flex gap-1 mt-1">
                                                    <span className="text-xs text-blue-600">Keywords:</span>
                                                    {matchingKeywords.slice(0, 3).map((keyword, idx) => (
                                                      <Badge key={idx} variant="outline" className="text-xs px-1 py-0 h-4 bg-blue-50 text-blue-700 border-blue-200">
                                                        {keyword}
                                                      </Badge>
                                                    ))}
                                                    {matchingKeywords.length > 3 && (
                                                      <span className="text-xs text-blue-600">+{matchingKeywords.length - 3} more</span>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                              <Badge variant="secondary" className="text-xs">
                                                {hsn.rate}%
                                              </Badge>
                                            </div>
                                            );
                                            });
                                          })()}
                                          
                                          {/* Always show Add New HSN Code button at bottom */}
                                          {!isLoadingHSN && (
                                            <div className="border-t pt-2 mt-2">
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                onClick={() => {
                                                  setNewHSNData({
                                                    code: hsnSearchQuery[item.id] || '',
                                                    product_name: item.product_name,
                                                    weight: item.weight,
                                                    category: item.category
                                                  });
                                                  setShowHSNCreateModal(true);
                                                  setHsnSearchOpen(null);
                                                }}
                                              >
                                                <Plus className="w-3 h-3 mr-2" />
                                                Add New HSN Code
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="space-y-2 flex flex-col items-start">
                                  {/* Tab Style Tax Method Selector */}
                                  <div className="inline-flex items-end gap-4 border-b-2 border-gray-200">
                                    <button
                                      onClick={() => {
                                        const updatedItems = items.map(i => 
                                          i.id === item.id ? { ...i, tax_method: 'hsn' } : i
                                        );
                                        setItems(updatedItems);
                                        recalculateQuote(updatedItems);
                                      }}
                                      className={cn(
                                        "pb-2 text-xs transition-all relative",
                                        item.tax_method === 'hsn' || !item.tax_method
                                          ? "text-orange-600 font-medium" 
                                          : "text-gray-600 hover:text-gray-900"
                                      )}
                                    >
                                      HSN
                                      {(item.tax_method === 'hsn' || !item.tax_method) && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => {
                                        const updatedItems = items.map(i => 
                                          i.id === item.id ? { ...i, tax_method: 'country' } : i
                                        );
                                        setItems(updatedItems);
                                        recalculateQuote(updatedItems);
                                      }}
                                      className={cn(
                                        "pb-2 text-xs transition-all relative",
                                        item.tax_method === 'country' 
                                          ? "text-turquoise-600 font-medium" 
                                          : "text-gray-600 hover:text-gray-900"
                                      )}
                                    >
                                      Country
                                      {item.tax_method === 'country' && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />
                                      )}
                                    </button>
                                    
                                    {item.tax_method === 'manual' ? (
                                      <div className="relative pb-2 animate-in slide-in-from-right-2 fade-in duration-200">
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="number"
                                            value={item.manual_tax_rate || 0}
                                            onChange={(e) => {
                                              const value = parseFloat(e.target.value) || 0;
                                              const updatedItems = items.map(i => 
                                                i.id === item.id ? { ...i, manual_tax_rate: value } : i
                                              );
                                              setItems(updatedItems);
                                              recalculateQuote(updatedItems);
                                            }}
                                            className="w-12 px-1 text-xs text-center text-purple-600 font-medium bg-transparent border-none focus:outline-none"
                                            min="0"
                                            max="100"
                                            step="0.1"
                                          />
                                          <span className="text-xs text-purple-600 font-medium">%</span>
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          const updatedItems = items.map(i => 
                                            i.id === item.id ? { ...i, tax_method: 'manual' } : i
                                          );
                                          setItems(updatedItems);
                                          recalculateQuote(updatedItems);
                                        }}
                                        className={cn(
                                          "pb-2 text-xs transition-all relative",
                                          "text-gray-600 hover:text-gray-900"
                                        )}
                                      >
                                        Manual
                                      </button>
                                    )}
                                  </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        let newMethod = 'actual_price';
                                        if (item.valuation_method === 'actual_price' || !item.valuation_method) {
                                          newMethod = 'minimum_valuation';
                                        } else if (item.valuation_method === 'minimum_valuation') {
                                          newMethod = 'higher_of_both';
                                        }
                                        const updatedItems = items.map(i => 
                                          i.id === item.id ? { ...i, valuation_method: newMethod } : i
                                        );
                                        setItems(updatedItems);
                                        recalculateQuote(updatedItems);
                                      }}
                                      className="absolute inset-0 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                                    />
                                    <span
                                      className={cn(
                                        "absolute h-5 w-5 transform rounded-full transition-all duration-200",
                                        "shadow-sm"
                                      )}
                                      style={{
                                        backgroundColor: (() => {
                                          if (item.valuation_method === 'minimum_valuation') return '#14B8A6'; // Turquoise
                                          if (item.valuation_method === 'higher_of_both') return '#8B5CF6'; // Purple
                                          return '#FB923C'; // Orange
                                        })(),
                                        transform: (() => {
                                          if (item.valuation_method === 'minimum_valuation') return 'translateX(20px)';
                                          if (item.valuation_method === 'higher_of_both') return 'translateX(40px)';
                                          return 'translateX(0)';
                                        })()
                                      }}
                                    />
                                  </div>
                                  <span className="ml-2 text-xs text-gray-600">
                                    {item.valuation_method === 'minimum_valuation' ? 'Min' : 
                                     item.valuation_method === 'higher_of_both' ? 'Higher' : 'Product'}
                                  </span>
                                </div>
                              </td>
                              {orderMode && (
                                <td className="px-2 py-3 text-center">
                                  {item.actual_price ? (
                                    <div className="space-y-1 text-xs">
                                      <div className={cn(
                                        "font-medium",
                                        item.actual_price > item.price ? "text-red-600" : "text-green-600"
                                      )}>
                                        {item.actual_price > item.price ? '+' : '-'}${Math.abs(safeNumber(item.actual_price) - safeNumber(item.price)).toFixed(2)}
                                      </div>
                                      <div className={cn(
                                        "text-gray-500",
                                        item.actual_weight > item.weight ? "text-red-500" : "text-green-500"
                                      )}>
                                        {item.actual_weight > item.weight ? '+' : '-'}{Math.abs((item.actual_weight || 0) - (item.weight || 0)).toFixed(3)}kg
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-xs">Pending</span>
                                  )}
                                </td>
                              )}
                              <td className="px-4 py-4">
                                <div className="flex items-center justify-end gap-1">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="ghost" size="sm" title="View tax breakdown">
                                        <Calculator className="w-4 h-4" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80">
                                      <div className="space-y-3">
                                        <h4 className="font-medium text-sm flex items-center gap-2">
                                          <Calculator className="w-4 h-4" />
                                          Tax Breakdown
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Product Value</span>
                                            <span>${(safeNumber(item.price) * safeNumber(item.quantity, 1)).toFixed(2)}</span>
                                          </div>
                                          {item.customs_amount > 0 && (
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Customs</span>
                                              <span>${safeNumber(item.customs_amount).toFixed(2)}</span>
                                            </div>
                                          )}
                                          {item.sales_tax_amount > 0 && (
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Sales Tax</span>
                                              <span>${safeNumber(item.sales_tax_amount).toFixed(2)}</span>
                                            </div>
                                          )}
                                          {item.destination_tax_amount > 0 && (
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">VAT/GST</span>
                                              <span>${safeNumber(item.destination_tax_amount).toFixed(2)}</span>
                                            </div>
                                          )}
                                          <Separator />
                                          <div className="flex justify-between font-medium">
                                            <span>Total Tax</span>
                                            <span>
                                              ${(
                                                safeNumber(item.customs_amount) + 
                                                safeNumber(item.sales_tax_amount) + 
                                                safeNumber(item.destination_tax_amount)
                                              ).toFixed(2)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      // Delete item
                                      const updatedItems = items.filter(i => i.id !== item.id);
                                      setItems(updatedItems);
                                      recalculateQuote(updatedItems);
                                      toast({
                                        title: "Item Removed",
                                        description: "Item has been removed from the quote."
                                      });
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Costs */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CircleDollarSign className="w-5 h-5" />
                      Additional Costs & Adjustments
                    </CardTitle>
                    <CardDescription>
                      Configure shipping, insurance, handling, and discounts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between">
                            <Label>International Shipping</Label>
                            {availableShippingOptions.length > 0 && (
                              <Select 
                                value={selectedShippingOptionId || ''} 
                                onValueChange={(value) => {
                                  setSelectedShippingOptionId(value);
                                  const option = availableShippingOptions.find(opt => opt.id === value);
                                  if (option) {
                                    setInternationalShipping(option.cost_usd);
                                    // Trigger recalculation with new shipping option
                                    recalculateQuote(items);
                                  }
                                }}
                              >
                                <SelectTrigger className="w-48 h-7">
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
                          <div className="relative mt-2">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <Input 
                              type="number" 
                              className="pl-10 bg-blue-50 border-blue-200"
                              value={internationalShipping}
                              onChange={(e) => setInternationalShipping(Number(e.target.value))}
                              readOnly={availableShippingOptions.length > 0}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-gray-500">International carrier shipping</p>
                            {selectedShippingOptionId && availableShippingOptions.length > 0 && (
                              <p className="text-xs text-blue-600">
                                {availableShippingOptions.find(opt => opt.id === selectedShippingOptionId)?.name || 'Selected'}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <Label>Domestic Shipping</Label>
                          <div className="relative mt-2">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <Input 
                              type="number" 
                              className="pl-10"
                              value={domesticShipping}
                              onChange={(e) => setDomesticShipping(Number(e.target.value))}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Last mile delivery cost</p>
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between">
                            <Label>Handling Fee</Label>
                            <div className="flex items-center gap-2">
                              <Select value={handlingMode} onValueChange={(v: 'auto' | 'manual') => {
                                setHandlingMode(v);
                                if (v === 'auto') {
                                  setHandlingAmount(calculatedHandling);
                                }
                              }}>
                                <SelectTrigger className="w-20 h-7">
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
                                  className="h-7 px-2 text-xs"
                                  onClick={() => setHandlingAmount(calculatedHandling)}
                                >
                                  Use Calculated ({debugData?.currency_symbol || '$'}{calculatedHandling.toFixed(2)})
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="relative mt-2">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <Input 
                              type="number" 
                              className={`pl-10 ${handlingMode === 'auto' ? 'bg-green-50 border-green-200' : ''}`}
                              value={handlingAmount}
                              onChange={(e) => setHandlingAmount(Number(e.target.value))}
                              readOnly={handlingMode === 'auto'}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-gray-500">Order processing & packaging</p>
                            {calculatedHandling > 0 && (
                              <p className={`text-xs ${handlingMode === 'auto' ? 'text-green-600' : 'text-blue-600'}`}>
                                {handlingMode === 'auto' ? 'Auto: Route-based calculation' : `Calculated: ${debugData?.currency_symbol || '$'}${calculatedHandling.toFixed(2)}`}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Label>Insurance</Label>
                              {calculatedInsurance > 0 && (
                                <span className="text-xs text-gray-500">
                                  (calc: {debugData?.currency_symbol || '$'}{calculatedInsurance.toFixed(2)})
                                </span>
                              )}
                              {quote.customer_data?.preferences?.insurance_opted_in && insuranceAmount > 0 && (
                                <Badge variant="secondary" className="text-xs bg-green-50 text-green-700">
                                  Customer Requested
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {calculatedInsurance > 0 && insuranceAmount !== calculatedInsurance && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-7 px-2 text-xs"
                                  onClick={() => setInsuranceAmount(calculatedInsurance)}
                                >
                                  Use Calculated
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="relative mt-2">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <Input 
                              type="number" 
                              className="pl-10"
                              value={insuranceAmount}
                              onChange={(e) => setInsuranceAmount(Number(e.target.value))}
                              placeholder="0.00"
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-gray-500">Loss/damage protection</p>
                            {insuranceAmount > 0 && (
                              <p className="text-xs text-green-600">
                                Active: {debugData?.currency_symbol || '$'}{insuranceAmount.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div>
                          <Label>Discount</Label>
                          <div className="flex gap-2 mt-2">
                            <div className="relative flex-1">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                              <Input 
                                type="number" 
                                className="pl-10"
                                placeholder="0.00"
                                value={discountAmount}
                                onChange={(e) => setDiscountAmount(Number(e.target.value))}
                              />
                            </div>
                            <Select defaultValue="amount">
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="amount">Amount</SelectItem>
                                <SelectItem value="percent">Percent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Subtotal</p>
                          <p className="font-medium">
                            ${items.reduce((sum, item) => sum + (safeNumber(item.price) * safeNumber(item.quantity, 1)), 0).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Shipping & Fees</p>
                          <p className="font-medium">
                            ${(
                              safeNumber(internationalShipping) +
                              safeNumber(domesticShipping) + 
                              safeNumber(handlingAmount) + 
                              safeNumber(insuranceAmount)
                            ).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Discount</p>
                          <p className="font-medium text-red-600">-${safeNumber(discountAmount).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Impact on Total</p>
                          <p className="font-medium text-green-600">
                            ${(
                              items.reduce((sum, item) => sum + (safeNumber(item.price) * safeNumber(item.quantity, 1)), 0) +
                              safeNumber(internationalShipping) +
                              safeNumber(domesticShipping) + 
                              safeNumber(handlingAmount) + 
                              safeNumber(insuranceAmount) -
                              safeNumber(discountAmount)
                            ).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
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
                            <span className="font-medium">{quote.origin_country || 'US'}</span>
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
                                    <p className="font-semibold">${option.cost_usd.toFixed(2)}</p>
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
          <div className="col-span-4 space-y-6">
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
                  <Button 
                    variant="outline" 
                    className="w-full"
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

            {/* 🔧 DEBUG DISPLAY - Calculation Breakdown */}
            {debugData && (
              <Card className="mt-4 border-cyan-200 bg-cyan-50/20">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-600" />
                    🔧 Calculation Debug Data
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Last calculation: {debugData.calculation_timestamp}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Route & Currency */}
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="text-xs font-medium text-gray-600 mb-2">Route & Currency</div>
                    <div className="space-y-1 text-xs">
                      <div><strong>Route:</strong> {debugData.route}</div>
                      <div><strong>Currency:</strong> {debugData.currency_used}</div>
                    </div>
                  </div>

                  {/* Live Calculation Breakdown */}
                  {debugData?.calculation_breakdown && (
                    <div className="bg-white p-3 rounded-lg border">
                      <div className="text-xs font-medium text-gray-600 mb-2">💰 Live Cost Breakdown</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span><strong>Items:</strong></span>
                          <span>{debugData?.currency_symbol || '$'}{debugData.calculation_breakdown.items_total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span><strong>Shipping:</strong></span>
                          <span>{debugData?.currency_symbol || '$'}{debugData.calculation_breakdown.shipping}</span>
                        </div>
                      <div className="flex justify-between">
                        <span><strong>Handling:</strong></span>
                        <span className={handlingMode === 'auto' && calculatedHandling > 0 ? 'text-green-600 font-semibold' : ''}>{debugData?.currency_symbol || '$'}{handlingAmount.toFixed(2)} {handlingMode === 'manual' && calculatedHandling > 0 && calculatedHandling !== handlingAmount ? '(calc: ' + (debugData?.currency_symbol || '$') + calculatedHandling.toFixed(2) + ')' : ''}</span>
                      </div>
                      <div className="flex justify-between">
                        <span><strong>Insurance:</strong></span>
                        <span className={calculatedInsurance > 0 && calculatedInsurance === insuranceAmount ? 'text-green-600 font-semibold' : ''}>{debugData?.currency_symbol || '$'}{insuranceAmount.toFixed(2)} {calculatedInsurance > 0 && calculatedInsurance !== insuranceAmount ? '(calc: ' + (debugData?.currency_symbol || '$') + calculatedInsurance.toFixed(2) + ')' : ''}</span>
                      </div>
                      <div className="flex justify-between">
                        <span><strong>Customs:</strong></span>
                        <span>{debugData?.currency_symbol || '$'}{debugData.calculation_breakdown.customs}</span>
                      </div>
                      <div className="flex justify-between">
                        <span><strong>Taxes:</strong></span>
                        <span>{debugData?.currency_symbol || '$'}{debugData.calculation_breakdown.taxes}</span>
                        </div>
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
                  {debugData.shipping_data && (
                    <div className="bg-white p-3 rounded-lg border">
                      <div className="text-xs font-medium text-gray-600 mb-2">🚢 Shipping Options</div>
                      <div className="space-y-1 text-xs">
                        <div><strong>Available Options:</strong> {debugData.shipping_data.options_count}</div>
                        {debugData.shipping_data.selected_option && (
                          <div><strong>Selected:</strong> {debugData.shipping_data.selected_option.carrier} - {debugData.shipping_data.selected_option.name}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Configuration Status */}
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="text-xs font-medium text-gray-600 mb-2">⚙️ Config Status</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${debugData.config_status.has_handling_config ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <strong>Handling Config:</strong> {debugData.config_status.has_handling_config ? 'Found' : 'Missing'}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${debugData.config_status.has_insurance_config ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <strong>Insurance Config:</strong> {debugData.config_status.has_insurance_config ? 'Found' : 'Missing'}
                      </div>
                      <div><strong>Delivery Options:</strong> {debugData.config_status.delivery_options_count}</div>
                    </div>
                  </div>

                  {/* HSN Data */}
                  {debugData.hsn_data && (
                    <div className="bg-white p-3 rounded-lg border">
                      <div className="text-xs font-medium text-gray-600 mb-2">🏷️ HSN Tax Data</div>
                      <div className="space-y-1 text-xs">
                        <div><strong>Items Processed:</strong> {debugData.hsn_data.items_processed}</div>
                        <div><strong>Method:</strong> {debugData.hsn_data.calculation_method}</div>
                        <div><strong>HSN Customs:</strong> {debugData.hsn_data.total_customs}</div>
                        <div><strong>HSN Local Tax:</strong> {debugData.hsn_data.total_local_taxes}</div>
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
          if (hsnData.weight_data?.typical_weights?.per_unit?.average) {
            const weight_avg = hsnData.weight_data.typical_weights.per_unit.average;
            const itemId = Object.keys(hsnSearchQuery).find(id => hsnSearchQuery[id] === hsnData.hsn_code);
            if (itemId) {
              setItems(items.map(item => 
                item.id === itemId 
                  ? { 
                      ...item, 
                      weight: weight_avg,
                      weight_source: 'HSN Database',
                      weight_confidence: 1.0,
                      hsn_code: hsnData.hsn_code 
                    } 
                  : item
              ));
            }
          }
          
          // Refresh HSN codes list
          const allRecords = await unifiedDataEngine.getAllHSNRecords(200);
          setHsnCodes(allRecords.map(hsn => ({
            code: hsn.hsn_code,
            description: hsn.description,
            rate: hsn.tax_data?.typical_rates?.customs?.common || 0
          })));
          
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