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
import { smartCalculationEngine } from '@/services/SmartCalculationEngine';
import { currencyService } from '@/services/CurrencyService';
import { smartWeightEstimator } from '@/services/SmartWeightEstimator';
import { 
  Package,
  User,
  Calendar,
  Clock,
  DollarSign,
  Calculator,
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
  Loader2
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

// HSN code database
const hsnCodes = [
  { code: '8517', description: 'Telephone sets, including smartphones', rate: 22 },
  { code: '8518', description: 'Microphones, headphones, earphones', rate: 20 },
  { code: '8471', description: 'Automatic data processing machines', rate: 18 },
  { code: '6204', description: "Women's suits, dresses, skirts", rate: 12 },
  { code: '6109', description: 'T-shirts, singlets and vests', rate: 12 },
  { code: '4202', description: 'Trunks, suitcases, vanity cases', rate: 18 }
];

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
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValues, setTempValues] = useState<Record<string, any>>({});
  const [purchaseDialogItem, setPurchaseDialogItem] = useState<any>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Initialize quote data from props
  const [quote, setQuote] = useState(propQuote || {});
  const [items, setItems] = useState(quote?.items || []);
  const [hsnSearchOpen, setHsnSearchOpen] = useState<string | null>(null);
  const [hsnSearchQuery, setHsnSearchQuery] = useState('');
  const [notesPopoverOpen, setNotesPopoverOpen] = useState<string | null>(null);
  const [insuranceMode, setInsuranceMode] = useState<'auto' | 'manual'>(
    quote?.insurance_mode || 'auto'
  );
  const [manualInsurance, setManualInsurance] = useState(quote?.insurance || 0);
  const [domesticShipping, setDomesticShipping] = useState(
    quote?.calculation_metadata?.domestic_shipping || 0
  );
  const [handlingFee, setHandlingFee] = useState(quote?.handling || 0);
  const [discount, setDiscount] = useState(quote?.discount || 0);
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [customerNotes, setCustomerNotes] = useState(quote?.customer_notes || '');
  const [internalNotes, setInternalNotes] = useState(quote?.internal_notes || '');
  const [globalTaxMethod, setGlobalTaxMethod] = useState(quote?.tax_method || 'per_item');
  const [globalValuationMethod, setGlobalValuationMethod] = useState(
    quote?.valuation_method || 'auto'
  );
  const [calculationData, setCalculationData] = useState(quote?.calculation_data || null);
  const [displayCurrency, setDisplayCurrency] = useState(null);

  // Load currency data
  useEffect(() => {
    const loadCurrency = async () => {
      if (quote?.destination_country) {
        const currency = await currencyService.getCurrency(quote.destination_country);
        setDisplayCurrency(currency);
      }
    };
    loadCurrency();
  }, [quote?.destination_country]);

  const StatusIcon = statusConfig[quote.status as keyof typeof statusConfig]?.icon || FileText;
  const statusColor = statusConfig[quote.status as keyof typeof statusConfig]?.color || 'bg-gray-500';

  // Check if we're in order mode
  const orderMode = isOrderMode(quote.status);

  // Calculate days until expiry
  const daysUntilExpiry = quote.expires_at ? Math.ceil(
    (new Date(quote.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  ) : null;

  // Filter HSN codes based on search
  const filteredHsnCodes = useMemo(() => {
    if (!hsnSearchQuery) return hsnCodes;
    const query = hsnSearchQuery.toLowerCase();
    return hsnCodes.filter(hsn => 
      hsn.code.includes(query) || 
      hsn.description.toLowerCase().includes(query)
    );
  }, [hsnSearchQuery]);

  // Convert amount to display currency
  const convertToDisplayCurrency = useCallback((amount: number) => {
    if (!displayCurrency || displayCurrency.code === 'USD') return amount;
    return amount * (displayCurrency.rate || 1);
  }, [displayCurrency]);

  // Format amount in display currency
  const formatDisplayAmount = useCallback((amount: number) => {
    const converted = convertToDisplayCurrency(amount);
    return `${displayCurrency?.symbol || '$'}${converted.toFixed(2)}`;
  }, [displayCurrency, convertToDisplayCurrency]);

  // Calculate insurance
  const calculateInsurance = useCallback(() => {
    const subtotal = calculationData?.breakdown?.subtotal || quote.subtotal || 0;
    return (subtotal * 0.01);
  }, [calculationData, quote.subtotal]);

  // Calculate actual discount amount
  const calculateDiscountAmount = useCallback(() => {
    if (!discount) return 0;
    if (discountType === 'percent') {
      const subtotal = calculationData?.breakdown?.subtotal || quote.subtotal || 0;
      return (subtotal * discount / 100);
    }
    return discount;
  }, [discount, discountType, calculationData, quote.subtotal]);

  // Recalculate quote when items or settings change
  const recalculateQuote = useCallback(async (
    updatedItems: any[] = items,
    options: any = {}
  ) => {
    try {
      setIsRecalculating(true);
      
      const calculationResult = await smartCalculationEngine.calculateQuote({
        quote: {
          id: quote.id,
          items: updatedItems.map(item => ({
            name: item.product_name,
            costprice_origin: item.price,
            quantity: item.quantity || 1,
            weight: item.weight,
            hsn_code: item.hsn_code,
            category: item.category,
            tax_method: item.tax_method || globalTaxMethod,
            valuation_method: item.valuation_method || globalValuationMethod,
            minimum_valuation_usd: item.minimum_valuation_usd,
            actual_price: item.actual_price || item.price
          })),
          destination_country: quote.destination_country || 'IN',
          origin_country: quote.origin_country || 'US',
          shipping_method: quote.shipping_method || 'standard',
          domestic_shipping: domesticShipping,
          handling: handlingFee,
          insurance: insuranceMode === 'manual' ? manualInsurance : calculateInsurance(),
          discount: calculateDiscountAmount(),
          ...options
        },
        preferences: {
          speed_priority: 'medium',
          cost_priority: 'medium',
          show_all_options: true
        }
      });

      setCalculationData(calculationResult);

      // Update parent with new calculation
      if (onUpdate) {
        onUpdate({
          items: updatedItems,
          calculation_data: calculationResult,
          final_total_usd: calculationResult.totals?.final_total || 0,
          tax_method: globalTaxMethod,
          valuation_method: globalValuationMethod,
          insurance_mode: insuranceMode,
          insurance: insuranceMode === 'manual' ? manualInsurance : calculateInsurance(),
          discount,
          discount_type: discountType,
          handling: handlingFee,
          domestic_shipping: domesticShipping
        });
      }

      return calculationResult;
    } catch (error) {
      console.error('Error recalculating quote:', error);
      toast({
        title: 'Calculation Error',
        description: 'Failed to recalculate quote. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsRecalculating(false);
    }
  }, [
    items, quote, globalTaxMethod, globalValuationMethod, domesticShipping,
    handlingFee, insuranceMode, manualInsurance, calculateInsurance,
    calculateDiscountAmount, discount, discountType, onUpdate, toast
  ]);

  // Update item field
  const updateItemField = useCallback((itemId: string, field: string, value: any) => {
    const updatedItems = items.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    );
    setItems(updatedItems);
    
    // Trigger recalculation for relevant fields
    if (['price', 'weight', 'hsn_code', 'quantity', 'tax_method', 'valuation_method'].includes(field)) {
      recalculateQuote(updatedItems);
    }
    
    // Update parent
    if (onUpdate) {
      onUpdate({ items: updatedItems });
    }
  }, [items, recalculateQuote, onUpdate]);

  // Update quote status
  const updateQuoteStatus = useCallback((newStatus: string) => {
    const previousStatus = quote.status;
    setQuote({ ...quote, status: newStatus });
    
    // Add activity log entry
    const newActivity = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      user: isAdmin ? 'Admin' : 'System',
      action: `Status changed from ${previousStatus} to ${newStatus}`,
      type: 'status'
    };
    
    const updatedActivities = [...(quote.activities || []), newActivity];
    
    if (onUpdate) {
      onUpdate({
        status: newStatus,
        activities: updatedActivities
      });
    }
    
    toast({
      title: 'Status Updated',
      description: `Quote status changed to ${newStatus}`
    });
  }, [quote, isAdmin, onUpdate, toast]);

  // Save all changes
  const saveAllChanges = useCallback(async () => {
    try {
      setIsSaving(true);
      
      // Prepare all updates
      const updates = {
        items,
        tax_method: globalTaxMethod,
        valuation_method: globalValuationMethod,
        insurance_mode: insuranceMode,
        insurance: insuranceMode === 'manual' ? manualInsurance : calculateInsurance(),
        discount,
        discount_type: discountType,
        handling: handlingFee,
        domestic_shipping: domesticShipping,
        customer_notes: customerNotes,
        internal_notes: internalNotes,
        admin_notes: internalNotes,
        calculation_data: calculationData
      };
      
      // Call parent update
      if (onUpdate) {
        onUpdate(updates);
      }
      
      toast({
        title: 'Changes Saved',
        description: 'All changes have been saved successfully.'
      });
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save changes. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    items, globalTaxMethod, globalValuationMethod, insuranceMode, manualInsurance,
    calculateInsurance, discount, discountType, handlingFee, domesticShipping,
    customerNotes, internalNotes, calculationData, onUpdate, toast
  ]);

  // Handle quick actions
  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'duplicate':
        if (onUpdate) {
          onUpdate({ action: 'duplicate' });
        }
        break;
      case 'convert_to_order':
        updateQuoteStatus('paid');
        break;
      case 'extend_expiry':
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 7);
        if (onUpdate) {
          onUpdate({ expires_at: newExpiry.toISOString() });
        }
        toast({
          title: 'Expiry Extended',
          description: 'Quote expiry extended by 7 days'
        });
        break;
      case 'delete':
        if (window.confirm('Are you sure you want to delete this quote?')) {
          if (onUpdate) {
            onUpdate({ action: 'delete' });
          }
        }
        break;
    }
  }, [onUpdate, updateQuoteStatus, toast]);

  // Handle order actions
  const handleOrderAction = useCallback((action: string) => {
    switch (action) {
      case 'payment_link':
        if (onUpdate) {
          onUpdate({ action: 'generate_payment_link' });
        }
        break;
      case 'issue_refund':
        if (onUpdate) {
          onUpdate({ action: 'issue_refund' });
        }
        break;
      case 'upload_receipt':
        // Trigger file upload
        break;
      case 'update_tracking':
        // Open tracking dialog
        break;
      case 'download_invoice':
        if (onUpdate) {
          onUpdate({ action: 'download_invoice' });
        }
        break;
      case 'cancel_order':
        if (window.confirm('Are you sure you want to cancel this order?')) {
          updateQuoteStatus('cancelled');
        }
        break;
    }
  }, [onUpdate, updateQuoteStatus]);

  // Inline edit handlers
  const startEdit = (fieldId: string, currentValue: any) => {
    setEditingField(fieldId);
    setTempValues({ ...tempValues, [fieldId]: currentValue });
  };

  const saveEdit = async (fieldId: string, itemId?: string) => {
    // Update items if it's an item field
    if (itemId) {
      const [field] = fieldId.split('-');
      updateItemField(itemId, field, tempValues[fieldId]);
    }
    
    setEditingField(null);
    setTempValues({});
  };

  const cancelEdit = () => {
    setEditingField(null);
    setTempValues({});
  };

  // Render inline editable field
  const InlineEdit = ({ 
    fieldId, 
    value, 
    type = 'text', 
    prefix = '', 
    suffix = '',
    className = '',
    itemId,
    validator
  }: any) => {
    const isEditing = editingField === fieldId;

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          {prefix && <span className="text-gray-500">{prefix}</span>}
          <Input
            type={type}
            value={tempValues[fieldId] || value}
            onChange={(e) => {
              const newValue = e.target.value;
              if (!validator || validator(newValue)) {
                setTempValues({ ...tempValues, [fieldId]: newValue });
              }
            }}
            className={cn("h-7 w-20", className)}
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
        <span>{value || '-'}</span>
        {suffix && <span className="text-gray-500">{suffix}</span>}
        <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-50" />
      </div>
    );
  };

  // Get weight suggestions
  const getWeightSuggestions = useCallback(async (itemName: string) => {
    try {
      const suggestions = await smartWeightEstimator.getWeightSuggestions(itemName);
      return suggestions;
    } catch (error) {
      console.error('Error getting weight suggestions:', error);
      return null;
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto">
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
                    {orderMode ? 'Order' : 'Quote'} {quote.tracking_id || quote.id}
                  </h1>
                  <Badge className={cn(statusColor, 'text-white')}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig[quote.status as keyof typeof statusConfig]?.label}
                  </Badge>
                  {!orderMode && daysUntilExpiry !== null && daysUntilExpiry <= 3 && (
                    <Badge variant="destructive">
                      <Clock className="w-3 h-3 mr-1" />
                      Expires in {daysUntilExpiry} days
                    </Badge>
                  )}
                  {isAdmin && (
                    <Select value={quote.status} onValueChange={updateQuoteStatus}>
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Created on {quote.created_at ? format(new Date(quote.created_at), 'PPP') : 'N/A'} • 
                  Last updated {quote.updated_at ? format(new Date(quote.updated_at), 'p') : 'N/A'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {orderMode && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleOrderAction('payment_link')}
                  >
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Payment Link
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleOrderAction('issue_refund')}
                  >
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Issue Refund
                  </Button>
                </>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onUpdate?.({ action: 'export' })}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <ShareQuoteButtonV2
                quote={{
                  id: quote.id,
                  display_id: quote.display_id || quote.id,
                  status: quote.status,
                  share_token: quote.share_token,
                  customer_data: quote.customer,
                  items: quote.items,
                  final_total_usd: calculationData?.totals?.final_total || quote.total || 0,
                  calculation_data: calculationData
                }}
                onShareUpdate={(shareData) => {
                  if (onUpdate) {
                    onUpdate({
                      share_token: shareData.share_token
                    });
                  }
                }}
              />
              <Button 
                size="sm"
                onClick={() => onUpdate?.({ action: 'send_to_customer' })}
              >
                <Send className="w-4 h-4 mr-2" />
                {orderMode ? 'Send Update' : 'Send to Customer'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
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
                              {quote.customer?.customer_since 
                                ? format(new Date(quote.customer.customer_since), 'PP')
                                : 'N/A'}
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

                {/* Smart Recommendations */}
                {!orderMode && quote.smart_suggestions && (
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
                        {(quote.smart_suggestions || []).map((rec: any, index: number) => (
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
                              <p className="text-sm font-medium">{rec.message}</p>
                              {rec.impact && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Potential impact: <span className="font-medium text-green-600">{rec.impact}</span>
                                </p>
                              )}
                            </div>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => {
                                if (rec.action && onUpdate) {
                                  onUpdate({ apply_suggestion: rec });
                                }
                              }}
                            >
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
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => window.open(item.receipt_url, '_blank')}
                                  >
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
                                      ${Math.abs(item.actual_price - item.price).toFixed(2)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">Weight Variance</p>
                                    <p className={cn(
                                      "font-medium",
                                      item.actual_weight > item.weight ? "text-red-600" : "text-green-600"
                                    )}>
                                      {item.actual_weight > item.weight ? '+' : '-'}
                                      {Math.abs(item.actual_weight - item.weight).toFixed(3)}kg
                                    </p>
                                  </div>
                                </div>

                                {item.actual_price > item.price && (
                                  <Alert className="mt-3">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                      Price increased by ${(item.actual_price - item.price).toFixed(2)}. 
                                      <Button 
                                        variant="link" 
                                        size="sm" 
                                        className="px-2"
                                        onClick={() => handleOrderAction('payment_link')}
                                      >
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
                                    <span className="ml-1 font-medium">${item.price.toFixed(2)}</span>
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
                              <p className="font-medium">
                                {quote.payment?.purchase?.method || 'Company Card'} 
                                ****{quote.payment?.purchase?.card_last4 || '4242'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Amount</p>
                              <p className="font-medium">
                                ${quote.payment?.purchase?.amount || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Date</p>
                              <p className="font-medium">
                                {quote.payment?.purchase?.purchased_at
                                  ? format(new Date(quote.payment.purchase.purchased_at), 'PP')
                                  : 'Pending'}
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
                              {formatDisplayAmount(quote.payment?.customer?.amount || 0)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {quote.payment?.customer?.paid_at 
                                ? `Paid on ${format(new Date(quote.payment.customer.paid_at), 'PP')}`
                                : 'Payment pending'}
                            </p>
                          </div>
                          <div className="p-4 bg-red-50 rounded-lg">
                            <p className="text-sm text-gray-600">Additional Due</p>
                            <p className="text-2xl font-bold text-red-600">
                              {formatDisplayAmount(quote.additional_due || 0)}
                            </p>
                            {quote.additional_due > 0 && (
                              <Button 
                                size="sm" 
                                className="mt-2"
                                onClick={() => handleOrderAction('payment_link')}
                              >
                                <LinkIcon className="w-3 h-3 mr-1" />
                                Generate Link
                              </Button>
                            )}
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
                                <span className="font-mono text-xs">
                                  ID: {quote.payment.customer.payment_id}
                                </span>
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
                          value={globalTaxMethod} 
                          onValueChange={(value) => {
                            setGlobalTaxMethod(value);
                            recalculateQuote(items, { tax_method: value });
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
                          value={globalValuationMethod}
                          onValueChange={(value) => {
                            setGlobalValuationMethod(value);
                            recalculateQuote(items, { valuation_method: value });
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
                            if (onUpdate) {
                              onUpdate({ action: 'add_item' });
                            }
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Item
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="text-left px-4 py-3 font-medium text-gray-900 text-sm">Product</th>
                            <th className="text-center px-4 py-3 font-medium text-gray-900 text-sm">Price & Qty</th>
                            <th className="text-center px-4 py-3 font-medium text-gray-900 text-sm">Weight & HSN</th>
                            <th className="text-center px-4 py-3 font-medium text-gray-900 text-sm">Tax Method</th>
                            <th className="text-center px-4 py-3 font-medium text-gray-900 text-sm">Valuation</th>
                            {orderMode && (
                              <th className="text-center px-4 py-3 font-medium text-gray-900 text-sm">Variance</th>
                            )}
                            <th className="text-center px-4 py-3 font-medium text-gray-900 text-sm">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {items.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  {item.image_url && (
                                    <img 
                                      src={item.image_url} 
                                      alt={item.product_name}
                                      className="w-10 h-10 object-cover rounded"
                                    />
                                  )}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <InlineEdit
                                        fieldId={`product_name-${item.id}`}
                                        value={item.product_name}
                                        className="w-full max-w-xs"
                                        itemId={item.id}
                                      />
                                      {item.customer_notes && (
                                        <Popover open={notesPopoverOpen === item.id} onOpenChange={(open) => setNotesPopoverOpen(open ? item.id : null)}>
                                          <PopoverTrigger>
                                            <Badge variant="secondary" className="cursor-pointer">
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
                                    <a href={item.product_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
                                      View source <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <div className="space-y-1">
                                  <InlineEdit
                                    fieldId={`price-${item.id}`}
                                    value={item.price}
                                    type="number"
                                    prefix="$"
                                    itemId={item.id}
                                    validator={(v: string) => parseFloat(v) >= 0}
                                  />
                                  <div className="text-xs text-gray-500">
                                    × <InlineEdit
                                      fieldId={`quantity-${item.id}`}
                                      value={item.quantity}
                                      type="number"
                                      className="w-12"
                                      itemId={item.id}
                                      validator={(v: string) => parseInt(v) > 0}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <div className="space-y-1">
                                  <InlineEdit
                                    fieldId={`weight-${item.id}`}
                                    value={item.weight}
                                    type="number"
                                    suffix="kg"
                                    className="w-16"
                                    itemId={item.id}
                                    validator={(v: string) => parseFloat(v) >= 0}
                                  />
                                  <Popover open={hsnSearchOpen === item.id} onOpenChange={(open) => {
                                    setHsnSearchOpen(open ? item.id : null);
                                    if (!open) setHsnSearchQuery('');
                                  }}>
                                    <PopoverTrigger>
                                      <Badge variant="outline" className="cursor-pointer text-xs">
                                        {item.hsn_code || 'Select HSN'}
                                      </Badge>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80">
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2 pb-2">
                                          <Search className="w-4 h-4 text-gray-500" />
                                          <Input 
                                            placeholder="Search HSN code or description..." 
                                            className="h-8 flex-1"
                                            value={hsnSearchQuery}
                                            onChange={(e) => setHsnSearchQuery(e.target.value)}
                                            autoFocus
                                          />
                                        </div>
                                        <div className="space-y-1 max-h-64 overflow-y-auto">
                                          {filteredHsnCodes.map((hsn) => (
                                            <div
                                              key={hsn.code}
                                              className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer"
                                              onClick={() => {
                                                updateItemField(item.id, 'hsn_code', hsn.code);
                                                setHsnSearchOpen(null);
                                                setHsnSearchQuery('');
                                              }}
                                            >
                                              <div>
                                                <p className="font-medium text-sm">{hsn.code}</p>
                                                <p className="text-xs text-gray-500">{hsn.description}</p>
                                              </div>
                                              <Badge variant="secondary" className="text-xs">
                                                {hsn.rate}%
                                              </Badge>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <Select 
                                  value={item.tax_method || globalTaxMethod}
                                  onValueChange={(value) => updateItemField(item.id, 'tax_method', value)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="hsn">HSN</SelectItem>
                                    <SelectItem value="country">Country</SelectItem>
                                    <SelectItem value="manual">Manual</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <Select 
                                  value={item.valuation_method || globalValuationMethod}
                                  onValueChange={(value) => updateItemField(item.id, 'valuation_method', value)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="product_value">Product</SelectItem>
                                    <SelectItem value="minimum_valuation">Minimum</SelectItem>
                                    <SelectItem value="higher_of_both">Higher</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              {orderMode && (
                                <td className="px-4 py-4 text-center">
                                  {item.actual_price ? (
                                    <div className="space-y-1 text-xs">
                                      <div className={cn(
                                        "font-medium",
                                        item.actual_price > item.price ? "text-red-600" : "text-green-600"
                                      )}>
                                        {item.actual_price > item.price ? '+' : '-'}${Math.abs(item.actual_price - item.price).toFixed(2)}
                                      </div>
                                      <div className={cn(
                                        "text-gray-500",
                                        item.actual_weight > item.weight ? "text-red-500" : "text-green-500"
                                      )}>
                                        {item.actual_weight > item.weight ? '+' : '-'}{Math.abs(item.actual_weight - item.weight).toFixed(3)}kg
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-xs">Pending</span>
                                  )}
                                </td>
                              )}
                              <td className="px-4 py-4 text-center">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    if (window.confirm('Remove this item?')) {
                                      const updatedItems = items.filter(i => i.id !== item.id);
                                      setItems(updatedItems);
                                      recalculateQuote(updatedItems);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
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
                          <Label>Domestic Shipping</Label>
                          <div className="relative mt-2">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <Input 
                              type="number" 
                              className="pl-10"
                              value={domesticShipping}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                setDomesticShipping(value);
                                recalculateQuote(items, { domestic_shipping: value });
                              }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Last mile delivery cost</p>
                        </div>
                        
                        <div>
                          <Label>Handling Fee</Label>
                          <div className="relative mt-2">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <Input 
                              type="number" 
                              className="pl-10"
                              value={handlingFee}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                setHandlingFee(value);
                                recalculateQuote(items, { handling: value });
                              }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Order processing & packaging</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between">
                            <Label>Insurance</Label>
                            <Select value={insuranceMode} onValueChange={(v: 'auto' | 'manual') => {
                              setInsuranceMode(v);
                              if (v === 'auto') {
                                recalculateQuote();
                              }
                            }}>
                              <SelectTrigger className="w-24 h-7">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="auto">Auto</SelectItem>
                                <SelectItem value="manual">Manual</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="relative mt-2">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <Input 
                              type="number" 
                              className="pl-10"
                              value={insuranceMode === 'auto' ? calculateInsurance() : manualInsurance}
                              onChange={(e) => {
                                if (insuranceMode === 'manual') {
                                  const value = parseFloat(e.target.value) || 0;
                                  setManualInsurance(value);
                                  recalculateQuote(items, { insurance: value });
                                }
                              }}
                              readOnly={insuranceMode === 'auto'}
                            />
                          </div>
                          {insuranceMode === 'auto' && (
                            <p className="text-xs text-green-600 mt-1">Auto: 1% of order value</p>
                          )}
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
                                value={discount}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0;
                                  setDiscount(value);
                                  recalculateQuote();
                                }}
                              />
                            </div>
                            <Select value={discountType} onValueChange={(value: 'amount' | 'percent') => {
                              setDiscountType(value);
                              recalculateQuote();
                            }}>
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
                            {formatDisplayAmount(calculationData?.breakdown?.subtotal || quote.subtotal || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Additional Costs</p>
                          <p className="font-medium">
                            {formatDisplayAmount(
                              domesticShipping + 
                              handlingFee + 
                              (insuranceMode === 'manual' ? manualInsurance : calculateInsurance())
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Discount</p>
                          <p className="font-medium text-red-600">
                            -{formatDisplayAmount(calculateDiscountAmount())}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Impact on Total</p>
                          <p className="font-medium text-green-600">
                            {formatDisplayAmount(calculationData?.totals?.final_total || quote.total || 0)}
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
                          {quote.shipping_route && quote.shipping_route.includes('→') && (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">
                                  {quote.shipping_route.split('→')[1]?.trim()}
                                </span>
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                              </div>
                              <div className="flex-1 mx-4 border-t-2 border-dashed border-gray-300"></div>
                            </>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{quote.destination_country || 'IN'}</span>
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>

                      {/* Shipping Options */}
                      {quote.shipping_options && quote.shipping_options.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="font-medium">Available Shipping Options</h3>
                          <div className="grid grid-cols-1 gap-3">
                            {quote.shipping_options.map((option: any, index: number) => (
                              <div 
                                key={index}
                                className={cn(
                                  "border rounded-lg p-4 cursor-pointer transition-all",
                                  option.is_selected && "border-blue-500 bg-blue-50"
                                )}
                                onClick={() => {
                                  if (onUpdate) {
                                    onUpdate({ 
                                      shipping_method: option.service_name,
                                      shipping_cost: option.total_cost 
                                    });
                                  }
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium">{option.service_name}</h4>
                                    <p className="text-sm text-gray-500">
                                      {option.delivery_estimate}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">
                                      {formatDisplayAmount(option.total_cost)}
                                    </p>
                                    {option.is_recommended && (
                                      <Badge variant="secondary" className="text-xs">
                                        Recommended
                                      </Badge>
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
                          <Textarea 
                            placeholder="Add any notes that will be visible to the customer..."
                            className="mt-2"
                            rows={3}
                            value={customerNotes}
                            onChange={(e) => setCustomerNotes(e.target.value)}
                          />
                          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            Visible to customer on quote
                          </p>
                        </div>
                        
                        <div>
                          <Label>Internal Notes</Label>
                          <Textarea 
                            placeholder="Private notes for internal reference..."
                            className="mt-2"
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
                      {(quote.activities || []).map((activity: any, index: number) => (
                        <div key={activity.id} className="flex gap-4">
                          <div className="relative">
                            {index < (quote.activities || []).length - 1 && (
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
                              {format(new Date(activity.timestamp), 'PPpp')}
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
                  adminMode={isAdmin}
                  onNewMessage={(message) => {
                    // Add activity log entry for new message
                    const newActivity = {
                      id: Date.now().toString(),
                      timestamp: new Date().toISOString(),
                      user: isAdmin ? 'Admin' : 'Customer',
                      action: 'Sent a message',
                      type: 'message'
                    };
                    
                    if (onUpdate) {
                      onUpdate({
                        activities: [...(quote.activities || []), newActivity]
                      });
                    }
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="col-span-4 space-y-6">
            {/* Price Summary */}
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
                    <span>{formatDisplayAmount(calculationData?.breakdown?.subtotal || quote.subtotal || 0)}</span>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    {(calculationData?.breakdown?.shipping || quote.shipping || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Shipping</span>
                        <span>{formatDisplayAmount(calculationData?.breakdown?.shipping || quote.shipping || 0)}</span>
                      </div>
                    )}
                    {(calculationData?.breakdown?.customs || quote.customs || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Customs ({((calculationData?.tax_rates?.customs || quote.tax_rates?.customs || 0) * 100).toFixed(0)}%)
                        </span>
                        <span>{formatDisplayAmount(calculationData?.breakdown?.customs || quote.customs || 0)}</span>
                      </div>
                    )}
                    {(calculationData?.breakdown?.sales_tax || quote.sales_tax || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sales Tax</span>
                        <span>{formatDisplayAmount(calculationData?.breakdown?.sales_tax || quote.sales_tax || 0)}</span>
                      </div>
                    )}
                    {(calculationData?.breakdown?.destination_tax || quote.destination_tax || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          VAT/GST ({((calculationData?.tax_rates?.destination_tax || quote.tax_rates?.destination_tax || 0) * 100).toFixed(0)}%)
                        </span>
                        <span>{formatDisplayAmount(calculationData?.breakdown?.destination_tax || quote.destination_tax || 0)}</span>
                      </div>
                    )}
                    {handlingFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Handling</span>
                        <span>{formatDisplayAmount(handlingFee)}</span>
                      </div>
                    )}
                    {(insuranceMode === 'manual' ? manualInsurance : calculateInsurance()) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Insurance</span>
                        <span>{formatDisplayAmount(insuranceMode === 'manual' ? manualInsurance : calculateInsurance())}</span>
                      </div>
                    )}
                    {calculateDiscountAmount() > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Discount</span>
                        <span className="text-red-600">-{formatDisplayAmount(calculateDiscountAmount())}</span>
                      </div>
                    )}
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{formatDisplayAmount(calculationData?.totals?.final_total || quote.total || 0)}</span>
                  </div>

                  {/* Margin Analysis for Orders */}
                  {orderMode && quote.margin && (
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
                            <span className="font-medium">
                              {formatDisplayAmount(quote.margin.selling_price || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Purchase Cost</span>
                            <span className="text-red-600">
                              -{formatDisplayAmount(quote.margin.actual_purchase || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">All Expenses</span>
                            <span className="text-red-600">
                              -{formatDisplayAmount(quote.margin.other_expenses || 0)}
                            </span>
                          </div>
                          <Separator className="my-1" />
                          <div className="flex justify-between font-medium">
                            <span>Gross Margin</span>
                            <span className="text-green-600">
                              {formatDisplayAmount(quote.margin.gross_margin || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Margin %</span>
                            <span className="font-medium">
                              {quote.margin.margin_percentage || 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-6 space-y-2">
                  <Button 
                    className="w-full" 
                    onClick={saveAllChanges}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => recalculateQuote()}
                    disabled={isRecalculating}
                  >
                    {isRecalculating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Recalculating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Recalculate
                      </>
                    )}
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
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOrderAction('payment_link')}
                    >
                      <LinkIcon className="w-3 h-3 mr-1" />
                      Payment Link
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOrderAction('issue_refund')}
                    >
                      <RefreshCcw className="w-3 h-3 mr-1" />
                      Issue Refund
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOrderAction('upload_receipt')}
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Upload Receipt
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOrderAction('update_tracking')}
                    >
                      <Truck className="w-3 h-3 mr-1" />
                      Update Tracking
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOrderAction('download_invoice')}
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      Download Invoice
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600"
                      onClick={() => handleOrderAction('cancel_order')}
                    >
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
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleQuickAction('duplicate')}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Duplicate
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleQuickAction('convert_to_order')}
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      Convert to Order
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleQuickAction('extend_expiry')}
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      Extend Expiry
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600"
                      onClick={() => handleQuickAction('delete')}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
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
            // Add activity log entry
            const newActivity = {
              id: Date.now().toString(),
              timestamp: new Date().toISOString(),
              user: 'Admin',
              action: `Purchased ${purchaseDialogItem.product_name}`,
              type: 'purchase'
            };
            
            // Refresh data
            if (onUpdate) {
              onUpdate({ 
                refresh: true,
                activities: [...(quote.activities || []), newActivity]
              });
            }
          }}
        />
      )}
    </div>
  );
}