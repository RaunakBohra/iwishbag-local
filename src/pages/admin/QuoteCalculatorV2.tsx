import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Trash2, 
  Calculator, 
  Save, 
  Eye, 
  Package,
  DollarSign,
  Globe,
  Info,
  AlertCircle,
  Copy,
  ExternalLink,
  Clock,
  Check,
  X,
  Tag,
  Ruler,
  Sparkles,
  Brain
} from 'lucide-react';
import { simplifiedQuoteCalculator } from '@/services/SimplifiedQuoteCalculator';
import { productIntelligenceService } from '@/services/ProductIntelligenceService';
import { volumetricWeightService } from '@/services/VolumetricWeightService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { currencyService } from '@/services/CurrencyService';
import { QuoteBreakdownV2 } from '@/components/quotes-v2/QuoteBreakdownV2';
import { QuoteSendEmailSimple } from '@/components/admin/QuoteSendEmailSimple';
import QuoteReminderControls from '@/components/admin/QuoteReminderControls';
import { QuoteStatusManager } from '@/components/quotes-v2/QuoteStatusManager';
import { QuoteFileUpload } from '@/components/quotes-v2/QuoteFileUpload';
import { QuoteExportControls } from '@/components/quotes-v2/QuoteExportControls';
import { CouponCodeInput } from '@/components/quotes-v2/CouponCodeInput';
import { DiscountEligibilityNotification } from '@/components/quotes-v2/DiscountEligibilityNotification';
import { DiscountPreviewPanel } from '@/components/quotes-v2/DiscountPreviewPanel';
import { LiveDiscountPreview } from '@/components/quotes-v2/LiveDiscountPreview';
import { DiscountEligibilityChecker } from '@/components/quotes-v2/DiscountEligibilityChecker';
import { DiscountHelpTooltips } from '@/components/quotes-v2/DiscountHelpTooltips';
import VolumetricWeightModal from '@/components/quotes-v2/VolumetricWeightModal';

interface QuoteItem {
  id: string;
  name: string;
  url?: string;
  quantity: number;
  unit_price_usd: number;
  weight_kg?: number;
  category?: string;
  notes?: string;
  discount_percentage?: number;
  // Optional HSN fields - safe additions
  hsn_code?: string;
  use_hsn_rates?: boolean; // Feature flag per item
  // Optional volumetric weight fields
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit?: 'cm' | 'in';
  };
  volumetric_divisor?: number; // Default 5000, admin can override
}

