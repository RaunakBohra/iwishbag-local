import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calculator, 
  ArrowRight,
  FileText,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { simplifiedQuoteCalculator } from '@/services/SimplifiedQuoteCalculator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { autoSaveService } from '@/services/AutoSaveService';

// Import our new refactored components
import { QuoteItemsSection } from '@/components/quotes-v2/QuoteItemsSection';
import { AddressSection } from '@/components/quotes-v2/AddressSection';
import { CustomsSection } from '@/components/quotes-v2/CustomsSection';
import { DiscountSection } from '@/components/quotes-v2/DiscountSection';
import { BreakdownSection } from '@/components/quotes-v2/BreakdownSection';
import { QuoteFileUpload } from '@/components/quotes-v2/QuoteFileUpload';
import { QuoteExportControls } from '@/components/quotes-v2/QuoteExportControls';
import { ShareQuoteButtonV2 } from '@/components/admin/ShareQuoteButtonV2';

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
  discount_amount?: number;
  discount_type?: 'percentage' | 'amount';
  hsn_code?: string;
  use_hsn_rates?: boolean;
  images?: string[];
  main_image?: string;
  aiSuggestions?: any;
}

const QuoteCalculatorV2Refactored: React.FC = () => {
  const navigate = useNavigate();
  const { id: quoteId } = useParams<{ id: string }>();
  
  // Core state
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [currentQuoteStatus, setCurrentQuoteStatus] = useState<string>('draft');
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Quote data
  const [items, setItems] = useState<QuoteItem[]>([{
    id: `item-${Date.now()}`,
    name: '',
    quantity: 1,
    unit_price_usd: 0,
    weight_kg: 0.1
  }]);

  // Customer information
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCurrency, setCustomerCurrency] = useState('USD');
  const [deliveryAddress, setDeliveryAddress] = useState<any>(null);
  const [showAddressDetails, setShowAddressDetails] = useState(false);

  // Route & shipping configuration
  const [originCountry, setOriginCountry] = useState('US');
  const [originState, setOriginState] = useState('none');
  const [destinationCountry, setDestinationCountry] = useState('IN');
  const [destinationPincode, setDestinationPincode] = useState('');
  const [destinationState, setDestinationState] = useState('urban');
  const [shippingMethod, setShippingMethod] = useState('express');
  const [paymentGateway, setPaymentGateway] = useState('stripe');
  const [insuranceEnabled, setInsuranceEnabled] = useState(false);
  const [ncmServiceType, setNcmServiceType] = useState<'pickup' | 'collect'>('pickup');
  const [delhiveryServiceType, setDelhiveryServiceType] = useState<'standard' | 'express' | 'same_day'>('standard');
  const [selectedNCMBranch, setSelectedNCMBranch] = useState<any>(null);

  // Smart feature loading states  
  const [smartFeatureLoading, setSmartFeatureLoading] = useState<Record<string, boolean>>({});

  // Discount state
  const [discountCodes, setDiscountCodes] = useState<string[]>([]);
  const [isDiscountSectionCollapsed, setIsDiscountSectionCollapsed] = useState(false);
  const [orderDiscountType, setOrderDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [orderDiscountValue, setOrderDiscountValue] = useState(0);
  const [orderDiscountCode, setOrderDiscountCode] = useState('');
  const [orderDiscountCodeId, setOrderDiscountCodeId] = useState<string | null>(null);
  const [shippingDiscountType, setShippingDiscountType] = useState<'percentage' | 'fixed' | 'free'>('percentage');
  const [shippingDiscountValue, setShippingDiscountValue] = useState(0);

  // Email & sharing state
  const [emailSent, setEmailSent] = useState(false);
  const [showEmailSection, setShowEmailSection] = useState(false);
  const [shareToken, setShareToken] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [reminderCount, setReminderCount] = useState(0);
  const [lastReminderAt, setLastReminderAt] = useState<string | null>(null);

  // Documents and notes
  const [documents, setDocuments] = useState<any[]>([]);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  // Additional state for customs section
  const [userOverrodeDestination, setUserOverrodeDestination] = useState(false);
  const [userOverrodeNCMBranch, setUserOverrodeNCMBranch] = useState(false);
  const [dynamicShippingMethods, setDynamicShippingMethods] = useState<any[]>([]);
  const [loadingNCMRates, setLoadingNCMRates] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [ncmRates, setNCMRates] = useState<any>(null);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [shippingError, setShippingError] = useState<string | null>(null);

  // Auto-calculate quotes when dependencies change
  useEffect(() => {
    const hasValidItems = items.some(item => item.name && item.unit_price_usd > 0);
    
    if (!loadingQuote && hasValidItems && !isEditMode) {
      const timer = setTimeout(() => {
        calculateQuote();
      }, 1000); // Debounce calculations
      
      return () => clearTimeout(timer);
    }
  }, [items, originCountry, destinationCountry, shippingMethod, paymentGateway, insuranceEnabled]);

  // Load existing quote if editing
  useEffect(() => {
    if (quoteId) {
      setIsEditMode(true);
      loadExistingQuote(quoteId);
    }
  }, [quoteId]);

  const loadExistingQuote = async (id: string) => {
    setLoadingQuote(true);
    try {
      const { data: quote, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Load quote data into state
      setCustomerName(quote.customer_name || '');
      setCustomerEmail(quote.customer_email || '');
      setCustomerPhone(quote.customer_phone || '');
      setOriginCountry(quote.origin_country || 'US');
      setDestinationCountry(quote.destination_country || 'IN');
      setCurrentQuoteStatus(quote.status || 'draft');
      setCalculationResult(quote.calculation_data);
      setAdminNotes(quote.admin_notes || '');
      
      // Load items
      if (quote.items && Array.isArray(quote.items)) {
        const mappedItems = quote.items.map((item: any, index: number) => ({
          id: item.id || `item-${index}`,
          name: item.name || '',
          url: item.url || '',
          quantity: item.quantity || 1,
          unit_price_usd: item.unit_price_usd || item.price || 0,
          weight_kg: item.weight_kg || item.weight || 0.1,
          category: item.category || '',
          notes: item.notes || ''
        }));
        setItems(mappedItems);
      }

      // Load sharing info
      setShareToken(quote.share_token || '');
      setExpiresAt(quote.expires_at);
      setEmailSent(quote.email_sent || false);
      
      toast({
        title: "Quote loaded successfully",
        description: `Loaded quote ${quote.quote_number || id}`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error loading quote:', error);
      toast({
        title: "Error loading quote",
        description: "Could not load the quote data",
        variant: "destructive",
      });
      navigate('/admin/quotes');
    } finally {
      setLoadingQuote(false);
    }
  };

  const calculateQuote = async () => {
    const validItems = items.filter(item => item.name && item.unit_price_usd > 0);
    if (validItems.length === 0) {
      toast({
        title: "No valid items",
        description: "Please add at least one item with name and price",
        variant: "destructive",
      });
      return;
    }

    setCalculating(true);
    try {
      const quoteData = {
        items: validItems,
        origin_country: originCountry,
        origin_state: originState,
        destination_country: destinationCountry,
        destination_state: destinationState,
        destination_pincode: destinationPincode,
        shipping_method: shippingMethod,
        payment_gateway: paymentGateway,
        insurance_enabled: insuranceEnabled,
        order_discount_type: orderDiscountType,
        order_discount_value: orderDiscountValue,
        shipping_discount_type: shippingDiscountType,
        shipping_discount_value: shippingDiscountValue
      };

      const result = await simplifiedQuoteCalculator.calculateQuote(quoteData);
      setCalculationResult(result);
      
      // Auto-save if enabled
      if (!isEditMode && customerEmail) {
        autoSaveService.scheduleAutoSave('quote-calculator', result);
      }

      toast({
        title: "✅ Quote calculated!",
        description: `Total: ${result.total_display || '$0.00'}`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Calculation error:', error);
      toast({
        title: "Calculation failed",
        description: "Please check your inputs and try again",
        variant: "destructive",
      });
    } finally {
      setCalculating(false);
    }
  };

  const saveQuote = async () => {
    if (!calculationResult) {
      toast({
        title: "No calculation result",
        description: "Please calculate the quote first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const quoteData = {
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_currency: customerCurrency,
        origin_country: originCountry,
        destination_country: destinationCountry,
        status: currentQuoteStatus,
        items,
        calculation_data: calculationResult,
        total_usd: calculationResult.total || 0,
        admin_notes: adminNotes,
        discount_codes: discountCodes
      };

      if (isEditMode && quoteId) {
        const { error } = await supabase
          .from('quotes')
          .update(quoteData)
          .eq('id', quoteId);

        if (error) throw error;

        toast({
          title: "✅ Quote updated!",
          description: "Quote has been successfully updated",
          duration: 3000,
        });
      } else {
        const { data, error } = await supabase
          .from('quotes')
          .insert([quoteData])
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "✅ Quote saved!",
          description: `Quote ${data.quote_number} created successfully`,
          duration: 3000,
        });

        // Navigate to edit mode
        navigate(`/admin/quote-calculator-v2/${data.id}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save failed",
        description: "Could not save the quote",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setCurrentQuoteStatus(newStatus);
  };

  const getStatusOptions = () => [
    { value: 'draft', label: 'Draft' },
    { value: 'calculated', label: 'Calculated' },
    { value: 'sent', label: 'Sent' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' }
  ];

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

  if (loadingQuote) {
    return (
      <div className="w-full">
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
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {isEditMode ? 'Edit Quote' : 'Quote Calculator V2 (Refactored)'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isEditMode 
              ? `Editing customer quote • Status: ${currentQuoteStatus}` 
              : 'Simplified and maintainable quote calculation'
            }
          </p>
          {isEditMode && quoteId && (
            <p className="text-xs text-gray-400 mt-1">ID: {quoteId}</p>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Status badges */}
          {isEditMode && (
            <div className="flex items-center gap-2">
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

          {/* Action bar */}
          {quoteId && (
            <div className="flex items-center gap-2 border-l pl-4">
              {/* Status dropdown */}
              <Select value={currentQuoteStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getStatusOptions().map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Documents button */}
              <Dialog open={showDocumentsModal} onOpenChange={setShowDocumentsModal}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 px-3 gap-1">
                    <FileText className="h-3 w-3" />
                    Docs
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Quote Documents</DialogTitle>
                  </DialogHeader>
                  <QuoteFileUpload
                    quoteId={quoteId}
                    documents={documents}
                    onDocumentsUpdate={setDocuments}
                    isReadOnly={false}
                  />
                </DialogContent>
              </Dialog>

              {/* Export controls */}
              <QuoteExportControls
                quote={{
                  id: quoteId,
                  customer_name: customerName,
                  customer_email: customerEmail,
                  customer_phone: customerPhone,
                  status: currentQuoteStatus,
                  share_token: shareToken,
                }}
                variant="outline"
                size="sm"
                showLabel={false}
                className="h-8 px-3"
              />

              {/* Share button */}
              <ShareQuoteButtonV2
                quote={{
                  id: quoteId,
                  display_id: null,
                  email: customerEmail,
                  final_total_usd: calculationResult?.total || 0,
                  status: currentQuoteStatus,
                  created_at: new Date().toISOString(),
                  share_token: shareToken,
                  expires_at: expiresAt,
                } as any}
                variant="icon"
                size="default"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form Components (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <AddressSection
            customerName={customerName}
            onCustomerNameChange={setCustomerName}
            customerEmail={customerEmail}
            onCustomerEmailChange={setCustomerEmail}
            customerPhone={customerPhone}
            onCustomerPhoneChange={setCustomerPhone}
            deliveryAddress={deliveryAddress}
            onDeliveryAddressChange={setDeliveryAddress}
            isEditMode={isEditMode}
            showAddressDetails={showAddressDetails}
            onShowAddressDetailsChange={setShowAddressDetails}
          />

          {/* Route & Shipping Configuration */}
          <CustomsSection
            originCountry={originCountry}
            onOriginCountryChange={setOriginCountry}
            originState={originState}
            onOriginStateChange={setOriginState}
            destinationCountry={destinationCountry}
            onDestinationCountryChange={setDestinationCountry}
            destinationPincode={destinationPincode}
            onDestinationPincodeChange={setDestinationPincode}
            destinationState={destinationState}
            onDestinationStateChange={setDestinationState}
            shippingMethod={shippingMethod}
            onShippingMethodChange={setShippingMethod}
            ncmServiceType={ncmServiceType}
            onNcmServiceTypeChange={setNcmServiceType}
            delhiveryServiceType={delhiveryServiceType}
            onDelhiveryServiceTypeChange={setDelhiveryServiceType}
            paymentGateway={paymentGateway}
            onPaymentGatewayChange={setPaymentGateway}
            insuranceEnabled={insuranceEnabled}
            onInsuranceEnabledChange={setInsuranceEnabled}
            selectedNCMBranch={selectedNCMBranch}
            onSelectedNCMBranchChange={setSelectedNCMBranch}
            userOverrodeDestination={userOverrodeDestination}
            userOverrodeNCMBranch={userOverrodeNCMBranch}
            calculationResult={calculationResult}
            dynamicShippingMethods={dynamicShippingMethods}
            loadingNCMRates={loadingNCMRates}
            loadingServices={loadingServices}
            ncmRates={ncmRates}
            availableServices={availableServices}
          />

          {/* Items Management */}
          <QuoteItemsSection
            items={items}
            onItemsChange={setItems}
            destinationCountry={destinationCountry}
            smartFeatureLoading={smartFeatureLoading}
            onSmartFeatureLoadingChange={setSmartFeatureLoading}
          />

          {/* Discount System */}
          <DiscountSection
            items={items}
            customerEmail={customerEmail}
            destinationCountry={destinationCountry}
            calculationResult={calculationResult}
            discountCodes={discountCodes}
            onDiscountCodesChange={setDiscountCodes}
            orderDiscountType={orderDiscountType}
            onOrderDiscountTypeChange={setOrderDiscountType}
            orderDiscountValue={orderDiscountValue}
            onOrderDiscountValueChange={setOrderDiscountValue}
            orderDiscountCode={orderDiscountCode}
            onOrderDiscountCodeChange={setOrderDiscountCode}
            orderDiscountCodeId={orderDiscountCodeId}
            onOrderDiscountCodeIdChange={setOrderDiscountCodeId}
            shippingDiscountType={shippingDiscountType}
            onShippingDiscountTypeChange={setShippingDiscountType}
            shippingDiscountValue={shippingDiscountValue}
            onShippingDiscountValueChange={setShippingDiscountValue}
            isCollapsed={isDiscountSectionCollapsed}
            onCollapseToggle={() => setIsDiscountSectionCollapsed(!isDiscountSectionCollapsed)}
            currencySymbol="$"
          />

          {/* Admin Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Admin Notes</CardTitle>
              <CardDescription>Internal notes about this quote</CardDescription>
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

        {/* Right: Calculation Results (1/3 width) */}
        <BreakdownSection
          items={items}
          customerEmail={customerEmail}
          customerName={customerName}
          customerCurrency={customerCurrency}
          originCountry={originCountry}
          destinationCountry={destinationCountry}
          calculating={calculating}
          calculationResult={calculationResult}
          onCalculate={calculateQuote}
          loading={loading}
          isEditMode={isEditMode}
          onSave={saveQuote}
          showPreview={showPreview}
          onTogglePreview={() => setShowPreview(!showPreview)}
          quoteId={quoteId}
          currentQuoteStatus={currentQuoteStatus}
          emailSent={emailSent}
          showEmailSection={showEmailSection}
          onShowEmailSection={setShowEmailSection}
          onEmailSent={() => setEmailSent(true)}
          reminderCount={reminderCount}
          lastReminderAt={lastReminderAt}
          expiresAt={expiresAt}
          shareToken={shareToken}
          onLoadQuote={loadExistingQuote}
          shippingError={shippingError}
          onNavigateToShippingRoutes={() => navigate('/admin/shipping-routes')}
        />
      </div>
    </div>
  );
};

export default QuoteCalculatorV2Refactored;