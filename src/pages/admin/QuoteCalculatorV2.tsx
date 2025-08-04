import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  ChevronDown,
  ArrowRight,
  FileText,
  Download,
  Tag,
  Ruler,
  Sparkles,
  Brain,
  ChevronUp,
  MapPin,
  Phone,
  User,
  Mail,
  CheckCircle,
  EyeOff,
  Settings
} from 'lucide-react';
import { simplifiedQuoteCalculator } from '@/services/SimplifiedQuoteCalculator';
import { usePurchaseCountries } from '@/hooks/usePurchaseCountries';
import { formatCountryDisplay, sortCountriesByPopularity } from '@/utils/countryUtils';
import { delhiveryService, type DelhiveryServiceOption } from '@/services/DelhiveryService';
import NCMService from '@/services/NCMService';
import { ncmBranchMappingService } from '@/services/NCMBranchMappingService';
import { productIntelligenceService } from '@/services/ProductIntelligenceService';
import { volumetricWeightService } from '@/services/VolumetricWeightService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { currencyService } from '@/services/CurrencyService';
import { QuoteBreakdownV2 } from '@/components/quotes-v2/QuoteBreakdownV2';
import { QuoteSendEmailSimple } from '@/components/admin/QuoteSendEmailSimple';
import QuoteReminderControls from '@/components/admin/QuoteReminderControls';
import { QuoteFileUpload } from '@/components/quotes-v2/QuoteFileUpload';
import { QuoteExportControls } from '@/components/quotes-v2/QuoteExportControls';
import { CouponCodeInput } from '@/components/quotes-v2/CouponCodeInput';
import { DiscountEligibilityNotification } from '@/components/quotes-v2/DiscountEligibilityNotification';
import { DiscountPreviewPanel } from '@/components/quotes-v2/DiscountPreviewPanel';
import { LiveDiscountPreview } from '@/components/quotes-v2/LiveDiscountPreview';
import { DiscountEligibilityChecker } from '@/components/quotes-v2/DiscountEligibilityChecker';
import { DiscountHelpTooltips } from '@/components/quotes-v2/DiscountHelpTooltips';
import VolumetricWeightModal from '@/components/quotes-v2/VolumetricWeightModal';
import { UnifiedHSNSearch } from '@/components/forms/quote-form-fields/UnifiedHSNSearch';
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
  discount_amount?: number; // New: Fixed dollar amount discount
  discount_type?: 'percentage' | 'amount'; // New: Type of discount being used
  // Optional HSN fields - safe additions
  hsn_code?: string;
  use_hsn_rates?: boolean; // Feature flag per item
  // Valuation method preference - safe addition
  valuation_preference?: 'auto' | 'product_price' | 'minimum_valuation'; // Per-item valuation choice
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
  // Smart feature loading states
  const [smartFeatureLoading, setSmartFeatureLoading] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const { id: quoteId } = useParams<{ id: string }>();
  
  // Country data
  const { data: purchaseCountries = [], isLoading: loadingCountries } = usePurchaseCountries();
  
  // Sort countries with popular ones first
  const sortedCountries = sortCountriesByPopularity(purchaseCountries);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [currentQuoteStatus, setCurrentQuoteStatus] = useState<string>('draft');
  const [emailSent, setEmailSent] = useState(false);
  const [showEmailSection, setShowEmailSection] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [shareToken, setShareToken] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [reminderCount, setReminderCount] = useState(0);
  const [lastReminderAt, setLastReminderAt] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  
  // Form state
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState<any>(null);
  const [showAddressDetails, setShowAddressDetails] = useState(false);
  
  // Country code to name mapping
  const getCountryName = (code: string) => {
    const countryMap: { [key: string]: string } = {
      'US': 'United States',
      'IN': 'India', 
      'NP': 'Nepal',
      'BD': 'Bangladesh',
      'LK': 'Sri Lanka',
      'PK': 'Pakistan',
      'CN': 'China',
      'GB': 'United Kingdom',
      'CA': 'Canada',
      'AU': 'Australia',
      'DE': 'Germany',
      'FR': 'France',
      'JP': 'Japan',
      'KR': 'South Korea',
      'SG': 'Singapore',
      'TH': 'Thailand',
      'MY': 'Malaysia',
      'ID': 'Indonesia',
      'PH': 'Philippines',
      'VN': 'Vietnam'
    };
    return countryMap[code] || code;
  };

  // Format address for display
  const getAddressDisplay = (address: any, showDetails: boolean) => {
    if (!address) return { text: 'Not provided', isMultiline: false };
    
    if (showDetails) {
      // Show full address with all details including recipient info
      const lines = [];
      
      // Add recipient name and phone if available
      if (address.recipient_name) {
        const recipientLine = address.phone 
          ? `${address.recipient_name} • ${address.phone}`
          : address.recipient_name;
        lines.push(recipientLine);
      }
      
      // Add address lines
      if (address.address_line1) lines.push(address.address_line1);
      if (address.address_line2) lines.push(address.address_line2);
      lines.push(`${address.city}, ${address.state_province_region} ${address.postal_code}`);
      lines.push(getCountryName(address.destination_country));
      
      return {
        lines: lines.filter(Boolean),
        isMultiline: true
      };
    } else {
      // Show only city/country summary (no recipient info when collapsed)
      return {
        text: `${address.city}, ${getCountryName(address.destination_country)}`,
        isMultiline: false
      };
    }
  };

  const [originCountry, setOriginCountry] = useState('US');
  const [originState, setOriginState] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('NP');
  const [destinationState, setDestinationState] = useState('urban');
  const [destinationPincode, setDestinationPincode] = useState('');
  const [destinationAddress, setDestinationAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [delhiveryServiceType, setDelhiveryServiceType] = useState<'standard' | 'express' | 'same_day'>('standard');
  const [availableServices, setAvailableServices] = useState<DelhiveryServiceOption[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  
  // NCM (Nepal) service states
  const [ncmServiceType, setNcmServiceType] = useState<'pickup' | 'collect'>('pickup');
  const [destinationDistrict, setDestinationDistrict] = useState('');
  const [selectedNCMBranch, setSelectedNCMBranch] = useState<any>(null);
  const [availableNCMBranches, setAvailableNCMBranches] = useState<any[]>([]);
  const [loadingNCMBranches, setLoadingNCMBranches] = useState(false);
  const [ncmRates, setNCMRates] = useState<any>(null);
  const [loadingNCMRates, setLoadingNCMRates] = useState(false);
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
  const [isDiscountSectionCollapsed, setIsDiscountSectionCollapsed] = useState(true);
  
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
  
  
  // Volumetric weight modal state
  const [volumetricModalOpen, setVolumetricModalOpen] = useState<string | null>(null);

  // Update customer currency when destination changes
  useEffect(() => {
    getCustomerCurrency(destinationCountry).then(currency => {
      setCustomerCurrency(currency);
    });
  }, [destinationCountry]);

  // Clear pincode when switching away from India
  useEffect(() => {
    if (destinationCountry !== 'IN') {
      setDestinationPincode('');
    }
  }, [destinationCountry]);

  // Clear district when switching away from Nepal
  useEffect(() => {
    if (destinationCountry !== 'NP') {
      setDestinationDistrict('');
    }
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
  }, [items, originCountry, originState, destinationCountry, destinationState, destinationPincode, delhiveryServiceType, ncmServiceType, selectedNCMBranch, destinationAddress, shippingMethod, insuranceRequired, handlingFeeType, paymentGateway, orderDiscountValue, orderDiscountType, shippingDiscountValue, shippingDiscountType, loadingQuote]);

  // Fetch available services when pincode or destination country changes
  useEffect(() => {
    if (destinationCountry === 'IN' && destinationPincode) {
      const timeoutId = setTimeout(() => {
        fetchAvailableServices(destinationPincode);
      }, 500); // Debounce API calls
      return () => clearTimeout(timeoutId);
    } else {
      setAvailableServices([]);
    }
  }, [destinationPincode, destinationCountry, items]);

  // Load NCM branches when Nepal is selected
  useEffect(() => {
    if (destinationCountry === 'NP') {
      loadAllNCMBranches();
    } else {
      setAvailableNCMBranches([]);
      setSelectedNCMBranch(null);
      setNCMRates(null);
    }
  }, [destinationCountry]);

  // Fetch NCM rates when branch is selected
  useEffect(() => {
    if (selectedNCMBranch && destinationCountry === 'NP') {
      fetchNCMRates();
    } else {
      setNCMRates(null);
    }
  }, [selectedNCMBranch, destinationCountry]);

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

  // Sync delivery address data to destination fields for admin calculator
  const syncDeliveryAddressToDestination = async (address: any) => {
    if (!address) return;

    console.log('🔄 [Address Sync] Syncing delivery address to destination fields:', address);

    // Set country first
    const country = address.destination_country || address.country;
    if (country && country !== destinationCountry) {
      setDestinationCountry(country);
    }

    // Map address components to destination address object
    setDestinationAddress({
      line1: address.address_line1 || '',
      line2: address.address_line2 || '',
      city: address.city || '',
      state: address.state_province_region || '',
      pincode: address.postal_code || ''
    });

    // Country-specific synchronization
    if (country === 'IN') {
      // India: Extract and validate pincode
      const pincode = address.postal_code;
      if (pincode && /^[1-9][0-9]{5}$/.test(pincode)) {
        console.log('🇮🇳 [Address Sync] Setting India pincode:', pincode);
        setDestinationPincode(pincode);
        setDestinationState('urban'); // Default for India
        
        // Trigger Delhivery API call immediately
        console.log('🚚 [Address Sync] Triggering Delhivery API for pincode:', pincode);
        setTimeout(() => {
          fetchAvailableServices(pincode);
        }, 100); // Small delay to ensure state is updated
      } else if (pincode) {
        console.log('⚠️ [Address Sync] Invalid India pincode format:', pincode);
        setDestinationPincode(pincode); // Set anyway for manual correction
      }
    } else if (country === 'NP') {
      // Nepal: Map state/district to NCM branch
      const state = address.state_province_region;
      if (state) {
        console.log('🏔️ [Address Sync] Setting Nepal district:', state);
        setDestinationDistrict(state);
        setDestinationState(state);
        
        // Try to find matching NCM branch
        if (availableNCMBranches.length > 0) {
          const matchingBranch = availableNCMBranches.find(branch => 
            branch.district?.toLowerCase() === state.toLowerCase() ||
            branch.name?.toLowerCase().includes(state.toLowerCase())
          );
          if (matchingBranch) {
            console.log('🎯 [Address Sync] Found matching NCM branch:', matchingBranch.name);
            setSelectedNCMBranch(matchingBranch);
          }
        }
      }
    } else {
      // Other countries: Map state from address
      const state = address.state_province_region;
      if (state) {
        setDestinationState(state);
      }
    }

    console.log('✅ [Address Sync] Address synchronization completed');
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
            unit_price_usd: item.costprice_origin || item.unit_price_usd || 0, // V2 uses costprice_origin
            weight_kg: item.weight || item.weight_kg || undefined,
            category: item.category || '',
            notes: item.notes || item.customer_notes || '',
            hsn_code: item.hsn_code || '',
            use_hsn_rates: item.use_hsn_rates || false,
            // Discount fields
            discount_type: item.discount_type || 'percentage',
            discount_percentage: item.discount_percentage || undefined,
            discount_amount: item.discount_amount || undefined,
            // Valuation preference field - this was missing!
            valuation_preference: item.valuation_preference || 'auto'
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

        // Load delivery address if available
        if (quote.delivery_address_id) {
          try {
            const { data: address, error: addressError } = await supabase
              .from('delivery_addresses')
              .select('*')
              .eq('id', quote.delivery_address_id)
              .single();

            if (!addressError && address) {
              setDeliveryAddress(address);
              // Sync delivery address data to destination fields
              await syncDeliveryAddressToDestination(address);
            }
          } catch (addressError) {
            console.error('Error loading delivery address:', addressError);
          }
        }

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
      notes: '',
      discount_type: 'percentage', // Default to percentage
      valuation_preference: 'auto' // Default to auto (use higher value)
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

  const handleHSNSelection = (itemId: string, data: {
    hsnCode: string;
    category: string;
    customsRate?: number;
    weight?: number;
  }) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const updates: Partial<QuoteItem> = {
          hsn_code: data.hsnCode,
          category: data.category,
          use_hsn_rates: true, // Enable HSN rates when selected
        };
        
        // Apply weight if not manually set and AI suggests one
        if (data.weight && !item.weight_kg) {
          updates.weight_kg = data.weight;
        }
        
        return { ...item, ...updates };
      }
      return item;
    }));
  };

  // Fetch available Delhivery services when pincode changes
  const fetchAvailableServices = async (pincode: string) => {
    if (!pincode || destinationCountry !== 'IN' || !/^[1-9][0-9]{5}$/.test(pincode)) {
      setAvailableServices([]);
      return;
    }

    setLoadingServices(true);
    try {
      console.log('🔍 [UI] Fetching available services for pincode:', pincode);
      
      // Calculate approximate weight from items
      const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
      
      const services = await delhiveryService.getAvailableServices(pincode, totalWeight);
      console.log('✅ [UI] Available services:', services);
      
      setAvailableServices(services);
      
      // If current service type is not available, switch to first available
      if (services.length > 0 && !services.find(s => s.value === delhiveryServiceType)) {
        setDelhiveryServiceType(services[0].value as 'standard' | 'express' | 'same_day');
      }
      
    } catch (error) {
      console.error('❌ [UI] Failed to fetch available services:', error);
      setAvailableServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  // Load all NCM branches for dropdown selection
  const loadAllNCMBranches = async () => {
    if (destinationCountry !== 'NP') {
      setAvailableNCMBranches([]);
      return;
    }

    setLoadingNCMBranches(true);
    try {
      console.log('🏔️ [UI] Loading all NCM branches');
      
      const branches = await ncmBranchMappingService.getBranches();
      setAvailableNCMBranches(branches);
      
      console.log(`✅ [UI] Loaded ${branches.length} NCM branches`);
      
    } catch (error) {
      console.error('❌ [UI] Failed to load NCM branches:', error);
      setAvailableNCMBranches([]);
    } finally {
      setLoadingNCMBranches(false);
    }
  };

  // Fetch NCM rates for service type display
  const fetchNCMRates = async () => {
    if (!selectedNCMBranch || destinationCountry !== 'NP') {
      setNCMRates(null);
      return;
    }

    setLoadingNCMRates(true);
    try {
      console.log('💰 [UI] Fetching NCM rates for branch:', selectedNCMBranch.name);
      
      const pickupBranch = await ncmBranchMappingService.getPickupBranch();
      if (!pickupBranch) {
        throw new Error('No pickup branch available');
      }

      const ncmService = NCMService.getInstance();
      const rates = await ncmService.getDeliveryRates({
        creation: pickupBranch.district,
        destination: selectedNCMBranch.district,
        type: 'pickup', // Get both rates
        weight: 1 // Default weight for display
      });

      setNCMRates(rates);
      console.log('✅ [UI] NCM rates fetched:', rates);
      
    } catch (error) {
      console.error('❌ [UI] Failed to fetch NCM rates:', error);
      setNCMRates(null);
    } finally {
      setLoadingNCMRates(false);
    }
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
        destination_pincode: destinationPincode,
        destination_address: {
          line1: destinationAddress.line1,
          line2: destinationAddress.line2,
          city: destinationAddress.city,
          state: destinationAddress.state,
          pincode: destinationAddress.pincode,
          district: selectedNCMBranch?.district || destinationDistrict // For Nepal NCM mapping
        },
        delhivery_service_type: delhiveryServiceType,
        ncm_service_type: ncmServiceType,
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

  // Status management functions
  const getStatusOptions = () => {
    return [
      { value: 'draft', label: 'Draft' },
      { value: 'calculated', label: 'Calculated' },
      { value: 'sent', label: 'Sent' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' },
    ];
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow = {
      'draft': 'calculated',
      'calculated': 'sent',
      'sent': 'approved',
      'approved': null, // No next status
      'rejected': 'calculated' // Can recalculate from rejected
    };
    return statusFlow[currentStatus as keyof typeof statusFlow];
  };

  const getNextStatusLabel = (currentStatus: string) => {
    const nextStatus = getNextStatus(currentStatus);
    if (!nextStatus) return null;
    
    const statusLabels = {
      'calculated': 'Calculate',
      'sent': 'Send',
      'approved': 'Approve',
    };
    return statusLabels[nextStatus as keyof typeof statusLabels] || nextStatus;
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!quoteId) return;
    
    try {
      const { error } = await supabase
        .from('quotes_v2')
        .update({ status: newStatus })
        .eq('id', quoteId);

      if (error) throw error;

      setCurrentQuoteStatus(newStatus);
      toast({
        title: 'Status Updated',
        description: `Quote status changed to ${newStatus}`,
      });

      // Refresh quote data
      loadExistingQuote(quoteId);
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update quote status',
        variant: 'destructive',
      });
    }
  };

  const handleNextStatusClick = async () => {
    const nextStatus = getNextStatus(currentQuoteStatus);
    if (nextStatus) {
      await handleStatusChange(nextStatus);
    }
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
          {/* Informational badges */}
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

          {/* Action bar - only show when quote exists */}
          {quoteId ? (
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

              {/* Next status button */}
              {getNextStatus(currentQuoteStatus) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleNextStatusClick}
                  className="h-8 px-3 gap-1"
                >
                  <ArrowRight className="h-3 w-3" />
                  {getNextStatusLabel(currentQuoteStatus)}
                </Button>
              )}

              {/* Documents button */}
              <Dialog open={showDocumentsModal} onOpenChange={setShowDocumentsModal}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 gap-1"
                  >
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

              {/* Export button */}
              <QuoteExportControls
                quote={{
                  id: quoteId,
                  customer_name: customerName,
                  customer_email: customerEmail,
                  customer_phone: customerPhone,
                  status: currentQuoteStatus,
                  items: items,
                  total_usd: calculationResult?.calculation_steps?.total_usd || calculationResult?.total || 0,
                  total_customer_currency: calculationResult?.calculation_steps?.total_customer_currency || calculationResult?.totalCustomerCurrency || 0,
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
          ) : (
            // Show mode badge when no quote exists
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <Calculator className="w-4 h-4 mr-2" />
              New Calculator
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Contact & Address - Single Row */}
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Name */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-3 w-3 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-blue-700 uppercase tracking-wide">Name</div>
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {customerName || 'Not provided'}
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <Mail className="h-3 w-3 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-green-700 uppercase tracking-wide">Email</div>
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {customerEmail || 'Not provided'}
                  </div>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                  <Phone className="h-3 w-3 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-purple-700 uppercase tracking-wide">Phone</div>
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {customerPhone || 'Not provided'}
                  </div>
                </div>
              </div>

              {/* Delivery Address - Compact */}
              {deliveryAddress ? (
                <div className="flex items-center gap-1">
                  <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center relative">
                    <MapPin className="h-3 w-3 text-teal-600" />
                    {deliveryAddress.is_default && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-2 w-2 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-teal-700 uppercase tracking-wide">Address</div>
                    {(() => {
                      const addressDisplay = getAddressDisplay(deliveryAddress, showAddressDetails);
                      return addressDisplay.isMultiline ? (
                        <div className="text-sm font-medium text-gray-900">
                          {addressDisplay.lines?.map((line, index) => (
                            <div key={index} className="leading-tight">
                              {line}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {addressDisplay.text}
                        </div>
                      );
                    })()}
                  </div>
                  <button
                    onClick={() => setShowAddressDetails(!showAddressDetails)}
                    className="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                    title={showAddressDetails ? "Hide address details" : "Show address details"}
                  >
                    {showAddressDetails ? (
                      <EyeOff className="h-2.5 w-2.5 text-gray-600" />
                    ) : (
                      <Eye className="h-2.5 w-2.5 text-gray-600" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <MapPin className="h-3 w-3 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Address</div>
                    <div className="text-xs text-gray-500">
                      Not provided
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Edit Customer Info - Only show for new quotes */}
          {!isEditMode && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
              <div className="text-[10px] font-medium text-gray-600 mb-1">Edit Customer Details</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input
                  placeholder="Customer Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="text-xs h-7"
                />
                <Input
                  type="email"
                  placeholder="Email Address"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="text-xs h-7"
                />
                <Input
                  placeholder="Phone Number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="text-xs h-7"
                />
              </div>
            </div>
          )}

          {/* Route Info - Compact Professional Design */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Route & Shipping</CardTitle>
                <Badge variant="outline" className="text-xs">
                  <Globe className="h-3 w-3 mr-1" />
                  Configuration
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                {/* Origin Column */}
                <div>
                  <Label className="text-xs font-medium text-gray-600">Origin</Label>
                  <div className="space-y-2">
                    <Select value={originCountry} onValueChange={setOriginCountry} disabled={loadingCountries}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={loadingCountries ? "Loading..." : "Select origin"} />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingCountries ? (
                          <SelectItem value="loading" disabled>Loading countries...</SelectItem>
                        ) : sortedCountries.length > 0 ? (
                          sortedCountries.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {formatCountryDisplay(country, true)}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-countries" disabled>No countries available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {originCountry === 'US' && (
                      <Select value={originState} onValueChange={setOriginState}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="State" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No tax</SelectItem>
                          {simplifiedQuoteCalculator.getUSStates().map(state => (
                            <SelectItem key={state.code} value={state.code}>
                              {state.code} - {state.rate}%
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {/* Destination Column */}
                <div>
                  <Label className="text-xs font-medium text-gray-600">Destination</Label>
                  <div className="space-y-2">
                    <Select value={destinationCountry} onValueChange={setDestinationCountry}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IN">🇮🇳 India</SelectItem>
                        <SelectItem value="NP">🇳🇵 Nepal</SelectItem>
                        <SelectItem value="US">🇺🇸 US</SelectItem>
                        <SelectItem value="CA">🇨🇦 Canada</SelectItem>
                        <SelectItem value="GB">🇬🇧 UK</SelectItem>
                        <SelectItem value="AU">🇦🇺 Australia</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* Location/Service selector based on destination */}
                    {destinationCountry === 'IN' && (
                      <Input
                        type="text"
                        placeholder="Pincode (e.g., 400001)"
                        value={destinationPincode}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value.length <= 6) {
                            setDestinationPincode(value);
                          }
                        }}
                        className={`h-8 text-xs ${
                          destinationPincode && !/^[1-9][0-9]{5}$/.test(destinationPincode) 
                            ? 'border-orange-300' 
                            : destinationPincode 
                              ? 'border-green-300' 
                              : ''
                        }`}
                      />
                    )}
                    
                    {destinationCountry === 'NP' || (!destinationPincode && destinationCountry !== 'IN') ? (
                      <Select value={destinationState} onValueChange={setDestinationState}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Location" />
                        </SelectTrigger>
                        <SelectContent>
                          {simplifiedQuoteCalculator.getDeliveryTypes().map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                  </div>
                </div>

                {/* Shipping Column */}
                <div>
                  <Label className="text-xs font-medium text-gray-600">Shipping</Label>
                  <div className="space-y-2">
                    <Select value={shippingMethod} onValueChange={(value: any) => setShippingMethod(value)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {shippingMethods.map(method => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label.replace('Standard', 'Std').replace('Express', 'Exp')} - ${method.rate}/kg
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Show service type for India with valid pincode */}
                    {destinationCountry === 'IN' && destinationPincode && /^[1-9][0-9]{5}$/.test(destinationPincode) && (
                      <Select 
                        value={delhiveryServiceType} 
                        onValueChange={(value: 'standard' | 'express' | 'same_day') => setDelhiveryServiceType(value)}
                        disabled={loadingServices}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Service" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableServices.map((service) => (
                            <SelectItem key={service.value} value={service.value}>
                              {service.value === 'standard' && '📦 '}
                              {service.value === 'express' && '⚡ '}
                              {service.value === 'same_day' && '🚀 '}
                              {service.label.replace('Standard', 'Std').replace('Express', 'Exp')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    {/* Show NCM service type for Nepal */}
                    {destinationCountry === 'NP' && selectedNCMBranch && (
                      <Select 
                        value={ncmServiceType} 
                        onValueChange={(value: 'pickup' | 'collect') => setNcmServiceType(value)}
                        disabled={loadingNCMRates}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pickup">🚪 Door</SelectItem>
                          <SelectItem value="collect">🏪 Pickup</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {/* Payment Column */}
                <div>
                  <Label className="text-xs font-medium text-gray-600">Payment</Label>
                  <div className="space-y-2">
                    <Select value={paymentGateway} onValueChange={setPaymentGateway}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {simplifiedQuoteCalculator.getPaymentGateways().map(gateway => (
                          <SelectItem key={gateway.value} value={gateway.value}>
                            {gateway.label} - {gateway.fees.percentage}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={handlingFeeType} onValueChange={(value: any) => setHandlingFeeType(value)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Handling" />
                      </SelectTrigger>
                      <SelectContent>
                        {simplifiedQuoteCalculator.getHandlingFeeOptions().map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label.replace('Both', 'Both ($10+2%)').replace('Fixed', 'Fixed $10').replace('Percentage', '2%')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="insurance" 
                        checked={insuranceRequired} 
                        onCheckedChange={setInsuranceRequired}
                        className="scale-75"
                      />
                      <Label htmlFor="insurance" className="text-xs">Insurance</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* NCM Branch as full width when Nepal is selected */}
              {destinationCountry === 'NP' && (
                <div className="mt-3 pt-3 border-t">
                  <Label className="text-xs font-medium text-gray-600">
                    NCM Branch 
                    <span className="text-xs text-blue-600 ml-1">(Where NCM will deliver the package in Nepal)</span>
                  </Label>
                  <Select 
                    value={selectedNCMBranch?.name || ''} 
                    onValueChange={(branchName) => {
                      const branch = availableNCMBranches.find(b => b.name === branchName);
                      setSelectedNCMBranch(branch || null);
                    }}
                    disabled={loadingNCMBranches || availableNCMBranches.length === 0}
                  >
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue placeholder={
                        loadingNCMBranches 
                          ? "Loading branches..." 
                          : availableNCMBranches.length === 0
                            ? "No branches available"
                            : "Select NCM branch"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableNCMBranches.length > 0 ? (
                        availableNCMBranches.map((branch) => (
                          <SelectItem key={branch.name} value={branch.name}>
                            📍 {branch.name} • {branch.district}
                          </SelectItem>
                        ))
                      ) : loadingNCMBranches ? (
                        <SelectItem value="loading" disabled>
                          <Clock className="h-3 w-3 mr-2 animate-spin inline" />
                          Loading branches...
                        </SelectItem>
                      ) : (
                        <SelectItem value="none" disabled>
                          <AlertCircle className="h-3 w-3 mr-2 inline" />
                          No branches available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {selectedNCMBranch && (
                    <div className="text-xs mt-1 text-green-600 flex items-center">
                      <Check className="h-3 w-3 mr-1" />
                      Selected: {selectedNCMBranch.name} ({selectedNCMBranch.district})
                    </div>
                  )}
                </div>
              )}

              {/* Status indicators for validation */}
              <div className="flex flex-wrap gap-2 text-xs mt-3 pt-2 border-t">
                {destinationCountry === 'IN' && destinationPincode && (
                  <div className="flex items-center">
                    {/^[1-9][0-9]{5}$/.test(destinationPincode) ? (
                      <span className="text-green-600 flex items-center">
                        <Check className="h-3 w-3 mr-1" />
                        Pincode valid - Delhivery rates active
                      </span>
                    ) : (
                      <span className="text-orange-600 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {destinationPincode.length < 6 
                          ? `Enter ${6 - destinationPincode.length} more digits` 
                          : 'Invalid pincode - fallback rates'
                        }
                      </span>
                    )}
                  </div>
                )}
                {destinationCountry === 'NP' && loadingNCMRates && (
                  <span className="text-blue-600 flex items-center">
                    <Clock className="h-3 w-3 mr-1 animate-spin" />
                    Loading NCM rates...
                  </span>
                )}
                {destinationCountry === 'NP' && ncmRates?.rates && (
                  <span className="text-green-600 flex items-center">
                    <Check className="h-3 w-3 mr-1" />
                    NCM rates loaded • {ncmRates.markup_applied}% markup
                  </span>
                )}
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
                <Card key={item.id} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  {/* Card Header */}
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                          {index + 1}
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900">Item {index + 1}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (item.name) {
                              const loadingKey = `enhance-${item.id}`;
                              setSmartFeatureLoading(prev => ({ ...prev, [loadingKey]: true }));
                              try {
                                const suggestion = await productIntelligenceService.getSmartSuggestions({
                                  product_name: item.name,
                                  destination_country: destinationCountry,
                                  category: item.category,
                                  price_usd: item.unit_price_usd
                                });
                                if (suggestion) {
                                  const confidence = Math.round(suggestion.confidence_score * 100);
                                  updateItem(item.id, 'hsn_code', suggestion.classification_code);
                                  updateItem(item.id, 'weight_kg', suggestion.suggested_weight_kg);
                                  updateItem(item.id, 'category', suggestion.category);
                                  toast({
                                    title: "🤖 Smart Enhancement Applied",
                                    description: `Applied HSN: ${suggestion.classification_code}, Weight: ${suggestion.suggested_weight_kg}kg, Category: ${suggestion.category} (${confidence}% confidence)`,
                                    duration: 5000,
                                  });
                                  
                                  // Add visual feedback for high/low confidence
                                  if (confidence >= 80) {
                                    toast({
                                      title: "✅ High Confidence Match",
                                      description: "AI is very confident about these suggestions.",
                                      duration: 3000,
                                    });
                                  } else if (confidence < 60) {
                                    toast({
                                      variant: "destructive",
                                      title: "⚠️ Low Confidence Match", 
                                      description: "Please review and verify the AI suggestions manually.",
                                      duration: 4000,
                                    });
                                  }
                                } else {
                                  toast({
                                    variant: "destructive",
                                    title: "No Suggestions Found",
                                    description: "No matching product classification found. Please fill manually.",
                                  });
                                }
                              } catch (error) {
                                console.error('Smart enhancement error:', error);
                                toast({
                                  variant: "destructive",
                                  title: "Enhancement Failed",
                                  description: "Unable to get smart suggestions. Please fill manually.",
                                });
                              } finally {
                                setSmartFeatureLoading(prev => ({ ...prev, [loadingKey]: false }));
                              }
                            }
                          }}
                          className="text-xs h-8 px-3 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 text-purple-700 hover:from-purple-100 hover:to-blue-100"
                          disabled={!item.name || smartFeatureLoading[`enhance-${item.id}`]}
                        >
                          <Sparkles className={`w-3 h-3 mr-1 ${smartFeatureLoading[`enhance-${item.id}`] ? 'animate-spin' : ''}`} />
                          {smartFeatureLoading[`enhance-${item.id}`] ? 'Enhancing...' : 'AI Enhance'}
                        </Button>
                        {items.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Product Information Section */}
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-4 h-4 text-gray-500" />
                          <Label className="text-sm font-medium text-gray-700">Product Name *</Label>
                        </div>
                        <Input
                          value={item.name}
                          onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                          placeholder="e.g., iPhone 15 Pro, Samsung Galaxy S23, Sony WH-1000XM5"
                          className="text-base"
                        />
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <ExternalLink className="w-4 h-4 text-gray-500" />
                            <Label className="text-sm font-medium text-gray-700">Product URL</Label>
                          </div>
                          {item.url && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                              className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Open
                            </Button>
                          )}
                        </div>
                        <Input
                          value={item.url}
                          onChange={(e) => updateItem(item.id, 'url', e.target.value)}
                          placeholder="https://www.amazon.com/product-link or any international store"
                          className="text-sm"
                        />
                      </div>
                    </div>

                    {/* Essential Details Section */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Calculator className="w-4 h-4" />
                        Essential Details
                      </h5>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-600 mb-1 block">Quantity *</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                            className="text-center font-medium"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600 mb-1 block">Unit Price (USD) *</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price_usd}
                              onChange={(e) => updateItem(item.id, 'unit_price_usd', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="pl-9 font-medium"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* HSN Search Section */}
                    {item.name && item.unit_price_usd > 0 && (
                      <UnifiedHSNSearch
                        control={null}
                        index={0}
                        setValue={(name: string, value: any) => {
                          if (name.includes('hsnCode') || name === 'hsnCode') {
                            updateItem(item.id, 'hsn_code', value);
                          } else if (name.includes('category') || name === 'category') {
                            updateItem(item.id, 'category', value);
                          }
                        }}
                        countryCode={destinationCountry}
                        productName={item.name}
                        currentCategory={item.category}
                        currentHSN={item.hsn_code}
                        onSelection={(data) => handleHSNSelection(item.id, data)}
                      />
                    )}

                    {/* HSN Rate Toggle - Show when HSN code is available */}
                    {item.hsn_code && (
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <h5 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          HSN Configuration
                        </h5>
                        <div className="space-y-4">
                          {/* HSN Rate Toggle */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Label htmlFor={`hsn-toggle-${item.id}`} className="cursor-pointer font-medium text-green-700">
                                Use HSN-specific customs rates
                              </Label>
                              <Badge variant="outline" className="text-xs bg-white">
                                {item.use_hsn_rates ? 'HSN Rate' : 'Default Rate'}
                              </Badge>
                            </div>
                            <Switch
                              id={`hsn-toggle-${item.id}`}
                              checked={item.use_hsn_rates || false}
                              onCheckedChange={(checked) => updateItem(item.id, 'use_hsn_rates', checked)}
                            />
                          </div>
                          
                          {/* HSN Rate Information */}
                          {item.hsn_code && (() => {
                            const hsnInfo = simplifiedQuoteCalculator.getHSNInfo(item.hsn_code, destinationCountry);
                            return hsnInfo ? (
                              <div className="text-xs mt-2 space-y-2 bg-white rounded p-3 border">
                                <p className="text-green-700 font-medium">{hsnInfo.description}</p>
                                <div className="flex items-center justify-between">
                                  <span>HSN Rate: {hsnInfo.customsRate}%</span>
                                  <span>Default Rate: {hsnInfo.countryRate}%</span>
                                </div>
                                {item.use_hsn_rates ? (
                                  <p className="text-green-600 font-medium">
                                    ✅ Using HSN rate: {hsnInfo.customsRate}%
                                    {hsnInfo.customsRate < hsnInfo.countryRate && 
                                      <span className="text-green-700"> (saves {hsnInfo.countryRate - hsnInfo.customsRate}%)</span>
                                    }
                                  </p>
                                ) : (
                                  <p className="text-orange-600 font-medium">
                                    ⚠️ Using default rate: {hsnInfo.countryRate}%
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 bg-white rounded p-3 border">
                                HSN code not found - will use default country rate
                              </p>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Weight & Discount Section */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Weight & Pricing
                      </h5>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium text-gray-600">Weight per unit (kg)</Label>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  if (item.name || item.category) {
                                    const loadingKey = `weight-${item.id}`;
                                    setSmartFeatureLoading(prev => ({ ...prev, [loadingKey]: true }));
                                    try {
                                      const suggestion = await productIntelligenceService.getSmartSuggestions({
                                        product_name: item.name || '',
                                        destination_country: destinationCountry,
                                        category: item.category || 'general'
                                      });
                                      if (suggestion && suggestion.suggested_weight_kg && suggestion.suggested_weight_kg > 0) {
                                        updateItem(item.id, 'weight_kg', suggestion.suggested_weight_kg);
                                        toast({
                                          title: "⚖️ Weight Estimated",
                                          description: `Estimated weight: ${suggestion.suggested_weight_kg}kg based on product analysis (${Math.round(suggestion.weight_confidence * 100)}% confidence)`,
                                          duration: 4000,
                                        });
                                      } else {
                                        toast({
                                          variant: "destructive",
                                          title: "Weight Estimation Failed",
                                          description: "No weight data available for this product type.",
                                        });
                                      }
                                    } catch (error) {
                                      console.error('Weight estimation error:', error);
                                      toast({
                                        variant: "destructive",
                                        title: "Estimation Failed",
                                        description: "Unable to estimate weight. Please enter manually.",
                                      });
                                    } finally {
                                      setSmartFeatureLoading(prev => ({ ...prev, [loadingKey]: false }));
                                    }
                                  }
                                }}
                                className="h-6 px-2 text-xs bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-700 hover:from-green-100 hover:to-emerald-100"
                                disabled={(!item.name && !item.category) || smartFeatureLoading[`weight-${item.id}`]}
                              >
                                <Brain className={`w-3 h-3 mr-1 ${smartFeatureLoading[`weight-${item.id}`] ? 'animate-spin' : ''}`} />
                                {smartFeatureLoading[`weight-${item.id}`] ? 'AI' : 'AI Weight'}
                              </Button>
                              <button
                                type="button"
                                onClick={() => setVolumetricModalOpen(item.id)}
                                className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1 h-6 px-1"
                              >
                                <Ruler className="w-3 h-3" />
                                {item.dimensions ? 'Edit' : 'Dimensions'}
                              </button>
                            </div>
                          </div>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              step="0.001"
                              value={item.weight_kg || ''}
                              onChange={(e) => updateItem(item.id, 'weight_kg', parseFloat(e.target.value) || undefined)}
                              placeholder="0.5"
                              className="text-sm"
                            />
                          </div>
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
                              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                <p className="text-blue-700 font-medium">📦 {length}×{width}×{height} {unit}</p>
                                <p className={`${isVolumetric ? 'text-orange-600' : 'text-green-600'} font-medium`}>
                                  Chargeable: {Math.max(actualWeight, volumetricWeight).toFixed(3)}kg
                                  {isVolumetric && ' (volumetric)'}
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium text-gray-600">Item Discount</Label>
                            <div className="flex items-center gap-2">
                              <select
                                className="text-xs border rounded px-2 py-1 bg-white"
                                value={item.discount_type || 'percentage'}
                                onChange={(e) => {
                                  const newType = e.target.value as 'percentage' | 'amount';
                                  setItems(items.map(currentItem => 
                                    currentItem.id === item.id ? {
                                      ...currentItem,
                                      discount_type: newType,
                                      discount_amount: newType === 'percentage' ? undefined : currentItem.discount_amount,
                                      discount_percentage: newType === 'amount' ? undefined : currentItem.discount_percentage
                                    } : currentItem
                                  ));
                                }}
                              >
                                <option value="percentage">%</option>
                                <option value="amount">$</option>
                              </select>
                              {/* Show savings */}
                              {((item.discount_type === 'percentage' && item.discount_percentage && item.discount_percentage > 0) ||
                                (item.discount_type === 'amount' && item.discount_amount && item.discount_amount > 0)) && (
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                  Save ${item.discount_type === 'percentage' 
                                    ? ((item.quantity * item.unit_price_usd * (item.discount_percentage || 0)) / 100).toFixed(2)
                                    : (item.discount_amount || 0).toFixed(2)
                                  }
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max={item.discount_type === 'percentage' ? "100" : undefined}
                              step={item.discount_type === 'percentage' ? "0.1" : "0.01"}
                              value={item.discount_type === 'amount' 
                                ? (item.discount_amount || '') 
                                : (item.discount_percentage || '')
                              }
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || undefined;
                                if (item.discount_type === 'amount') {
                                  updateItem(item.id, 'discount_amount', value);
                                } else {
                                  updateItem(item.id, 'discount_percentage', value);
                                }
                              }}
                              placeholder={item.discount_type === 'amount' ? "0.00" : "0"}
                              className="text-sm pr-8"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <span className="text-gray-500 text-sm">
                                {item.discount_type === 'amount' ? '$' : '%'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Advanced Options Section */}
                    {(item.hsn_code || item.notes) && (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <h5 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                          <Settings className="w-4 h-4" />
                          Advanced Options
                        </h5>
                        <div className="space-y-4">
                          {/* Customs Valuation Method */}
                          {item.hsn_code && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <Label className="text-sm font-medium text-blue-700">Customs Valuation Method</Label>
                                <Badge variant="outline" className="text-xs bg-white">
                                  {(() => {
                                    const pref = item.valuation_preference || 'auto';
                                    switch (pref) {
                                      case 'auto': return '🤖 Auto (Higher)';
                                      case 'minimum_valuation': return '🏛️ Min Valuation';
                                      case 'product_price': return '💰 Product Price';
                                      default: return '🤖 Auto (Higher)';
                                    }
                                  })()}
                                </Badge>
                              </div>
                              <select
                                className="w-full text-sm border rounded px-3 py-2 bg-white"
                                value={item.valuation_preference || 'auto'}
                                onChange={(e) => {
                                  const newValuation = e.target.value as 'auto' | 'product_price' | 'minimum_valuation';
                                  setItems(items.map(currentItem => 
                                    currentItem.id === item.id ? {
                                      ...currentItem,
                                      valuation_preference: newValuation
                                    } : currentItem
                                  ));
                                }}
                              >
                                <option value="auto">🤖 Auto (Higher) - Recommended</option>
                                <option value="product_price">💰 Product Price - Force actual price</option>
                                <option value="minimum_valuation">🏛️ Minimum Valuation - Force minimum</option>
                              </select>
                            </div>
                          )}

                          {/* Notes Section */}
                          <div>
                            <Label className="text-sm font-medium text-blue-700 mb-2 block">Item Notes</Label>
                            <Input
                              value={item.notes || ''}
                              onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                              placeholder="Additional notes for this item..."
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              <Button onClick={addItem} variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Another Item
              </Button>
            </CardContent>
          </Card>

          {/* Enhanced Discounts Section */}
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setIsDiscountSectionCollapsed(!isDiscountSectionCollapsed)}
            >
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Smart Discount System
                </div>
                {isDiscountSectionCollapsed ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                )}
              </CardTitle>
              <CardDescription>
                Automatic discounts are applied based on order details. Add coupon codes for additional savings.
              </CardDescription>
            </CardHeader>
            {!isDiscountSectionCollapsed && (
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
            )}
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