const QuoteCalculatorV2: React.FC = () => {
  const navigate = useNavigate();
  const { id: quoteId } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [currentQuoteStatus, setCurrentQuoteStatus] = useState<string>('draft');
  const [emailSent, setEmailSent] = useState(false);
  const [showEmailSection, setShowEmailSection] = useState(false);
  const [shareToken, setShareToken] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [reminderCount, setReminderCount] = useState(0);
  const [lastReminderAt, setLastReminderAt] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  
  // Form state
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [originCountry, setOriginCountry] = useState('US');
  const [originState, setOriginState] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('NP');
  const [destinationState, setDestinationState] = useState('urban');
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express' | 'economy'>('standard');
  const [insuranceRequired, setInsuranceRequired] = useState(true);
  const [handlingFeeType, setHandlingFeeType] = useState<'fixed' | 'percentage' | 'both'>('both');
  const [paymentGateway, setPaymentGateway] = useState('stripe');
  const [adminNotes, setAdminNotes] = useState('');
  const [customerCurrency, setCustomerCurrency] = useState('NPR');
  
  // Discount state
  const [orderDiscountType, setOrderDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [orderDiscountValue, setOrderDiscountValue] = useState(0);
  const [orderDiscountCode, setOrderDiscountCode] = useState('');
  const [orderDiscountCodeId, setOrderDiscountCodeId] = useState<string | null>(null);
  const [shippingDiscountType, setShippingDiscountType] = useState<'percentage' | 'fixed' | 'free'>('percentage');
  const [shippingDiscountValue, setShippingDiscountValue] = useState(0);
  
  // Component discount state
  const [discountCodes, setDiscountCodes] = useState<string[]>([]);
  const [applyComponentDiscounts, setApplyComponentDiscounts] = useState(true);
  
  // Items
  const [items, setItems] = useState<QuoteItem[]>([
    {
      id: crypto.randomUUID(),
      name: '',
      url: '',
      quantity: 1,
      unit_price_usd: 0,
      weight_kg: undefined,
      category: '',
      notes: ''
    }
  ]);
  
  // Calculation result
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Feature toggles for safe implementation
  const [showAdvancedFeatures, setShowAdvancedFeatures] = useState(false);
  
  // Volumetric weight modal state
  const [volumetricModalOpen, setVolumetricModalOpen] = useState<string | null>(null);

  // Update customer currency when destination changes
  useEffect(() => {
    getCustomerCurrency(destinationCountry).then(currency => {
      setCustomerCurrency(currency);
    });
  }, [destinationCountry]);

  // Load existing quote if ID is provided
  useEffect(() => {
    if (quoteId) {
      loadExistingQuote(quoteId);
    }
  }, [quoteId]);

  // Auto-calculate on changes (but not during initial quote loading)
  useEffect(() => {
    if (!loadingQuote && items.some(item => item.name && item.unit_price_usd > 0)) {
      // Add small delay to ensure state is fully updated, especially after updateItem calls
      const timeoutId = setTimeout(() => {
        calculateQuote();
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [items, originCountry, originState, destinationCountry, destinationState, shippingMethod, insuranceRequired, handlingFeeType, paymentGateway, orderDiscountValue, orderDiscountType, shippingDiscountValue, shippingDiscountType, loadingQuote]);

  const loadQuoteDocuments = async (quoteId: string) => {
    try {
      const { data: docs, error } = await supabase
        .from('quote_documents')
        .select('*')
        .eq('quote_id', quoteId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(docs || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadExistingQuote = async (id: string) => {
    setLoadingQuote(true);
    try {
      const { data: quote, error } = await supabase
        .from('quotes_v2')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (quote) {
        // Set edit mode
        setIsEditMode(true);
        setCurrentQuoteStatus(quote.status || 'draft');
        setEmailSent(quote.email_sent || false);
        setShareToken(quote.share_token || '');
        setExpiresAt(quote.expires_at || null);
        setReminderCount(quote.reminder_count || 0);
        setLastReminderAt(quote.last_reminder_at || null);

        // Map quote data to form fields
        setCustomerEmail(quote.customer_email || '');
        setCustomerName(quote.customer_name || '');
        setCustomerPhone(quote.customer_phone || '');
        setOriginCountry(quote.origin_country || 'US');
        setDestinationCountry(quote.destination_country || 'NP');
        setCustomerCurrency(quote.customer_currency || 'USD');
        setAdminNotes(quote.admin_notes || '');

        // Map items - convert from V2 format to calculator format
        if (quote.items && Array.isArray(quote.items)) {
          const mappedItems = quote.items.map((item: any, index: number) => ({
            id: item.id || `item-${index}`,
            name: item.name || '',
            url: item.url || '',
            quantity: item.quantity || 1,
            unit_price_usd: item.costprice_origin || 0, // V2 uses costprice_origin
            weight_kg: item.weight || undefined,
            category: item.category || '',
            notes: item.notes || item.customer_notes || '',
            hsn_code: item.hsn_code || '',
            use_hsn_rates: item.use_hsn_rates || false
          }));
          setItems(mappedItems);
        }

        // Set calculation result if available
        if (quote.calculation_data) {
          setCalculationResult(quote.calculation_data);
        }
        
        // Load discount codes if available
        if (quote.discount_codes && Array.isArray(quote.discount_codes)) {
          setDiscountCodes(quote.discount_codes);
        }

        // Load documents
        await loadQuoteDocuments(id);

        toast({
          title: 'Quote Loaded',
          description: `Editing quote ${quote.quote_number || id.slice(-8)}`
        });
      }
    } catch (error) {
      console.error('Error loading quote:', error);
      toast({
        title: 'Error Loading Quote',
        description: 'Failed to load the quote data',
        variant: 'destructive'
      });
    } finally {
      setLoadingQuote(false);
    }
  };

  const addItem = () => {
    setItems([...items, {
      id: crypto.randomUUID(),
      name: '',
      url: '',
      quantity: 1,
      unit_price_usd: 0,
      weight_kg: undefined,
      category: '',
      notes: ''
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateQuote = async () => {
    setCalculating(true);
    try {
      // Filter valid items
      const validItems = items.filter(item => item.name && item.unit_price_usd > 0);
      
      if (validItems.length === 0) {
        setCalculationResult(null);
        return;
      }

      // Get customer_id for component discounts
      let customerId = null;
      if (applyComponentDiscounts && customerEmail) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', customerEmail.toLowerCase())
            .single();
          customerId = profile?.id || customerEmail; // Fallback to email if no profile
        } catch (error) {
          console.log('No profile found for email, using email as customer_id');
          customerId = customerEmail;
        }
      }

      const result = await simplifiedQuoteCalculator.calculate({
        items: validItems,
        origin_country: originCountry,
        origin_state: originState,
        destination_country: destinationCountry,
        destination_state: destinationState,
        shipping_method: shippingMethod,
        insurance_required: insuranceRequired,
        handling_fee_type: handlingFeeType,
        payment_gateway: paymentGateway,
        order_discount: orderDiscountValue > 0 ? {
          type: orderDiscountType,
          value: orderDiscountValue,
          code: orderDiscountCode
        } : undefined,
        shipping_discount: shippingDiscountValue > 0 || shippingDiscountType === 'free' ? {
          type: shippingDiscountType,
          value: shippingDiscountValue
        } : undefined,
        // Component discount parameters
        apply_component_discounts: applyComponentDiscounts,
        customer_id: customerId,
        discount_codes: discountCodes,
        is_first_order: false // Could be enhanced later with first-order detection
      });

      setCalculationResult(result);
    } catch (error) {
      console.error('Calculation error:', error);
      toast({
        title: 'Calculation Error',
        description: 'Failed to calculate quote',
        variant: 'destructive'
      });
    } finally {
      setCalculating(false);
    }
  };

  const saveQuote = async () => {
    if (!customerEmail) {
      toast({
        title: 'Missing Information',
        description: 'Please enter customer email',
        variant: 'destructive'
      });
      return;
    }

    if (!calculationResult || !calculationResult.calculation_steps) {
      toast({
        title: 'No Calculation',
        description: 'Please calculate the quote first',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate share token if not exists (for new quotes or quotes without tokens)
      let newShareToken = shareToken; // Use existing token
      if (!isEditMode || !shareToken) {
        const { data: tokenData } = await supabase.rpc('generate_quote_share_token');
        newShareToken = tokenData;
        setShareToken(newShareToken); // Update state
      }

      // Prepare quote data
      const quoteData = {
        customer_email: customerEmail,
        customer_name: customerName,
        customer_phone: customerPhone,
        origin_country: originCountry,
        destination_country: destinationCountry,
        shipping_method: shippingMethod,
        insurance_required: insuranceRequired,
        items: items.filter(item => item.name && item.unit_price_usd > 0).map(item => ({
          ...item,
          costprice_origin: item.unit_price_usd, // Map back to V2 format
          weight: item.weight_kg,
          customer_notes: item.notes
        })),
        calculation_data: calculationResult,
        total_usd: calculationResult.calculation_steps?.total_usd || 0,
        total_customer_currency: calculationResult.calculation_steps?.total_customer_currency || 0,
        customer_currency: customerCurrency,
        admin_notes: adminNotes,
        status: isEditMode ? 'calculated' : 'draft', // Update status when editing
        discount_codes: discountCodes.length > 0 ? discountCodes : null,
        calculated_at: new Date().toISOString(),
        ...(newShareToken && { share_token: newShareToken }), // Add share token if generated
        ...(isEditMode && currentQuoteStatus === 'calculated' && { 
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        })
      };

      let result;
      if (isEditMode && quoteId) {
        // Update existing quote
        const { data, error } = await supabase
          .from('quotes_v2')
          .update(quoteData)
          .eq('id', quoteId)
          .select()
          .single();

        if (error) throw error;
        result = data;
        
        toast({
          title: 'Success',
          description: 'Quote updated successfully'
        });
      } else {
        // Create new quote
        const { data: quoteNumber } = await supabase
          .rpc('generate_quote_number_v2');

        const { data, error } = await supabase
          .from('quotes_v2')
          .insert({
            ...quoteData,
            quote_number: quoteNumber,
            created_by: user?.id,
          })
          .select()
          .single();

        if (error) throw error;
        result = data;

        toast({
          title: 'Success',
          description: `Quote ${quoteNumber} created successfully`
        });

        // Switch to edit mode after creating
        setIsEditMode(true);
        setCurrentQuoteStatus('draft');
        
        // Update URL to include the new quote ID
        navigate(`/admin/quote-calculator-v2/${data.id}`, { replace: true });
      }

      // Track coupon usage if a discount code was applied
      if (orderDiscountCodeId && result && customerEmail) {
        try {
          const { DiscountService: discountService } = await import('@/services/DiscountService');
          const trackingResult = await discountService.trackCouponUsage(
            customerEmail, // Using email as customer ID for now
            result.id,
            orderDiscountCodeId,
            calculationResult.calculation_steps?.order_discount_amount || 0
          );

          if (!trackingResult.success) {
            console.error('Failed to track coupon usage:', trackingResult.error);
          }
        } catch (trackingError) {
          console.error('Error tracking coupon usage:', trackingError);
          // Don't fail the quote save if tracking fails
        }
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Save Error',
        description: 'Failed to save quote',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSent = async () => {
    // Refresh quote to get updated email_sent status  
    if (quoteId) {
      await loadExistingQuote(quoteId);
    }
    setShowEmailSection(false);
    setCurrentQuoteStatus('sent');
    
    // Update expires_at when email is sent
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    setExpiresAt(newExpiresAt);
    
    // Update in database
    if (quoteId) {
      await supabase
        .from('quotes_v2')
        .update({ 
          expires_at: newExpiresAt,
          sent_at: new Date().toISOString()
        })
        .eq('id', quoteId);
    }
    
    toast({
      title: "Success",
      description: "Quote email sent successfully",
    });
  };

  const copyShareUrl = async () => {
    if (!shareToken) return;
    
    const shareUrl = `${window.location.origin}/quote/view/${shareToken}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Copied!",
        description: "Share URL copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const openShareUrl = () => {
    if (!shareToken) return;
    const shareUrl = `${window.location.origin}/quote/view/${shareToken}`;
    window.open(shareUrl, '_blank');
  };

  const getExpiryStatus = () => {
    if (!expiresAt) return null;
    
    const now = new Date();
    const expiry = new Date(expiresAt);
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) {
      return { status: 'expired', text: 'Expired', color: 'text-red-600' };
    } else if (daysLeft <= 1) {
      return { status: 'expiring', text: `Expires today`, color: 'text-orange-600' };
    } else if (daysLeft <= 3) {
      return { status: 'expiring-soon', text: `Expires in ${daysLeft} days`, color: 'text-orange-600' };
    } else {
      return { status: 'valid', text: `Expires in ${daysLeft} days`, color: 'text-green-600' };
    }
  };

  const getCustomerCurrency = async (countryCode: string): Promise<string> => {
    const countryCurrencyMap: Record<string, string> = {
      IN: 'INR',
      NP: 'NPR',
      US: 'USD',
      CA: 'CAD',
      GB: 'GBP',
      AU: 'AUD',
    };
    return countryCurrencyMap[countryCode] || 'USD';
  };

  const taxInfo = simplifiedQuoteCalculator.getTaxInfo(destinationCountry);
  const shippingMethods = simplifiedQuoteCalculator.getShippingMethods();

  // Show loading state when loading existing quote
  if (loadingQuote) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading quote data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {isEditMode ? 'Edit Quote' : 'Quote Calculator V2'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isEditMode 
              ? `Editing customer quote • Status: ${currentQuoteStatus}` 
              : 'Simplified and transparent quote calculation'
            }
          </p>
          {isEditMode && quoteId && (
            <p className="text-xs text-gray-400 mt-1">ID: {quoteId}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {isEditMode && (
            <div className="flex items-center gap-2">
              <Badge variant={currentQuoteStatus === 'calculated' ? 'default' : 'secondary'}>
                {currentQuoteStatus}
              </Badge>
              {emailSent && (
                <Badge variant="outline" className="text-green-600">
                  <Eye className="mr-1 h-3 w-3" />
                  Email Sent
                </Badge>
              )}
              {expiresAt && (() => {
                const expiryStatus = getExpiryStatus();
                return expiryStatus ? (
                  <Badge variant="outline" className={expiryStatus.color}>
                    <Clock className="mr-1 h-3 w-3" />
                    {expiryStatus.text}
                  </Badge>
                ) : null;
              })()}
            </div>
          )}
          <div className="flex items-center space-x-2">
            <Switch
              id="advanced-mode"
              checked={showAdvancedFeatures}
              onCheckedChange={setShowAdvancedFeatures}
            />
            <Label htmlFor="advanced-mode" className="cursor-pointer">
              Advanced Features
              {showAdvancedFeatures && (
                <Badge variant="secondary" className="ml-2">Beta</Badge>
              )}
            </Label>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <Calculator className="w-4 h-4 mr-2" />
            {isEditMode ? 'Edit Mode' : 'New Calculator'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer name"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+1234567890"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Route Info */}
          <Card>
            <CardHeader>
              <CardTitle>Route & Shipping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="origin">Origin Country</Label>
                  <Select value={originCountry} onValueChange={setOriginCountry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="CN">China</SelectItem>
                      <SelectItem value="GB">United Kingdom</SelectItem>
                      <SelectItem value="JP">Japan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {originCountry === 'US' && (
                  <div>
                    <Label htmlFor="originState">Origin State (for sales tax)</Label>
                    <Select value={originState} onValueChange={setOriginState}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No state tax</SelectItem>
                        {simplifiedQuoteCalculator.getUSStates().map(state => (
                          <SelectItem key={state.code} value={state.code}>
                            {state.code} - {state.rate}% tax
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="destination">Destination Country</Label>
                  <Select value={destinationCountry} onValueChange={setDestinationCountry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">India</SelectItem>
                      <SelectItem value="NP">Nepal</SelectItem>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="GB">United Kingdom</SelectItem>
                      <SelectItem value="AU">Australia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="destinationLocation">Delivery Location</Label>
                  <Select value={destinationState} onValueChange={setDestinationState}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {simplifiedQuoteCalculator.getDeliveryTypes().map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="shipping">Shipping Method</Label>
                  <Select value={shippingMethod} onValueChange={(value: any) => setShippingMethod(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {shippingMethods.map(method => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label} - ${method.rate}/kg
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="handlingFee">Handling Fee Type</Label>
                  <Select value={handlingFeeType} onValueChange={(value: any) => setHandlingFeeType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {simplifiedQuoteCalculator.getHandlingFeeOptions().map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentGateway">Payment Gateway</Label>
                  <Select value={paymentGateway} onValueChange={setPaymentGateway}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {simplifiedQuoteCalculator.getPaymentGateways().map(gateway => (
                        <SelectItem key={gateway.value} value={gateway.value}>
                          {gateway.label} - {gateway.fees.percentage}% + ${gateway.fees.fixed}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="insurance"
                    checked={insuranceRequired}
                    onCheckedChange={setInsuranceRequired}
                  />
                  <Label htmlFor="insurance">Include Insurance (1% of value)</Label>
                </div>
              </div>
              
              {/* Tax Info Display */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Tax Rates for {taxInfo.country}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Customs:</span>
                    <span className="ml-2 font-medium">{taxInfo.customs}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">{taxInfo.local_tax_name}:</span>
                    <span className="ml-2 font-medium">{taxInfo.local_tax}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    {items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between">
                        <Label>Product Name *</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (item.name) {
                              try {
                                const suggestions = await productIntelligenceService.getSmartSuggestions(
                                  item.name, 
                                  destinationCountry, 
                                  item.category, 
                                  1
                                );
                                if (suggestions.length > 0) {
                                  const suggestion = suggestions[0];
                                  updateItem(item.id, 'hsn_code', suggestion.classification_code);
                                  updateItem(item.id, 'weight_kg', suggestion.typical_weight_kg);
                                  updateItem(item.id, 'category', suggestion.category);
                                  toast({
                                    title: "🤖 Smart Enhancement Applied",
                                    description: `Applied HSN: ${suggestion.classification_code}, Weight: ${suggestion.typical_weight_kg}kg, Category: ${suggestion.category}`,
                                  });
                                }
                              } catch (error) {
                                console.error('Smart enhancement error:', error);
                                toast({
                                  variant: "destructive",
                                  title: "Enhancement Failed",
                                  description: "Unable to get smart suggestions. Please fill manually.",
                                });
                              }
                            }
                          }}
                          className="text-xs"
                          disabled={!item.name}
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI Enhance
                        </Button>
                      </div>
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        placeholder="Enter product name"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Product URL</Label>
                      <Input
                        value={item.url}
                        onChange={(e) => updateItem(item.id, 'url', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <Label>Unit Price (USD) *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price_usd}
                        onChange={(e) => updateItem(item.id, 'unit_price_usd', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label>Weight per unit (kg)</Label>
                        <div className="flex items-center space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (item.name || item.category) {
                                try {
                                  const estimatedWeight = await productIntelligenceService.estimateProductWeight(
                                    item.name || '', 
                                    item.category || 'general'
                                  );
                                  if (estimatedWeight > 0) {
                                    updateItem(item.id, 'weight_kg', estimatedWeight);
                                    toast({
                                      title: "⚖️ Weight Estimated",
                                      description: `Estimated weight: ${estimatedWeight}kg based on product type`,
                                    });
                                  }
                                } catch (error) {
                                  console.error('Weight estimation error:', error);
                                  toast({
                                    variant: "destructive",
                                    title: "Estimation Failed",
                                    description: "Unable to estimate weight. Please enter manually.",
                                  });
                                }
                              }
                            }}
                            className="text-xs"
                            disabled={!item.name && !item.category}
                          >
                            <Brain className="w-3 h-3 mr-1" />
                            AI Weight
                          </Button>
                          <button
                            type="button"
                            onClick={() => setVolumetricModalOpen(item.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                          >
                            <Ruler className="w-3 h-3" />
                            {item.dimensions ? 'Edit dimensions' : 'Add dimensions'}
                          </button>
                        </div>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={item.weight_kg || ''}
                        onChange={(e) => updateItem(item.id, 'weight_kg', parseFloat(e.target.value) || undefined)}
                        placeholder="0.5"
                      />
                      {item.dimensions && item.dimensions.length > 0 && item.dimensions.width > 0 && item.dimensions.height > 0 && (() => {
                        const { length, width, height, unit = 'cm' } = item.dimensions;
                        let l = length, w = width, h = height;
                        if (unit === 'in') {
                          l *= 2.54; w *= 2.54; h *= 2.54;
                        }
                        const volume = l * w * h;
                        const divisor = item.volumetric_divisor || 5000;
                        const volumetricWeightPerItem = volume / divisor;
                        const volumetricWeight = volumetricWeightPerItem * item.quantity;
                        const actualWeight = (item.weight_kg || 0.5) * item.quantity;
                        const isVolumetric = volumetricWeight > actualWeight;
                        
                        return (
                          <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                            <p className="text-blue-700 font-medium">📦 Dimensions: {length}×{width}×{height} {unit}</p>
                            <p className={`${isVolumetric ? 'text-orange-600' : 'text-green-600'} font-medium`}>
                              Chargeable: {Math.max(actualWeight, volumetricWeight).toFixed(3)}kg
                              {isVolumetric && ' (volumetric)'}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Input
                        value={item.category}
                        onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                        placeholder="Electronics, Clothing, etc."
                      />
                    </div>
                    <div>
                      <Label>Item Discount (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={item.discount_percentage || ''}
                        onChange={(e) => updateItem(item.id, 'discount_percentage', parseFloat(e.target.value) || undefined)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  
                  {/* Optional HSN fields - only show in advanced mode */}
                  {showAdvancedFeatures && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-blue-50 rounded-lg">
                      <div>
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            HSN Code 
                            <Badge variant="secondary" className="text-xs">Smart AI</Badge>
                          </Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (item.name || item.category) {
                                try {
                                  const suggestions = await productIntelligenceService.getSmartSuggestions(
                                    item.name || item.category || '', 
                                    destinationCountry, 
                                    item.category, 
                                    3
                                  );
                                  if (suggestions.length > 0) {
                                    const suggestion = suggestions[0];
                                    updateItem(item.id, 'hsn_code', suggestion.classification_code);
                                    toast({
                                      title: "🔍 HSN Code Found",
                                      description: `Applied HSN ${suggestion.classification_code} with ${Math.round(suggestion.confidence_score * 100)}% confidence`,
                                    });
                                  } else {
                                    toast({
                                      variant: "destructive",
                                      title: "No HSN Found",
                                      description: "No matching HSN code found. Please enter manually.",
                                    });
                                  }
                                } catch (error) {
                                  console.error('HSN search error:', error);
                                  toast({
                                    variant: "destructive",
                                    title: "Search Failed",
                                    description: "Unable to search HSN codes. Please enter manually.",
                                  });
                                }
                              }
                            }}
                            className="text-xs"
                            disabled={!item.name && !item.category}
                          >
                            <Brain className="w-3 h-3 mr-1" />
                            Find HSN
                          </Button>
                        </div>
                        <Input
                          value={item.hsn_code || ''}
                          onChange={(e) => updateItem(item.id, 'hsn_code', e.target.value)}
                          placeholder="e.g., 6109 (or use AI to find)"
                          className="font-mono"
                        />
                        {item.hsn_code && (() => {
                          const hsnInfo = simplifiedQuoteCalculator.getHSNInfo(item.hsn_code, destinationCountry);
                          return hsnInfo ? (
                            <div className="text-xs mt-1 space-y-1">
                              <p className="text-blue-600">{hsnInfo.description}</p>
                              <p className="text-green-600 font-medium">
                                Customs: {hsnInfo.customsRate}% 
                                {hsnInfo.customsRate < hsnInfo.countryRate && 
                                  <span className="text-green-700"> (saves {hsnInfo.countryRate - hsnInfo.customsRate}%)</span>
                                }
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500 mt-1">
                              HSN not found - will use default rate
                            </p>
                          );
                        })()}
                      </div>
                      <div className="flex items-center space-x-2 pt-6">
                        <Switch
                          id={`hsn-${item.id}`}
                          checked={item.use_hsn_rates || false}
                          onCheckedChange={(checked) => updateItem(item.id, 'use_hsn_rates', checked)}
                          disabled={!item.hsn_code}
                        />
                        <Label htmlFor={`hsn-${item.id}`} className="cursor-pointer">
                          Use HSN-specific rates
                        </Label>
                      </div>
                      
                      {/* Smart Customs Preview */}
                      {item.hsn_code && item.unit_price_usd > 0 && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium flex items-center">
                              <Calculator className="w-4 h-4 mr-1 text-green-600" />
                              Smart Customs Preview
                            </h4>
                            <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                              Real-time
                            </Badge>
                          </div>
                          {(() => {
                            // Calculate customs using our enhanced logic
                            const price = item.unit_price_usd;
                            const hsnInfo = simplifiedQuoteCalculator.getHSNInfo(item.hsn_code, destinationCountry);
                            const customsRate = hsnInfo?.customsRate || 10; // Default rate
                            
                            // TODO: Get minimum valuation from product intelligence service
                            // For now, use some realistic minimums based on category
                            const minimumValuations: Record<string, number> = {
                              'electronics': 50,
                              'clothing': 15,
                              'books': 3,
                              'toys': 10,
                              'home_living': 25
                            };
                            const minimumValuation = minimumValuations[item.category || ''] || 10;
                            const useMinimumValuation = price < minimumValuation;
                            const valuationAmount = useMinimumValuation ? minimumValuation : price;
                            const customsAmount = (valuationAmount * customsRate) / 100;
                            
                            return (
                              <div className="space-y-2 text-xs">
                                {useMinimumValuation && (
                                  <div className="p-2 bg-orange-100 border border-orange-200 rounded text-orange-800">
                                    <p className="font-medium">⚠️ Minimum Valuation Applied</p>
                                    <p>Product price (${price}) is below minimum valuation of ${minimumValuation}</p>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span>Customs Rate:</span>
                                  <span className="font-medium">{customsRate}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Valuation Base:</span>
                                  <span className="font-medium">${valuationAmount}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2">
                                  <span className="font-medium">Customs Duty:</span>
                                  <span className="font-bold text-green-600">${customsAmount.toFixed(2)}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              <Button onClick={addItem} variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Another Item
              </Button>
            </CardContent>
          </Card>

          {/* Enhanced Discounts Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Smart Discount System
              </CardTitle>
              <CardDescription>
                Automatic discounts are applied based on order details. Add coupon codes for additional savings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Discount Preview Panel */}
              {customerEmail && destinationCountry && calculationResult && (
                <DiscountPreviewPanel
                  orderTotal={
                    calculationResult?.calculation_steps?.subtotal || 
                    calculationResult?.calculation_steps?.items_subtotal ||
                    items.reduce((sum, item) => sum + (item.quantity * item.unit_price_usd), 0) ||
                    0
                  }
                  countryCode={destinationCountry}
                  customerId={customerEmail}
                  itemCount={items.length}
                  componentBreakdown={{
                    shipping_cost: calculationResult?.calculation_steps?.shipping_cost,
                    customs_duty: calculationResult?.calculation_steps?.customs_duty,
                    handling_fee: calculationResult?.calculation_steps?.handling_fee,
                    local_tax: calculationResult?.calculation_steps?.local_tax,
                    insurance_amount: calculationResult?.calculation_steps?.insurance_amount,
                  }}
                  appliedCodes={discountCodes}
                  onCodeSelect={(code) => {
                    // Auto-fill the coupon input with the selected code
                    const codeInput = document.querySelector('input[placeholder*="coupon"]') as HTMLInputElement;
                    if (codeInput) {
                      codeInput.value = code;
                      codeInput.focus();
                      // Trigger the change event to activate live preview
                      codeInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                  }}
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Enhanced Coupon Code Input with Live Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                        Live Preview
                      </Badge>
                      Coupon Code
                    </h4>
                    <DiscountHelpTooltips context="admin" showAdvanced={true} />
                  </div>
                  <LiveDiscountPreview
                    customerId={customerEmail}
                    countryCode={destinationCountry}
                    quoteTotal={
                      calculationResult?.calculation_steps?.subtotal || 
                      calculationResult?.calculation_steps?.items_subtotal ||
                      items.reduce((sum, item) => sum + (item.quantity * item.unit_price_usd), 0) ||
                      0
                    }
                    componentBreakdown={{
                      shipping_cost: calculationResult?.calculation_steps?.shipping_cost,
                      customs_duty: calculationResult?.calculation_steps?.customs_duty,
                      handling_fee: calculationResult?.calculation_steps?.handling_fee,
                      local_tax: calculationResult?.calculation_steps?.local_tax,
                      insurance_amount: calculationResult?.calculation_steps?.insurance_amount,
                    }}
                    onDiscountApplied={(discount) => {
                      // Add to component discount codes for V2 system
                      if (!discountCodes.includes(discount.code)) {
                        setDiscountCodes([...discountCodes, discount.code]);
                      }
                      
                      // Only set order-level discount if it applies to 'total'
                      if (discount.appliesTo === 'total') {
                        setOrderDiscountType(discount.type);
                        setOrderDiscountValue(discount.value);
                        setOrderDiscountCode(discount.code);
                        setOrderDiscountCodeId(discount.discountCodeId || null);
                      } else {
                        // Clear order discount values for component-specific discounts
                        setOrderDiscountType('percentage');
                        setOrderDiscountValue(0);
                        setOrderDiscountCode('');
                        setOrderDiscountCodeId(null);
                      }
                    }}
                    onDiscountRemoved={() => {
                      // Remove all codes and reset discount state
                      setDiscountCodes([]);
                      setOrderDiscountType('percentage');
                      setOrderDiscountValue(0);
                      setOrderDiscountCode('');
                      setOrderDiscountCodeId(null);
                    }}
                    disabled={!customerEmail || !calculationResult}
                  />
                </div>

                {/* Discount Eligibility Checker */}
                {customerEmail && calculationResult && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-900">Discount Opportunities</h4>
                    <DiscountEligibilityChecker
                      customerId={customerEmail}
                      orderTotal={
                        calculationResult?.calculation_steps?.subtotal || 
                        calculationResult?.calculation_steps?.items_subtotal ||
                        items.reduce((sum, item) => sum + (item.quantity * item.unit_price_usd), 0) ||
                        0
                      }
                      countryCode={destinationCountry}
                      isFirstOrder={false} // Could be determined from customer data
                      hasAccount={!!customerEmail}
                      className="border-blue-200"
                    />
                  </div>
                )}

                {/* Applied Discounts Summary */}
                {discountCodes.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      Applied Discount Codes
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {discountCodes.map((code) => (
                        <Badge key={code} variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-800">
                          <Tag className="w-3 h-3" />
                          {code}
                          <button
                            onClick={() => {
                              setDiscountCodes(discountCodes.filter(c => c !== code));
                              if (orderDiscountCode === code) {
                                setOrderDiscountType('percentage');
                                setOrderDiscountValue(0);
                                setOrderDiscountCode('');
                                setOrderDiscountCodeId(null);
                              }
                            }}
                            className="ml-1 rounded-full hover:bg-green-200 p-0.5 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Legacy Manual Discount Controls (Admin Override) */}
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Manual Discount (Admin Override) */}
                <div className="space-y-2">
                  <h4 className="font-medium">Manual Discount (Admin)</h4>
                  <div className="flex gap-2">
                    <Select value={orderDiscountType} onValueChange={(value: any) => setOrderDiscountType(value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="fixed">$</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={orderDiscountValue}
                      onChange={(e) => setOrderDiscountValue(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      disabled={!!orderDiscountCode} // Disable if coupon is applied
                    />
                  </div>
                  {orderDiscountCode && (
                    <p className="text-sm text-amber-600">
                      Coupon applied - manual discount disabled
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Shipping Discount */}
                <div className="space-y-2">
                  <h4 className="font-medium">Shipping Discount</h4>
                  <div className="flex gap-2">
                    <Select value={shippingDiscountType} onValueChange={(value: any) => setShippingDiscountType(value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="fixed">$</SelectItem>
                        <SelectItem value="free">Free</SelectItem>
                      </SelectContent>
                    </Select>
                    {shippingDiscountType !== 'free' && (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={shippingDiscountValue}
                        onChange={(e) => setShippingDiscountValue(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Admin Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Internal notes about this quote..."
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: Calculation Preview */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Button 
                onClick={calculateQuote} 
                className="w-full"
                disabled={calculating || !items.some(item => item.name && item.unit_price_usd > 0)}
              >
                <Calculator className="w-4 h-4 mr-2" />
                {calculating ? 'Calculating...' : 'Calculate Quote'}
              </Button>
              
              {calculationResult && (
                <>
                  <Button 
                    onClick={() => setShowPreview(!showPreview)} 
                    variant="outline"
                    className="w-full"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {showPreview ? 'Hide' : 'Show'} Breakdown
                  </Button>
                  
                  <Button 
                    onClick={saveQuote} 
                    variant="default"
                    className="w-full"
                    disabled={loading}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Saving...' : (isEditMode ? 'Update Quote' : 'Save Quote')}
                  </Button>
                  
                  {/* Email sending for edit mode */}
                  {isEditMode && calculationResult && currentQuoteStatus === 'calculated' && !emailSent && (
                    <Button 
                      onClick={() => setShowEmailSection(true)} 
                      variant="secondary"
                      className="w-full"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Send Quote Email
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Status Management Section */}
          {isEditMode && quoteId && (
            <QuoteStatusManager
              quoteId={quoteId}
              currentStatus={currentQuoteStatus}
              onStatusChange={(newStatus) => {
                setCurrentQuoteStatus(newStatus);
                // Refresh the quote data to get updated status
                if (quoteId) {
                  loadExistingQuote(quoteId);
                }
              }}
              isEditMode={isEditMode}
            />
          )}

          {/* File Upload Section */}
          {isEditMode && quoteId && (
            <QuoteFileUpload
              quoteId={quoteId}
              documents={documents}
              onDocumentsUpdate={setDocuments}
              isReadOnly={false}
            />
          )}

          {/* Email Sending Section */}
          {isEditMode && showEmailSection && quoteId && (
            <Card>
              <CardHeader>
                <CardTitle>Send Quote Email</CardTitle>
              </CardHeader>
              <CardContent>
                <QuoteSendEmailSimple
                  quoteId={quoteId}
                  onEmailSent={handleEmailSent}
                  isV2={true}
                />
              </CardContent>
            </Card>
          )}

          {/* Share URL Section */}
          {shareToken && (
            <Card>
              <CardHeader>
                <CardTitle>Share Quote</CardTitle>
                <CardDescription>Customer can view this quote directly</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                  <code className="flex-1 text-sm font-mono text-gray-700 truncate">
                    /quote/view/{shareToken}
                  </code>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={copyShareUrl}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy URL
                  </Button>
                  <Button
                    onClick={openShareUrl}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                </div>
                
                {expiresAt && (() => {
                  const expiryStatus = getExpiryStatus();
                  return expiryStatus ? (
                    <div className={`text-sm ${expiryStatus.color} flex items-center gap-1`}>
                      <Clock className="w-4 h-4" />
                      {expiryStatus.text}
                    </div>
                  ) : null;
                })()}
              </CardContent>
            </Card>
          )}

          {/* Export Controls - Show in edit mode for saved quotes */}
          {isEditMode && quoteId && calculationResult && (
            <Card>
              <CardHeader>
                <CardTitle>Export Quote</CardTitle>
                <CardDescription>Download professional quote documents</CardDescription>
              </CardHeader>
              <CardContent>
                <QuoteExportControls
                  quote={{
                    id: quoteId,
                    customer_name: customerName,
                    customer_email: customerEmail,
                    customer_phone: customerPhone,
                    status: currentQuoteStatus,
                    items: items,
                    total_usd: calculationResult.calculation_steps?.total_usd || calculationResult.total || 0,
                    total_customer_currency: calculationResult.calculation_steps?.total_customer_currency || calculationResult.totalCustomerCurrency || 0,
                    customer_currency: customerCurrency,
                    origin_country: originCountry,
                    destination_country: destinationCountry,
                    created_at: new Date().toISOString(),
                    expires_at: expiresAt,
                    notes: adminNotes,
                    calculation_data: calculationResult,
                    share_token: shareToken,
                  }}
                  variant="outline"
                  size="default"
                  showLabel={true}
                  className="w-full"
                />
              </CardContent>
            </Card>
          )}

          {/* Reminder Controls - Only show in edit mode for saved quotes */}
          {isEditMode && quoteId && emailSent && (
            <QuoteReminderControls
              quoteId={quoteId}
              status={currentQuoteStatus}
              reminderCount={reminderCount}
              lastReminderAt={lastReminderAt}
              customerEmail={customerEmail}
              expiresAt={expiresAt}
              shareToken={shareToken}
              onUpdate={() => loadExistingQuote(quoteId)}
            />
          )}

          {/* Calculation Result */}
          {calculationResult && calculationResult.calculation_steps && (
            <Card>
              <CardHeader>
                <CardTitle>Quote Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-3xl font-bold">
                    ${(calculationResult.calculation_steps.total_usd || 0).toFixed(2)}
                  </div>
                  <div className="text-xl text-gray-600">
                    {currencyService.formatAmount(
                      calculationResult.calculation_steps.total_customer_currency || 0,
                      customerCurrency
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Breakdown using proper component */}
          {calculationResult && showPreview && calculationResult.calculation_steps && (
            <QuoteBreakdownV2 
              quote={{
                id: 'temp-' + Date.now(),
                quote_number: 'PREVIEW',
                status: 'draft',
                customer_email: customerEmail || 'preview@example.com',
                customer_name: customerName,
                origin_country: originCountry,
                destination_country: destinationCountry,
                items: items.filter(item => item.name && item.unit_price_usd > 0),
                calculation_data: calculationResult,
                total_usd: calculationResult.calculation_steps.total_usd || 0,
                total_customer_currency: calculationResult.calculation_steps.total_customer_currency || 0,
                customer_currency: customerCurrency,
                created_at: new Date().toISOString(),
                calculated_at: calculationResult.calculation_timestamp
              }}
            />
          )}
        </div>
      </div>

      {/* Volumetric Weight Modal */}
      {volumetricModalOpen && (() => {
        const currentItem = items.find(item => item.id === volumetricModalOpen);
        if (!currentItem) return null;

        return (
          <VolumetricWeightModal
            isOpen={true}
            onClose={() => setVolumetricModalOpen(null)}
            dimensions={currentItem.dimensions}
            volumetricDivisor={currentItem.volumetric_divisor}
            quantity={currentItem.quantity}
            actualWeightKg={currentItem.weight_kg}
            onSave={(dimensions, divisor) => {
              // Update both fields in a single state update to avoid race condition
              setItems(prevItems => prevItems.map(item => 
                item.id === currentItem.id 
                  ? { ...item, dimensions: dimensions, volumetric_divisor: divisor }
                  : item
              ));
            }}
            onClear={() => {
              // Clear both fields in a single state update
              setItems(prevItems => prevItems.map(item => 
                item.id === currentItem.id 
                  ? { ...item, dimensions: undefined, volumetric_divisor: undefined }
                  : item
              ));
            }}
          />
        );
      })()}
    </div>
  );
};

export default QuoteCalculatorV2;