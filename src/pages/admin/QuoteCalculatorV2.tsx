/**
 * ORIGINAL QUOTE CALCULATOR V2 - COMPLETE IMPLEMENTATION (3,592 lines)
 * 
 * This is the original implementation with ALL features intact:
 * - Complete items management with AI suggestions and weight estimation
 * - Full shipping configuration with country selection and Delhivery/NCM integration
 * - Customer information forms with address management
 * - Complete calculation logic and breakdown display
 * - Working share and email functionality
 * - Advanced options: discounts, HSN codes, volumetric weight
 * - Product intelligence and smart features
 * - Auto-save functionality
 * - Comprehensive validation and error handling
 * 
 * Restored from git commit a60d408 (before refactoring Phase 21)
 * This version was later reduced from 3,592 lines to 450 lines (87% reduction)
 * 
 * Use this as the reference for the complete working implementation.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/utils/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import { simplifiedQuoteCalculator } from '@/services/SimplifiedQuoteCalculator';
import { usePurchaseCountries } from '@/hooks/usePurchaseCountries';
import { useCountryUnit } from '@/hooks/useCountryUnits';
import { formatCountryDisplay, sortCountriesByPopularity } from '@/utils/countryUtils';
import { delhiveryService, type DelhiveryServiceOption } from '@/services/DelhiveryService';
import NCMService from '@/services/NCMService';
import { EditableUrlInput } from '@/components/EditableUrlInput';
import { ncmBranchMappingService } from '@/services/NCMBranchMappingService';
import { smartNCMBranchMapper, type SmartBranchMapping } from '@/services/SmartNCMBranchMapper';
import { productIntelligenceService } from '@/services/ProductIntelligenceService';
import { volumetricWeightService } from '@/services/VolumetricWeightService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { currencyService, formatAmountGroup } from '@/services/CurrencyService';
import { autoSaveService } from '@/services/AutoSaveService';
import { QuoteBreakdownV2 } from '@/components/quotes-v2/QuoteBreakdownV2';
import { QuoteDetailsAnalysis } from '@/components/quotes-v2/QuoteDetailsAnalysis';
import { QuoteSendEmailSimple } from '@/components/admin/QuoteSendEmailSimple';
import QuoteReminderControls from '@/components/admin/QuoteReminderControls';
import { QuoteFileUpload } from '@/components/quotes-v2/QuoteFileUpload';
import { QuoteExportControls } from '@/components/quotes-v2/QuoteExportControls';
import { CouponCodeInput } from '@/components/quotes-v2/CouponCodeInput';
import { DiscountEligibilityNotification } from '@/components/quotes-v2/DiscountEligibilityNotification';
import { DiscountPreviewPanel } from '@/components/quotes-v2/DiscountPreviewPanel';
import { LiveDiscountPreview } from '@/components/quotes-v2/LiveDiscountPreview';
import { SmartSavingsWidget } from '@/components/quotes-v2/SmartSavingsWidget';
import { AdminDiscountControls } from '@/components/admin/discount/AdminDiscountControls';
import { DiscountHelpTooltips } from '@/components/quotes-v2/DiscountHelpTooltips';
import VolumetricWeightModal from '@/components/quotes-v2/VolumetricWeightModal';
import { CompactHSNSearch } from '@/components/forms/quote-form-fields/CompactHSNSearch';
import { ShareQuoteButtonV2 } from '@/components/admin/ShareQuoteButtonV2';
import { ShippingRouteDebug } from '@/components/admin/ShippingRouteDebug';
import { DynamicShippingService } from '@/services/DynamicShippingService';

interface QuoteItem {
  id: string;
  name: string;
  url?: string;
  quantity: number;
  unit_price_origin: number;
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
  // Product images from scraping
  images?: string[]; // Array of image URLs
  main_image?: string; // Primary product image
  // AI weight suggestion data
  ai_weight_suggestion?: {
    weight: number;
    confidence: number;
  };
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
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [dynamicShippingMethods, setDynamicShippingMethods] = useState<any[]>([]);
  
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
  const [userOverrodeDestination, setUserOverrodeDestination] = useState(false);
  const [quoteLoadingComplete, setQuoteLoadingComplete] = useState(false);
  
  // Debug: Track destination country changes
  const setDestinationCountryWithDebug = (newCountry: string, source: string = 'unknown') => {
    logger.debug({
      from: destinationCountry,
      to: newCountry,
      source,
      timestamp: new Date().toISOString(),
      isEditMode,
      quoteLoadingComplete,
      userOverrodeDestination
    });
    setDestinationCountry(newCountry);
    
    // Track if this was a user override
    if (source === 'user') {
      setUserOverrodeDestination(true);
      console.log('👤 [User Override] User manually changed destination - protecting from auto-changes');
    }
  };
  
  // User dropdown selection handler
  const handleUserDestinationChange = (newCountry: string) => {
    setDestinationCountryWithDebug(newCountry, 'user');
  };
  
  // Get dynamic currency and weight units based on origin country
  const { currency: originCurrency, weightUnit } = useCountryUnit(originCountry);
  
  // Get currency symbol for display
  const currencySymbol = currencyService.getCurrencySymbolSync(originCurrency);
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
  const [ncmComboboxOpen, setNCMComboboxOpen] = useState(false);
  const [loadingNCMBranches, setLoadingNCMBranches] = useState(false);
  const [ncmRates, setNCMRates] = useState<any>(null);
  const [loadingNCMRates, setLoadingNCMRates] = useState(false);
  
  // Smart NCM branch mapping states
  const [branchMapping, setBranchMapping] = useState<SmartBranchMapping | null>(null);
  const [suggestedNCMBranches, setSuggestedNCMBranches] = useState<SmartBranchMapping[]>([]);
  const [isAutoSelected, setIsAutoSelected] = useState(false);
  const [userOverrodeNCMBranch, setUserOverrodeNCMBranch] = useState(false);
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express' | 'economy'>('standard');
  const [paymentGateway, setPaymentGateway] = useState('stripe');
  const [adminNotes, setAdminNotes] = useState('');
  const [customerCurrency, setCustomerCurrency] = useState('NPR');
  const [insuranceEnabled, setInsuranceEnabled] = useState(true); // Insurance toggle
  
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
      unit_price_origin: 0,
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
  
  // Advanced options state - track which items have expanded advanced options
  const [advancedOptionsExpanded, setAdvancedOptionsExpanded] = useState<{ [itemId: string]: boolean }>({});
  
  const toggleAdvancedOptions = (itemId: string) => {
    setAdvancedOptionsExpanded(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Update customer currency when destination changes
  useEffect(() => {
    const updateCustomerCurrency = async () => {
      // Get customer_id for currency resolution
      let customerId: string | null = null;
      if (customerEmail) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .ilike('email', customerEmail.trim())
            .maybeSingle();
          customerId = profile?.id || null;
        } catch (error) {
          console.warn('Failed to fetch profile for currency resolution:', error);
        }
      }
      
      const currency = await getCustomerCurrency(destinationCountry, customerId);
      setCustomerCurrency(currency);
    };

    updateCustomerCurrency();
  }, [destinationCountry, customerEmail]);

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
    } else {
      // For new quotes, immediately mark loading as complete
      setQuoteLoadingComplete(true);
    }
  }, [quoteId]);

  // Auto-populate AI suggestions for items with names but no AI data
  useEffect(() => {
    if (!quoteLoadingComplete) return;
    
    const autoPopulateAISuggestions = async () => {
      const itemsNeedingAI = items.filter(item => 
        item.name && 
        item.category && 
        !item.ai_weight_suggestion &&
        !smartFeatureLoading[`weight-${item.id}`]
      );

      if (itemsNeedingAI.length === 0) return;

      console.log('🤖 Auto-populating AI suggestions for', itemsNeedingAI.length, 'items');

      for (const item of itemsNeedingAI) {
        try {
          const suggestion = await productIntelligenceService.getSmartSuggestions({
            product_name: item.name,
            destination_country: destinationCountry,
            category: item.category
          });

          if (suggestion?.suggested_weight_kg && suggestion.suggested_weight_kg > 0) {
            // Update item with AI suggestion
            setItems(prev => prev.map(prevItem => 
              prevItem.id === item.id
                ? {
                    ...prevItem,
                    ai_weight_suggestion: {
                      weight: suggestion.suggested_weight_kg,
                      confidence: suggestion.weight_confidence || 0.75
                    }
                  }
                : prevItem
            ));
            logger.info(item.name, suggestion.suggested_weight_kg);
          }
        } catch (error) {
          logger.error('❌ Auto AI suggestion failed for:', item.name, error);
        }
        
        // Small delay to avoid overwhelming the service
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    };

    autoPopulateAISuggestions();
  }, [items, quoteLoadingComplete, destinationCountry]);

  // Debug: Log destination country state changes
  useEffect(() => {
    logger.debug({
      destinationCountry,
      isEditMode,
      quoteLoadingComplete,
      userOverrodeDestination,
      timestamp: new Date().toISOString()
    });
  }, [destinationCountry, isEditMode, quoteLoadingComplete, userOverrodeDestination]);

  // Debug: Log calculation result state changes
  useEffect(() => {
    console.log('📊 [State Debug] calculationResult state changed:', {
      hasResult: !!calculationResult,
      hasCalculationSteps: !!calculationResult?.calculation_steps,
      resultKeys: calculationResult ? Object.keys(calculationResult) : null,
      timestamp: new Date().toISOString()
    });
  }, [calculationResult]);

  // Auto-calculate on changes (but not during initial quote loading)
  useEffect(() => {
    const hasValidItems = items.some(item => item.name && item.unit_price_origin > 0);
    logger.debug({
      loadingQuote,
      hasValidItems,
      itemsCount: items.length,
      isEditMode,
      currentCalculationResult: !!calculationResult
    });
    
    // In edit mode, be more conservative about auto-calculation
    // Only auto-calculate for new quotes or when items actually change in a meaningful way
    if (!loadingQuote && hasValidItems && !isEditMode) {
      logger.info();
      // Add small delay to ensure state is fully updated, especially after updateItem calls
      const timeoutId = setTimeout(() => {
        calculateQuote();
      }, 50);
      return () => clearTimeout(timeoutId);
    } else {
      logger.error({
        reason: loadingQuote 
          ? 'still loading' 
          : !hasValidItems 
          ? 'no valid items' 
          : isEditMode 
          ? 'edit mode - preserving existing calculation'
          : 'unknown'
      });
    }
  }, [items, originCountry, originState, destinationCountry, destinationState, destinationPincode, delhiveryServiceType, ncmServiceType, selectedNCMBranch, destinationAddress, shippingMethod, paymentGateway, orderDiscountValue, orderDiscountType, shippingDiscountValue, shippingDiscountType, insuranceEnabled, loadingQuote, isEditMode]);

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

  // Real-time NCM branch suggestion based on manual address input
  useEffect(() => {
    if (destinationCountry !== 'NP') return;
    if (userOverrodeNCMBranch) return; // Don't interfere with manual selections
    if (!destinationAddress.city && !destinationAddress.state) return;
    
    const timeoutId = setTimeout(async () => {
      console.log('⏱️ [Real-time] Checking address input for NCM suggestions:', destinationAddress);
      
      const addressInput = {
        // For manual destination address input in admin
        city: destinationAddress.city,
        district: destinationAddress.district || destinationAddress.city, // Fallback for older addresses
        state: destinationAddress.state,
        state_province_region: destinationAddress.state,
        addressLine1: destinationAddress.line1,
        addressLine2: destinationAddress.line2,
        pincode: destinationAddress.pincode
      };
      
      // Only suggest if no current selection or low confidence auto-selection
      const shouldSuggest = !selectedNCMBranch || (branchMapping && branchMapping.confidence === 'low');
      
      if (shouldSuggest) {
        try {
          const suggestions = await smartNCMBranchMapper.getSuggestions(addressInput, 3);
          if (suggestions.length > 0) {
            console.log(`💡 [Real-time] Found ${suggestions.length} suggestions based on manual input`);
            setSuggestedNCMBranches(suggestions);
            
            // Auto-select if high confidence and no current selection
            if (!selectedNCMBranch && suggestions[0].confidence === 'high') {
              console.log(`🎯 [Real-time] Auto-selecting high confidence suggestion: ${suggestions[0].branch.name}`);
              setSelectedNCMBranch(suggestions[0].branch);
              setBranchMapping(suggestions[0]);
              setIsAutoSelected(true);
            }
          }
        } catch (error) {
          logger.error('❌ [Real-time] Error getting suggestions:', error);
        }
      }
    }, 1500); // 1.5 second debounce for real-time input
    
    return () => clearTimeout(timeoutId);
  }, [destinationAddress.city, destinationAddress.state, destinationCountry, userOverrodeNCMBranch, selectedNCMBranch]);

  // Fetch dynamic shipping methods when origin/destination changes
  useEffect(() => {
    const fetchDynamicShippingMethods = async () => {
      if (originCountry && destinationCountry) {
        try {
          const dynamicService = new DynamicShippingService();
          const deliveryOptions = await dynamicService.getDeliveryOptionsForDropdown(
            originCountry, 
            destinationCountry
          );
          
          setDynamicShippingMethods(deliveryOptions);
          setShippingError(null);
          
          logger.info();
          
          // Auto-select shipping method intelligently
          if (deliveryOptions.length > 0) {
            // If no method is selected, or current method doesn't exist in available options
            const currentMethodExists = deliveryOptions.some(option => option.value === shippingMethod);
            
            if (!shippingMethod || !currentMethodExists) {
              // Prefer 'standard' if available, otherwise select the first option
              const standardOption = deliveryOptions.find(option => option.value === 'standard');
              const selectedMethod = standardOption ? 'standard' : deliveryOptions[0].value;
              
              console.log(`🎯 [Auto-Select] Setting shipping method to: ${selectedMethod} (${standardOption ? 'preferred standard' : 'first available'})`);
              setShippingMethod(selectedMethod);
            }
          }
        } catch (error) {
          logger.error('Error fetching dynamic shipping methods:', error);
          setDynamicShippingMethods([]);
          setShippingError(`No shipping route configured for ${originCountry} → ${destinationCountry}`);
        }
      } else {
        setDynamicShippingMethods([]);
        setShippingError(null);
      }
    };

    fetchDynamicShippingMethods();
  }, [originCountry, destinationCountry]);


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
      logger.error('Error loading documents:', error);
    }
  };

  // Sync delivery address data to destination fields for admin calculator
  const syncDeliveryAddressToDestination = async (address: any) => {
    if (!address) return;

    console.log('🔄 [Address Sync] Syncing delivery address to destination fields:', address);

    // Set country first - with user override protection
    const country = address.destination_country || address.country;
    const shouldSkipSync = isEditMode || !quoteLoadingComplete || userOverrodeDestination;
    
    logger.debug({
      country,
      currentDestination: destinationCountry,
      isEditMode,
      quoteLoadingComplete,
      userOverrodeDestination,
      shouldSkip: shouldSkipSync,
      willSetCountry: country && country !== destinationCountry && !shouldSkipSync
    });
    
    if (country && country !== destinationCountry && !shouldSkipSync) {
      console.log('🔄 [Address Sync] Setting destination country to:', country);
      setDestinationCountryWithDebug(country, 'address-sync');
    } else if (isEditMode) {
      console.log('⏭️ [Address Sync] Skipping country sync - in edit mode');
    } else if (!quoteLoadingComplete) {
      console.log('⏭️ [Address Sync] Skipping country sync - quote still loading');
    } else if (userOverrodeDestination) {
      console.log('👤 [Address Sync] Skipping country sync - user manually selected destination');
    } else {
      console.log('⏭️ [Address Sync] Skipping - no change needed');
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
        logger.warn(pincode);
        setDestinationPincode(pincode); // Set anyway for manual correction
      }
    } else if (country === 'NP') {
      // Nepal: Smart mapping of address to NCM branch
      const state = address.state_province_region;
      if (state) {
        console.log('🏔️ [Address Sync] Setting Nepal district:', state);
        setDestinationDistrict(state);
        setDestinationState(state);
      }
      
      // Debug: Log all address fields for Nepal
      logger.debug({
        city: address.city,
        state_province_region: address.state_province_region,
        address_line1: address.address_line1,
        address_line2: address.address_line2,
        postal_code: address.postal_code,
        destination_country: address.destination_country
      });
      
      // Use smart mapper to find best NCM branch match
      // Wait a bit if NCM branches are still loading
      if (loadingNCMBranches) {
        console.log('⏳ [Address Sync] NCM branches still loading, waiting...');
        setTimeout(async () => {
          await smartMapNCMBranch(address);
        }, 1000);
      } else {
        await smartMapNCMBranch(address);
      }
    } else {
      // Other countries: Map state from address
      const state = address.state_province_region;
      if (state) {
        setDestinationState(state);
      }
    }

    logger.info();
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
        logger.debug({
          quoteId: quote.id,
          status: quote.status,
          hasCalculationData: !!quote.calculation_data,
          calculationDataKeys: quote.calculation_data ? Object.keys(quote.calculation_data) : null
        });
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
        logger.debug({
          fromDB: quote.destination_country,
          current: destinationCountry
        });
        setDestinationCountryWithDebug(quote.destination_country || 'NP', 'database-load');
        // Reset user override flag when loading from database
        setUserOverrodeDestination(false);
        setCustomerCurrency(quote.customer_currency || 'USD');
        setAdminNotes(quote.admin_notes || '');
        
        // Load shipping method from database
        logger.debug({
          fromDB: quote.shipping_method,
          current: shippingMethod
        });
        setShippingMethod(quote.shipping_method || 'standard');
        
        // Load insurance preference from database (default to true if not set)
        setInsuranceEnabled(quote.insurance_required !== undefined ? quote.insurance_required : true);

        // Map items - convert from V2 format to calculator format
        if (quote.items && Array.isArray(quote.items)) {
          const mappedItems = quote.items.map((item: any, index: number) => ({
            id: item.id || `item-${index}`,
            name: item.name || '',
            url: item.url || '',
            quantity: item.quantity || 1,
            unit_price_origin: item.costprice_origin || item.unit_price_origin || 0, // V2 uses costprice_origin
            weight_kg: item.weight || item.weight_kg || undefined,
            category: item.category || '',
            notes: item.notes || item.customer_notes || '',
            hsn_code: item.hsn_code || '',
            use_hsn_rates: item.use_hsn_rates || false,
            // Discount fields
            discount_type: item.discount_type || 'percentage',
            discount_percentage: item.discount_percentage || undefined,
            discount_amount: item.discount_amount || undefined,
            // Valuation preference field
            valuation_preference: item.valuation_preference || 'auto',
            // Image fields - these were missing!
            images: item.images || undefined,
            main_image: item.main_image || undefined,
            // Dimension fields
            dimensions: item.dimensions || undefined,
            volumetric_divisor: item.volumetric_divisor || undefined
          }));
          setItems(mappedItems);
        }

        // Set calculation result if available
        if (quote.calculation_data) {
          logger.debug({
            hasCalculationSteps: !!(quote.calculation_data.calculation_steps),
            calculationKeys: Object.keys(quote.calculation_data)
          });
          setCalculationResult(quote.calculation_data);
          
          // Sync shipping method with calculation results (even in edit mode)
          console.log('🎯 [DEBUG] loadExistingQuote - syncing shipping method with calculation data');
          setTimeout(() => {
            syncShippingMethodFromCalculation(quote.calculation_data);
          }, 100); // Small delay to ensure state updates are complete
        } else {
          logger.warn();
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
            logger.error('Error loading delivery address:', addressError);
          }
        }

        toast({
          title: 'Quote Loaded',
          description: `Editing quote ${quote.quote_number || id.slice(-8)}`
        });
        
        // Mark quote loading as complete - this prevents Address Sync from overriding user selections
        logger.info();
        setQuoteLoadingComplete(true);
      }
    } catch (error) {
      logger.error('Error loading quote:', error);
      toast({
        title: 'Error Loading Quote',
        description: 'Failed to load the quote data',
        variant: 'destructive'
      });
    } finally {
      setLoadingQuote(false);
      // Also set complete flag on error to prevent stuck state
      setQuoteLoadingComplete(true);
    }
  };

  const addItem = () => {
    setItems([...items, {
      id: crypto.randomUUID(),
      name: '',
      url: '',
      quantity: 1,
      unit_price_origin: 0,
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
    console.log('🔄 updateItem called:', { id, field, value, currentItems: items.length });
    
    setItems(prevItems => {
      const updatedItems = prevItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          console.log('📝 Item updated:', { 
            field, 
            oldValue: item[field], 
            newValue: value, 
            itemName: item.name 
          });
          return updatedItem;
        }
        return item;
      });
      
      console.log('📋 Updated items array:', updatedItems.map(item => ({ 
        id: item.id, 
        name: item.name, 
        price: item.unit_price_origin, 
        weight: item.weight_kg 
      })));
      
      // Auto-save field changes with debouncing (2-second delay)
      // Only save if we have a quote ID (not for new unsaved quotes)
      if (quoteId) {
        console.log('💾 Scheduling debounced auto-save for field change:', field);
        autoSaveService.autoSaveQuoteItems(
          quoteId,
          updatedItems,
          {
            debounceMs: 2000, // 2-second debounce for field changes
            showToast: false, // Don't show toast for individual field changes
            description: `${field} field change`
          }
        );
      } else {
        console.log('⏭️ Skipping auto-save - no quote ID (new quote)');
      }
      
      return updatedItems;
    });
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
      logger.debug(pincode);
      
      // Calculate approximate weight from items
      const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
      
      const services = await delhiveryService.getAvailableServices(pincode, totalWeight);
      logger.info(services);
      
      setAvailableServices(services);
      
      // If current service type is not available, switch to first available
      if (services.length > 0 && !services.find(s => s.value === delhiveryServiceType)) {
        setDelhiveryServiceType(services[0].value as 'standard' | 'express' | 'same_day');
      }
      
    } catch (error) {
      logger.error('❌ [UI] Failed to fetch available services:', error);
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
      
      // Sort branches A→Z by district name, then by branch name
      const sortedBranches = branches.sort((a, b) => {
        // Primary sort: District name A→Z
        const districtComparison = a.district.localeCompare(b.district);
        if (districtComparison !== 0) {
          return districtComparison;
        }
        // Secondary sort: Branch name A→Z for same districts
        return a.name.localeCompare(b.name);
      });
      
      setAvailableNCMBranches(sortedBranches);
      
      logger.info();
      
    } catch (error) {
      logger.error('❌ [UI] Failed to load NCM branches:', error);
      setAvailableNCMBranches([]);
    } finally {
      setLoadingNCMBranches(false);
    }
  };

  // Get delivery time estimate for a branch
  const getDeliveryEstimate = (branch: any) => {
    const majorCities = ['KATHMANDU', 'POKHARA', 'CHITWAN', 'BIRATNAGAR', 'BIRGUNJ'];
    const isMajorCity = majorCities.some(city => 
      branch.district.toUpperCase().includes(city) || 
      branch.name.toUpperCase().includes(city)
    );
    
    if (isMajorCity) {
      return ncmServiceType === 'pickup' ? '1-2 days' : '2-3 days';
    } else {
      return ncmServiceType === 'pickup' ? '2-4 days' : '3-5 days';
    }
  };

  // Group branches by province for better organization
  const groupBranchesByProvince = (branches: any[]) => {
    const groups: Record<string, any[]> = {};
    const majorCities = ['KATHMANDU', 'POKHARA', 'CHITWAN', 'BIRATNAGAR', 'BIRGUNJ'];
    
    // Create major cities group first
    const majorCityBranches = branches.filter(branch => 
      majorCities.some(city => 
        branch.district.toUpperCase().includes(city) || 
        branch.name.toUpperCase().includes(city)
      )
    );
    
    if (majorCityBranches.length > 0) {
      groups['🏙️ Major Cities'] = majorCityBranches;
    }
    
    // Group remaining branches by province/region
    const remainingBranches = branches.filter(branch => 
      !majorCityBranches.includes(branch)
    );
    
    remainingBranches.forEach(branch => {
      let provinceName = '🏔️ Other Areas';
      
      if (branch.region && branch.region !== 'Nepal') {
        // Clean up region names for better display
        const regionParts = branch.region.split(' - ');
        if (regionParts.length > 1) {
          provinceName = `🏔️ ${regionParts[1]} Province`;
        } else {
          provinceName = `🏔️ ${branch.region}`;
        }
      }
      
      if (!groups[provinceName]) {
        groups[provinceName] = [];
      }
      groups[provinceName].push(branch);
    });
    
    return groups;
  };


  // Smart NCM branch mapping based on address
  const smartMapNCMBranch = async (address: any) => {
    if (!address || destinationCountry !== 'NP') {
      console.log('🧠 [Smart Mapping] Skipping - no address or not Nepal:', { address, destinationCountry });
      return;
    }

    try {
      console.log('🧠 [Smart Mapping] Starting smart NCM branch mapping for:', {
        fullAddress: address,
        rawCity: address.city,
        rawState: address.state_province_region,
        destination_country: address.destination_country
      });
      
      // Prepare address input for smart mapper
      const addressInput = {
        // Use proper district field if available (new AddressModal), fallback to old mapping
        city: address.city,
        district: address.district || address.city, // NEW: Use district field or fallback to old mapping
        state: address.state_province_region,
        state_province_region: address.state_province_region,
        addressLine1: address.address_line1,
        addressLine2: address.address_line2,
        pincode: address.postal_code
      };

      console.log('🔧 [Smart Mapping] Prepared addressInput:', {
        city: addressInput.city,
        district: addressInput.district,
        hasDistrictField: !!address.district,
        province: addressInput.state,
        addressLine1: addressInput.addressLine1
      });

      // Check if NCM branches are available first
      logger.debug({
        availableNCMBranchesCount: availableNCMBranches.length,
        loadingNCMBranches,
        destinationCountry
      });

      // Get best match from smart mapper
      const mapping = await smartNCMBranchMapper.findBestMatch(addressInput);
      
      if (mapping) {
        logger.info();
        
        // Update states
        setBranchMapping(mapping);
        setSelectedNCMBranch(mapping.branch);
        setIsAutoSelected(true);
        setUserOverrodeNCMBranch(false);
        
        // Also get suggestions for user to see alternatives
        const suggestions = await smartNCMBranchMapper.getSuggestions(addressInput, 3);
        setSuggestedNCMBranches(suggestions.filter(s => s.branch.name !== mapping.branch.name));
        
        console.log(`ℹ️ [Smart Mapping] Auto-selected ${mapping.branch.name} with ${suggestions.length} alternatives`);
      } else {
        logger.debug();
        setBranchMapping(null);
        setIsAutoSelected(false);
        
        // Check if there are multiple branches in the same district
        const districtBranches = await smartNCMBranchMapper.findDistrictBranches(addressInput);
        
        if (districtBranches.length > 1) {
          console.log(`🏢 [Smart Mapping] Found ${districtBranches.length} branches in district - showing all options`);
          setSuggestedNCMBranches(districtBranches);
        } else {
          // Fall back to general suggestions
          const suggestions = await smartNCMBranchMapper.getSuggestions(addressInput, 3);
          setSuggestedNCMBranches(suggestions);
          
          if (suggestions.length > 0) {
            console.log(`💡 [Smart Mapping] No district match, showing ${suggestions.length} general suggestions`);
          } else {
            logger.debug(addressInput);
          }
        }
      }
    } catch (error) {
      logger.error('❌ [Smart Mapping] Error in smart mapping:', error);
      setBranchMapping(null);
      setIsAutoSelected(false);
      setSuggestedNCMBranches([]);
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
      logger.info(rates);
      
    } catch (error) {
      logger.error('❌ [UI] Failed to fetch NCM rates:', error);
      setNCMRates(null);
    } finally {
      setLoadingNCMRates(false);
    }
  };

  // Sync shipping method dropdown with calculation results
  const syncShippingMethodFromCalculation = (calculationResult: any) => {
    if (calculationResult?.route_calculations?.delivery_option_used?.id) {
      const usedShippingMethodId = calculationResult.route_calculations.delivery_option_used.id;
      const usedShippingMethodName = calculationResult.route_calculations.delivery_option_used.name;
      
      console.log(`🎯 [Shipping Sync] Auto-selecting cheapest shipping method:`, {
        id: usedShippingMethodId,
        name: usedShippingMethodName,
        previousSelection: shippingMethod
      });
      
      // Get current shipping methods for validation
      const currentShippingMethods = dynamicShippingMethods.length > 0 
        ? dynamicShippingMethods 
        : simplifiedQuoteCalculator.getShippingMethods();
      
      // Check if the calculated method exists in available options
      const methodExists = currentShippingMethods.some(method => method.value === usedShippingMethodId);
      
      logger.debug({
        calculatedMethodId: usedShippingMethodId,
        availableOptions: currentShippingMethods.map(m => m.value),
        methodExists,
        willUpdate: methodExists
      });
      
      if (methodExists) {
        setShippingMethod(usedShippingMethodId);
        
        // Show user feedback about auto-selection
        if (usedShippingMethodId !== shippingMethod) {
          toast({
            title: "✈️ Shipping Method Updated",
            description: `Auto-selected cheapest option: ${usedShippingMethodName}`,
            duration: 3000
          });
        }
      } else {
        logger.warn(`⚠️ [Shipping Sync] Calculated method ${usedShippingMethodId} not found in available options. Using first available option.`);
        
        // Fallback to first available option
        if (currentShippingMethods.length > 0) {
          const fallbackMethod = currentShippingMethods[0];
          console.log(`🔄 [Shipping Sync] Falling back to: ${fallbackMethod.value} (${fallbackMethod.label})`);
          setShippingMethod(fallbackMethod.value);
        }
      }
    }
  };

  /**
   * Apply proportional rounding to calculation result and return both rounded values for DB storage
   * and the rounded breakdown for consistent display
   */
  const applyProportionalRounding = (result: any, currency: string) => {
    if (!result?.calculation_steps) {
      console.warn('[ProportionalRounding] No calculation_steps found in result');
      return result;
    }

    const steps = result.calculation_steps;
    console.log('[ProportionalRounding] Original result:', {
      total_origin_currency: steps.total_origin_currency,
      total_quote_origincurrency: steps.total_quote_origincurrency,
      steps: Object.keys(steps)
    });

    // Get the precise total that should be the target
    const preciseTotal = steps.total_origin_currency || steps.total_quote_origincurrency || 0;
    
    if (preciseTotal <= 0) {
      console.warn('[ProportionalRounding] Invalid total, skipping rounding:', preciseTotal);
      return result;
    }

    // Define the breakdown components that should sum to the total
    const components = [
      { label: 'items_subtotal', amount: steps.items_subtotal || 0 },
      { label: 'item_discounts', amount: -(steps.item_discounts || 0) },
      { label: 'order_discount_amount', amount: -(steps.order_discount_amount || 0) },
      { label: 'origin_sales_tax', amount: steps.origin_sales_tax || 0 },
      { label: 'shipping_cost', amount: steps.shipping_cost || 0 },
      { label: 'shipping_discount_amount', amount: -(steps.shipping_discount_amount || 0) },
      { label: 'insurance_amount', amount: steps.insurance_amount || 0 },
      { label: 'customs_duty', amount: steps.customs_duty || 0 },
      { label: 'handling_fee', amount: steps.handling_fee || 0 },
      { label: 'domestic_delivery', amount: steps.domestic_delivery || 0 },
      { label: 'local_tax_amount', amount: steps.local_tax_amount || 0 },
      { label: 'payment_gateway_fee', amount: steps.payment_gateway_fee || 0 }
    ].filter(component => Math.abs(component.amount) > 0.001); // Only include non-zero components

    console.log('[ProportionalRounding] Components for rounding:', components);

    // Apply proportional rounding
    const roundingResult = formatAmountGroup(components, preciseTotal, currency);
    
    // Create updated calculation steps with rounded values
    const updatedSteps = { ...steps };
    
    // Update each component with its rounded value
    roundingResult.components.forEach(component => {
      const key = component.label;
      if (key.includes('discount') || key.includes('item_discounts') || key.includes('order_discount_amount')) {
        // Store discounts as positive values, they were negated for calculation
        updatedSteps[key] = Math.abs(component.amount);
      } else {
        updatedSteps[key] = component.amount;
      }
    });

    // Update totals with rounded values
    updatedSteps.total_origin_currency = roundingResult.total.amount;
    updatedSteps.total_quote_origincurrency = roundingResult.total.amount; // Store rounded value for backward compatibility
    
    // If we have customer currency conversion, apply it to the rounded total
    if (steps.total_quote_origincurrency && steps.total_origin_currency) {
      const conversionRate = steps.total_quote_origincurrency / steps.total_origin_currency;
      updatedSteps.total_quote_origincurrency = roundingResult.total.amount * conversionRate;
    }

    // Add rounding metadata for audit purposes
    updatedSteps._rounding_metadata = {
      applied_at: new Date().toISOString(),
      currency: currency,
      original_total: preciseTotal,
      rounded_total: roundingResult.total.amount,
      adjustments_made: roundingResult.adjustments.length,
      adjustments: roundingResult.adjustments
    };

    console.log('[ProportionalRounding] ✅ Applied proportional rounding:', {
      original_total: preciseTotal,
      rounded_total: roundingResult.total.amount,
      adjustments: roundingResult.adjustments.length,
      verification_sum: roundingResult.components.reduce((sum, c) => sum + c.amount, 0)
    });

    // Return updated result
    return {
      ...result,
      calculation_steps: updatedSteps,
      _proportional_rounding_applied: true
    };
  };

  const calculateQuote = async () => {
    logger.debug({
      totalItems: items.length,
      itemsWithNames: items.filter(item => item.name).length,
      itemsWithPrices: items.filter(item => item.unit_price_origin > 0).length,
      isEditMode,
      currentCalculationResult: !!calculationResult
    });

    setCalculating(true);
    try {
      // Filter valid items and map to new interface
      const validItems = items.filter(item => item.unit_price_origin > 0).map(item => ({
        ...item,
        costprice_origin: item.unit_price_origin, // Map unit_price_origin to costprice_origin
        weight_kg: item.weight_kg || 0
      }));
      
      logger.debug({
        validItemsCount: validItems.length,
        validItems: validItems.map(item => ({ 
          name: item.name, 
          unit_price_origin: item.unit_price_origin,
          costprice_origin: item.costprice_origin,
          weight_kg: item.weight_kg
        })),
        originCountry,
        destinationCountry,
        customerEmail,
        customerName
      });
      
      if (validItems.length === 0) {
        logger.error();
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

      console.log('🚀 [DEBUG] About to call simplifiedQuoteCalculator.calculate with:', {
        validItemsCount: validItems.length,
        originCountry,
        destinationCountry,
        customerEmail,
        shippingMethod
      });

      const result = await simplifiedQuoteCalculator.calculate({
        items: validItems,
        origin_country: originCountry,
        origin_currency: await getCustomerCurrency(originCountry), // CRITICAL: Add missing origin currency
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
        is_first_order: false, // Could be enhanced later with first-order detection
        insurance_enabled: insuranceEnabled // Insurance toggle
      });

      logger.info({
        resultExists: !!result,
        resultKeys: result ? Object.keys(result) : null,
        hasCalculationSteps: !!(result?.calculation_steps),
        calculationStepsKeys: result?.calculation_steps ? Object.keys(result.calculation_steps) : null
      });

      // Apply proportional rounding to ensure consistent display and database values
      // Use origin currency derived from origin_country (this is the correct approach)
      const originCurrency = await getCustomerCurrency(originCountry);
      const roundedResult = applyProportionalRounding(result, originCurrency);
      
      setCalculationResult(roundedResult);
      console.log('🎯 [DEBUG] State updated - calculationResult set with proportional rounding:', {
        resultSet: !!roundedResult,
        calculationSteps: !!roundedResult?.calculation_steps,
        proportionalRoundingApplied: roundedResult?._proportional_rounding_applied,
        stateHasResult: !!calculationResult, // This might still be old state
        newResultKeys: roundedResult ? Object.keys(roundedResult) : null
      });
      setShippingError(null); // Clear any previous shipping errors
      
      // Sync shipping method dropdown with calculation results
      syncShippingMethodFromCalculation(result);
    } catch (error) {
      logger.error('❌ [DEBUG] Calculation error details:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : null,
        originCountry,
        destinationCountry,
        validItemsCount: items.filter(item => item.unit_price_origin > 0).length
      });
      
      // Check if it's a shipping route error
      if (error instanceof Error && error.message.includes('No shipping route configured')) {
        setShippingError(error.message);
        toast({
          title: 'Shipping Route Missing',
          description: `No shipping route configured for ${originCountry} → ${destinationCountry}`,
          variant: 'destructive'
        });
      } else {
        setShippingError(null);
        toast({
          title: 'Calculation Error',
          description: `Failed to calculate quote: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: 'destructive'
        });
      }
    } finally {
      setCalculating(false);
    }
  };

  const saveQuote = async () => {
    logger.debug({
      isEditMode,
      quoteId,
      customerEmail,
      hasCalculationResult: !!calculationResult,
      hasCalculationSteps: !!(calculationResult && calculationResult.calculation_steps),
      calculationResultType: typeof calculationResult,
      calculationResultKeys: calculationResult ? Object.keys(calculationResult) : null
    });

    if (!customerEmail) {
      logger.error();
      toast({
        title: 'Missing Information',
        description: 'Please enter customer email',
        variant: 'destructive'
      });
      return;
    }

    // For new quotes, require calculation before saving
    // For existing quotes_v2 (edit mode), allow field updates without recalculation
    const needsCalculation = !isEditMode && (!calculationResult || !calculationResult.calculation_steps);
    logger.debug({
      isEditMode,
      needsCalculation,
      hasCalculationResult: !!calculationResult,
      hasCalculationSteps: !!(calculationResult && calculationResult.calculation_steps)
    });

    if (needsCalculation) {
      logger.error();
      toast({
        title: 'No Calculation',
        description: 'Please calculate the quote first',
        variant: 'destructive'
      });
      return;
    }

    logger.info();

    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Prepare base quote data (always included)
      const baseQuoteData = {
        customer_email: customerEmail,
        customer_name: customerName,
        customer_phone: customerPhone,
        origin_country: originCountry,
        destination_country: destinationCountry,
        shipping_method: shippingMethod,
        insurance_required: insuranceEnabled, // Save insurance preference
        items: items.filter(item => item.unit_price_origin > 0).map(item => ({
          ...item,
          costprice_origin: item.unit_price_origin, // Map back to V2 format
          weight: item.weight_kg,
          customer_notes: item.notes
        })),
        customer_currency: customerCurrency,
        admin_notes: adminNotes,
        discount_codes: discountCodes.length > 0 ? discountCodes : null,
      };

      // Add calculation data only if available (for new quotes or when recalculated)
      const quoteData = calculationResult && calculationResult.calculation_steps ? {
        ...baseQuoteData,
        calculation_data: calculationResult,
        total_quote_origincurrency: calculationResult.calculation_steps.total_quote_origincurrency || 0,
        total_quote_origincurrency: calculationResult.calculation_steps.total_quote_origincurrency || 0,
        status: 'calculated',
        calculated_at: new Date().toISOString(),
      } : {
        ...baseQuoteData,
        // For field-only updates, preserve existing status or set to draft
        status: isEditMode ? currentQuoteStatus : 'draft',
      };

      logger.debug({
        origin_country: quoteData.origin_country,
        destination_country: quoteData.destination_country,
        customer_name: quoteData.customer_name,
        customer_email: quoteData.customer_email,
        admin_notes: quoteData.admin_notes,
        itemsCount: quoteData.items.length,
        hasCalculation: !!(calculationResult && calculationResult.calculation_steps)
      });

      let result;
      if (isEditMode && quoteId) {
        // Update existing quote
        logger.debug({
          quoteId,
          updateData: {
            origin_country: quoteData.origin_country,
            destination_country: quoteData.destination_country,
            customer_name: quoteData.customer_name,
            customer_email: quoteData.customer_email,
            admin_notes: quoteData.admin_notes
          }
        });
        
        const { data, error } = await supabase
          .from('quotes_v2')
          .update(quoteData)
          .eq('id', quoteId)
          .select()
          .single();

        if (error) {
          logger.error('❌ [DEBUG] Database update error:', error);
          throw error;
        }
        
        logger.info({
          returnedData: {
            origin_country: data.origin_country,
            destination_country: data.destination_country,
            customer_name: data.customer_name,
            updated_at: data.updated_at
          }
        });
        
        result = data;
        
        // Show different success messages based on what was updated
        const hasCalculation = calculationResult && calculationResult.calculation_steps;
        toast({
          title: 'Success',
          description: hasCalculation 
            ? 'Quote updated successfully with new calculation' 
            : 'Quote fields updated successfully'
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
            logger.error('Failed to track coupon usage:', trackingResult.error);
          }
        } catch (trackingError) {
          logger.error('Error tracking coupon usage:', trackingError);
          // Don't fail the quote save if tracking fails
        }
      }
    } catch (error) {
      logger.error('Save error:', error);
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
      logger.error('Error updating status:', error);
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

  const getCustomerCurrency = async (countryCode: string, customerId?: string): Promise<string> => {
    // Use CurrencyCalculationService for customer-aware currency resolution
    try {
      const { CurrencyCalculationService } = await import('@/services/quote-calculator/CurrencyCalculationService');
      const currencyCalcService = new CurrencyCalculationService();
      return await currencyCalcService.getCustomerCurrency(countryCode, customerId);
    } catch (error) {
      console.warn('Failed to get customer currency, using fallback:', error);
      // Fallback to hardcoded mapping
      const countryCurrencyMap: Record<string, string> = {
        IN: 'INR',
        NP: 'NPR',
        US: 'USD',
        CA: 'CAD',
        GB: 'GBP',
        AU: 'AUD',
      };
      return countryCurrencyMap[countryCode] || 'USD';
    }
  };

  const taxInfo = simplifiedQuoteCalculator.getTaxInfo(destinationCountry);
  // Use dynamic shipping methods if available, otherwise fallback to hardcoded
  const shippingMethods = dynamicShippingMethods.length > 0 
    ? dynamicShippingMethods 
    : simplifiedQuoteCalculator.getShippingMethods();

  // Ensure shipping method is always valid when shipping methods are available
  useEffect(() => {
    if (shippingMethods.length > 0) {
      // Check if current shipping method exists in available options
      const currentMethodExists = shippingMethods.some(method => method.value === shippingMethod);
      
      if (!shippingMethod || !currentMethodExists) {
        // Prefer 'standard' if available, otherwise select the first option
        const standardOption = shippingMethods.find(method => method.value === 'standard');
        const selectedMethod = standardOption ? 'standard' : shippingMethods[0].value;
        
        console.log(`🎯 [Shipping Init] Ensuring valid shipping method: ${selectedMethod}`);
        setShippingMethod(selectedMethod);
      }
    }
  }, [shippingMethods, shippingMethod]);

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
                  <OptimizedIcon name="Eye" className="mr-1 h-3 w-3" />
                  Email Sent
                </Badge>
              )}
              {expiresAt && (() => {
                const expiryStatus = getExpiryStatus();
                return expiryStatus ? (
                  <Badge variant="outline" className={expiryStatus.color}>
                    <OptimizedIcon name="Clock" className="mr-1 h-3 w-3" />
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
                <SelectTrigger className="w-32 h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0">
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
                  <OptimizedIcon name="ArrowRight" className="h-3 w-3" />
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
                    <OptimizedIcon name="FileText" className="h-3 w-3" />
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
                  total_quote_origincurrency: calculationResult?.calculation_steps?.total_quote_origincurrency || calculationResult?.total || 0,
                  total_quote_origincurrency: calculationResult?.calculation_steps?.total_quote_origincurrency || calculationResult?.totalCustomerCurrency || 0,
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
                  final_total_origincurrency: calculationResult?.total || 0,
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
              <OptimizedIcon name="Calculator" className="w-4 h-4 mr-2" />
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Name */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <OptimizedIcon name="User" className="h-3 w-3 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-blue-700 uppercase tracking-wide">Name</div>
                  <div className="text-sm text-gray-800 truncate">
                    {customerName || 'Not provided'}
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <OptimizedIcon name="Mail" className="h-3 w-3 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-blue-700 uppercase tracking-wide">Email</div>
                  <div className="text-sm text-gray-800 truncate">
                    {customerEmail || 'Not provided'}
                  </div>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                  <OptimizedIcon name="Phone" className="h-3 w-3 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-purple-700 uppercase tracking-wide">Phone</div>
                  <div className="text-sm text-gray-800 truncate">
                    {customerPhone || 'Not provided'}
                  </div>
                </div>
              </div>

              {/* Delivery Address - Compact */}
              {deliveryAddress ? (
                <div className="flex items-center gap-1">
                  <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center relative">
                    <OptimizedIcon name="MapPin" className="h-3 w-3 text-teal-600" />
                    {deliveryAddress.is_default && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                        <OptimizedIcon name="CheckCircle" className="h-2 w-2 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-teal-700 uppercase tracking-wide">Address</div>
                    {(() => {
                      const addressDisplay = getAddressDisplay(deliveryAddress, showAddressDetails);
                      return addressDisplay.isMultiline ? (
                        <div className="text-sm text-gray-800">
                          {addressDisplay.lines?.map((line, index) => (
                            <div key={index} className="leading-tight">
                              {line}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-800 truncate">
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
                      <OptimizedIcon name="EyeOff" className="h-2.5 w-2.5 text-gray-600" />
                    ) : (
                      <OptimizedIcon name="Eye" className="h-2.5 w-2.5 text-gray-600" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <OptimizedIcon name="MapPin" className="h-3 w-3 text-gray-400" />
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="Customer Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                />
                <Input
                  type="email"
                  placeholder="Email Address"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                />
                <Input
                  placeholder="Phone Number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                />
              </div>
            </div>
          )}

          {/* Route & Shipping - Professional International Design */}
          <Card>
            <CardContent className="p-6">
              {/* Compact 4-Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Origin Column */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-1">
                    <OptimizedIcon name="MapPin" className="h-3 w-3 text-blue-600" />
                    Origin
                  </Label>
                  <div className="space-y-2">
                    <Select value={originCountry} onValueChange={setOriginCountry} disabled={loadingCountries}>
                      <SelectTrigger className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0">
                        <SelectValue placeholder={loadingCountries ? "Loading..." : "Origin country"} />
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
                        <SelectTrigger className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0">
                          <SelectValue placeholder="State" />
                            </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No tax (0%)</SelectItem>
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
                  <Label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-1">
                    <OptimizedIcon name="MapPin" className="h-3 w-3 text-blue-600" />
                    Destination
                    {userOverrodeDestination && (
                      <span className="text-xs text-blue-600 font-medium ml-1">Manual</span>
                    )}
                  </Label>
                  <div className="space-y-2">
                    <Select 
                      value={destinationCountry} 
                      onValueChange={handleUserDestinationChange}
                      key={`destination-${destinationCountry}`}
                    >
                      <SelectTrigger className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0">
                        <SelectValue placeholder="Destination" />
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
                    
                    {/* Compact location selectors */}
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
                        className={`h-10 text-xs ${
                          destinationPincode && !/^[1-9][0-9]{5}$/.test(destinationPincode) 
                            ? 'border-amber-300' 
                            : destinationPincode 
                              ? 'border-blue-300' 
                              : ''
                        }`}
                      />
                    )}
                    
                    {destinationCountry === 'NP' ? (
                      <div className="space-y-2">
                          {/* Professional Searchable Combobox */}
                          <Popover open={ncmComboboxOpen} onOpenChange={setNCMComboboxOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={ncmComboboxOpen}
                                className="w-full h-10 justify-between text-sm border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 text-left"
                                disabled={loadingNCMBranches || availableNCMBranches.length === 0}
                              >
                                <span className="truncate">
                                  {selectedNCMBranch
                                    ? `${selectedNCMBranch.district} (${selectedNCMBranch.name})`
                                    : loadingNCMBranches
                                      ? "Loading branches..."
                                      : availableNCMBranches.length === 0
                                        ? "No branches available"
                                        : "Search and select branch..."
                                  }
                                </span>
                                <svg
                                  className="ml-2 h-4 w-4 shrink-0 opacity-50"
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="m6 9 6 6 6-6" />
                                </svg>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                              <Command>
                                <CommandInput 
                                  placeholder="Search branches by district, name, or area..." 
                                  className="h-10"
                                />
                                <CommandEmpty>No branches found.</CommandEmpty>
                                <CommandList className="max-h-64 overflow-y-auto">
                                  {(() => {
                                    // Group branches by major cities first
                                    const majorCities = ['KATHMANDU', 'POKHARA', 'CHITWAN', 'BIRATNAGAR', 'BIRGUNJ'];
                                    const majorCityBranches = availableNCMBranches.filter(branch => 
                                      majorCities.some(city => 
                                        branch.district.toUpperCase().includes(city) || 
                                        branch.name.toUpperCase().includes(city)
                                      )
                                    );
                                    
                                    const otherBranches = availableNCMBranches.filter(branch => 
                                      !majorCityBranches.includes(branch)
                                    );

                                    return (
                                      <>
                                        {majorCityBranches.length > 0 && (
                                          <CommandGroup heading="Major Cities">
                                            {majorCityBranches.map((branch) => (
                                              <CommandItem
                                                key={branch.name}
                                                value={`${branch.district} ${branch.name} ${branch.coveredAreas?.join(' ') || ''}`}
                                                onSelect={() => {
                                                  setSelectedNCMBranch(branch);
                                                  setNCMComboboxOpen(false);
                                                  
                                                  // Track manual override
                                                  if (isAutoSelected) {
                                                    setUserOverrodeNCMBranch(true);
                                                    setIsAutoSelected(false);
                                                    console.log(`User manually selected: ${branch.name}`);
                                                  }
                                                  
                                                  // Clear suggestions
                                                  setSuggestedNCMBranches([]);
                                                }}
                                                className="cursor-pointer"
                                              >
                                                <div className="flex flex-col gap-1 w-full">
                                                  <div className="flex items-center justify-between">
                                                    <span className="font-medium text-gray-900">
                                                      {branch.district} ({branch.name})
                                                    </span>
                                                    <Badge variant="secondary" className="text-sm px-2 ml-2">
                                                      Major
                                                    </Badge>
                                                  </div>
                                                  <div className="flex items-center justify-between text-xs">
                                                    {branch.coveredAreas && branch.coveredAreas.length > 0 && (
                                                      <span className="text-gray-500 truncate">
                                                        Covers: {branch.coveredAreas.slice(0, 2).join(', ')}
                                                      </span>
                                                    )}
                                                    <span className="text-blue-600 ml-2">
                                                      {getDeliveryEstimate(branch)}
                                                    </span>
                                                  </div>
                                                </div>
                                              </CommandItem>
                                            ))}
                                          </CommandGroup>
                                        )}
                                        
                                        {otherBranches.length > 0 && (
                                          <CommandGroup heading="Other Branches">
                                            {otherBranches.map((branch) => (
                                              <CommandItem
                                                key={branch.name}
                                                value={`${branch.district} ${branch.name} ${branch.coveredAreas?.join(' ') || ''}`}
                                                onSelect={() => {
                                                  setSelectedNCMBranch(branch);
                                                  setNCMComboboxOpen(false);
                                                  
                                                  // Track manual override
                                                  if (isAutoSelected) {
                                                    setUserOverrodeNCMBranch(true);
                                                    setIsAutoSelected(false);
                                                    console.log(`User manually selected: ${branch.name}`);
                                                  }
                                                  
                                                  // Clear suggestions
                                                  setSuggestedNCMBranches([]);
                                                }}
                                                className="cursor-pointer"
                                              >
                                                <div className="flex flex-col gap-1 w-full">
                                                  <span className="font-medium text-gray-900">
                                                    {branch.district} ({branch.name})
                                                  </span>
                                                  <div className="flex items-center justify-between text-xs">
                                                    {branch.coveredAreas && branch.coveredAreas.length > 0 && (
                                                      <span className="text-gray-500 truncate">
                                                        Covers: {branch.coveredAreas.slice(0, 2).join(', ')}
                                                      </span>
                                                    )}
                                                    <span className="text-blue-600 ml-2">
                                                      {getDeliveryEstimate(branch)}
                                                    </span>
                                                  </div>
                                                </div>
                                              </CommandItem>
                                            ))}
                                          </CommandGroup>
                                        )}
                                      </>
                                    );
                                  })()}
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        
                      </div>
                    ) : (!destinationPincode && destinationCountry !== 'IN') ? (
                      /* Other countries - Show Urban/Rural dropdown */
                      <Select value={destinationState} onValueChange={setDestinationState}>
                        <SelectTrigger className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0">
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
                  <Label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-1">
                    <OptimizedIcon name="Truck" className="h-3 w-3 text-blue-600" />
                    International Shipping
                    {calculationResult?.route_calculations?.delivery_option_used?.id === shippingMethod && (
                      <span className="text-xs text-blue-600 ml-1">(Auto)</span>
                    )}
                  </Label>
                  <div className="space-y-2">
                    {shippingMethods.length > 0 ? (
                    <Select 
                      value={shippingMethod} 
                      onValueChange={(value: any) => setShippingMethod(value)}
                      key={`shipping-select-${shippingMethods.length}-${shippingMethod}`}
                    >
                      <SelectTrigger className={`h-10 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 ${
                        calculationResult?.route_calculations?.delivery_option_used?.id === shippingMethod 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-300'
                      }`}>
                        <SelectValue placeholder="Select shipping method" />
                      </SelectTrigger>
                      <SelectContent>
                        {shippingMethods.map(method => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label} - {currencySymbol}{method.rate}/{weightUnit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    ) : (
                      <div className="h-10 px-3 rounded-lg border border-gray-300 bg-gray-50 flex items-center text-sm text-gray-500">
                        Loading shipping methods...
                      </div>
                    )}
                    
                    {/* Nepal Delivery Method - moved from destination */}
                    {selectedNCMBranch && destinationCountry === 'NP' && (
                      <Select 
                        value={ncmServiceType} 
                        onValueChange={(value: 'pickup' | 'collect') => setNcmServiceType(value)}
                        disabled={loadingNCMRates}
                      >
                        <SelectTrigger className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0">
                          <SelectValue placeholder="Delivery method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pickup">Door Delivery</SelectItem>
                          <SelectItem value="collect">Branch Pickup</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                  {/* Country-Specific Service Options */}
                  {destinationCountry === 'IN' && destinationPincode && /^[1-9][0-9]{5}$/.test(destinationPincode) && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-4 w-4 rounded bg-blue-200 flex items-center justify-center">
                          <OptimizedIcon name="Truck" className="h-3 w-3 text-blue-700" />
                        </div>
                        <Label className="text-sm font-medium text-blue-800">India Service Type</Label>
                      </div>
                      <Select 
                        value={delhiveryServiceType} 
                        onValueChange={(value: 'standard' | 'express' | 'same_day') => setDelhiveryServiceType(value)}
                        disabled={loadingServices}
                      >
                        <SelectTrigger className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0">
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableServices.map((service) => (
                            <SelectItem key={service.value} value={service.value}>
                              <div className="flex items-center gap-2">
                                <div className="h-4 w-4 rounded bg-gray-100 flex items-center justify-center">
                                  {service.value === 'standard' && <OptimizedIcon name="Package" className="h-3 w-3 text-gray-600" />}
                                  {service.value === 'express' && <OptimizedIcon name="Clock" className="h-3 w-3 text-blue-600" />}
                                  {service.value === 'same_day' && <OptimizedIcon name="CheckCircle" className="h-3 w-3 text-blue-600" />}
                                </div>
                                <span>{service.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  </div>
                </div>

                {/* Payment Column */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-1">
                    <OptimizedIcon name="CreditCard" className="h-3 w-3 text-blue-600" />
                    Payment
                  </Label>
                  <div className="space-y-2">
                    <Select value={paymentGateway} onValueChange={setPaymentGateway}>
                      <SelectTrigger className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0">
                        <SelectValue placeholder="Payment gateway" />
                      </SelectTrigger>
                      <SelectContent>
                        {simplifiedQuoteCalculator.getPaymentGateways().map(gateway => (
                          <SelectItem key={gateway.value} value={gateway.value}>
                            <div className="flex items-center justify-between w-full">
                              <span>{gateway.label}</span>
                              <span className="text-xs text-gray-500">
                                {gateway.fees.percentage}%
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Insurance Toggle */}
                    <div className="flex items-center justify-between px-3 h-10 rounded-lg bg-gray-50/50">
                      <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <OptimizedIcon name="Shield" className="h-3 w-3 text-blue-600" />
                        Insurance
                      </Label>
                      <Switch
                        checked={insuranceEnabled}
                        onCheckedChange={setInsuranceEnabled}
                        disabled={!calculationResult?.route_calculations?.insurance?.available}
                        className="data-[state=checked]:bg-blue-600 scale-75"
                      />
                    </div>
                  </div>
                </div>
              </div>


              {/* Status indicators for validation */}
              <div className="flex flex-wrap gap-2 text-xs mt-3 pt-2 border-t">
                {destinationCountry === 'IN' && destinationPincode && (
                  <div className="flex items-center">
                    {/^[1-9][0-9]{5}$/.test(destinationPincode) ? (
                      <span className="text-blue-600 flex items-center">
                        <OptimizedIcon name="Check" className="h-3 w-3 mr-1" />
                        Pincode valid - Delhivery rates active
                      </span>
                    ) : (
                      <span className="text-orange-600 flex items-center">
                        <OptimizedIcon name="AlertCircle" className="h-3 w-3 mr-1" />
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
                    <OptimizedIcon name="Clock" className="h-3 w-3 mr-1 animate-spin" />
                    Loading NCM rates...
                  </span>
                )}
                {destinationCountry === 'NP' && ncmRates?.rates && (
                  <span className="text-blue-600 flex items-center">
                    <OptimizedIcon name="Check" className="h-3 w-3 mr-1" />
                    NCM rates loaded • {ncmRates.markup_applied}% markup
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Items - Each item as separate card */}
          {items.map((item, index) => (
            <Card key={item.id} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              {/* Clean Professional Header */}
              <CardHeader className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                      {index + 1}
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      Item {index + 1}
                    </h4>
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
                              price_usd: item.unit_price_origin
                            });
                            if (suggestion) {
                              const confidence = Math.round(suggestion.confidence_score * 100);
                              updateItem(item.id, 'hsn_code', suggestion.classification_code);
                              updateItem(item.id, 'weight_kg', suggestion.suggested_weight_kg);
                              updateItem(item.id, 'category', suggestion.category);
                              toast({
                                title: "🤖 Smart Enhancement Applied",
                                description: `Applied HSN: ${suggestion.classification_code}, Weight: ${suggestion.suggested_weight_kg}${weightUnit}, Category: ${suggestion.category} (${confidence}% confidence)`,
                                duration: 5000,
                              });
                              
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
                            logger.error('Smart enhancement error:', error);
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
                      className="text-sm h-8 px-3 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 text-purple-700 hover:from-purple-100 hover:to-blue-100"
                      disabled={!item.name || smartFeatureLoading[`enhance-${item.id}`]}
                    >
                      <OptimizedIcon name="Sparkles" className={`w-3 h-3 mr-1 ${smartFeatureLoading[`enhance-${item.id}`] ? 'animate-spin' : ''}`} />
                      {smartFeatureLoading[`enhance-${item.id}`] ? 'Enhancing...' : 'AI'}
                    </Button>
                    {items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                      >
                        <OptimizedIcon name="Trash2" className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                {/* Product Images Section */}
                {item.images && item.images.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Label className="text-sm font-medium text-gray-700">Product Images</Label>
                      <Badge variant="secondary" className="text-sm px-2">
                        {item.images.length} image{item.images.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {item.images.slice(0, 4).map((imageUrl, imageIndex) => (
                        <div 
                          key={imageIndex} 
                          className="relative group cursor-pointer"
                          onClick={() => window.open(imageUrl, '_blank')}
                        >
                          <img
                            src={imageUrl}
                            alt={`${item.name} - Image ${imageIndex + 1}`}
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                            <OptimizedIcon name="ExternalLink" className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          {imageIndex === 0 && (
                            <Badge 
                              variant="default" 
                              className="absolute -top-1 -right-1 text-xs px-1 py-0 h-4"
                            >
                              Main
                            </Badge>
                          )}
                        </div>
                      ))}
                      {item.images.length > 4 && (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center text-xs text-gray-500">
                          +{item.images.length - 4} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Product URL & Name Section - Inline Layout */}
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-4 items-start">
                    {/* Product URL - Dynamic width */}
                    <div className="col-span-4 space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Product URL
                      </Label>
                      <EditableUrlInput
                        value={item.url}
                        onChange={(value) => updateItem(item.id, 'url', value)}
                        placeholder="https://www.amazon.com/product-link"
                        showFetchButton={true}
                        onDataFetched={(data) => {
                              try {
                                console.log('🚀 FETCH COMPLETE - Auto-filling data immediately:', data);
                                
                                // Find current item state to ensure we have latest values
                                const currentItem = items.find(i => i.id === item.id);
                                console.log('🎯 Current item before auto-fill:', { 
                                  id: item.id, 
                                  name: currentItem?.name || item.name, 
                                  price: currentItem?.unit_price_origin || item.unit_price_origin, 
                                  weight: currentItem?.weight_kg || item.weight_kg 
                                });
                                
                                const updatedFields: string[] = [];
                                
                                // Update product name (ALWAYS overwrite if new data is available)
                                if (data.productName && 
                                    typeof data.productName === 'string' && 
                                    data.productName.trim() &&
                                    data.productName.trim() !== 'Unknown Product') {
                                  const newName = data.productName.trim();
                                  console.log('🎯 AUTO-FILL: Overwriting product name:', {
                                    old: currentItem?.name || item.name, 
                                    new: newName, 
                                    itemId: item.id
                                  });
                                  updateItem(item.id, 'name', newName);
                                  updatedFields.push('name');
                                } else {
                                  logger.warn(data.productName);
                                }
                                
                                // Update price with validation (ALWAYS overwrite if new data is valid)
                                if (data.price && typeof data.price === 'number' && data.price > 0 && isFinite(data.price)) {
                                  console.log('🎯 AUTO-FILL: Overwriting price:', {
                                    old: currentItem?.unit_price_origin || item.unit_price_origin, 
                                    new: data.price, 
                                    itemId: item.id
                                  });
                                  updateItem(item.id, 'unit_price_origin', data.price);
                                  updatedFields.push('price');
                                } else {
                                  logger.warn(data.price);
                                }
                                
                                // Update weight with validation (ALWAYS overwrite if new data is valid)
                                if (data.weight && typeof data.weight === 'number' && data.weight > 0 && isFinite(data.weight)) {
                                  console.log('🎯 AUTO-FILL: Overwriting weight:', {
                                    old: currentItem?.weight_kg || item.weight_kg, 
                                    new: data.weight, 
                                    itemId: item.id
                                  });
                                  updateItem(item.id, 'weight_kg', data.weight);
                                  updatedFields.push('weight');
                                } else {
                                  logger.warn(data.weight);
                                }
                                
                                // Update category (always useful)
                                if (data.category && typeof data.category === 'string' && data.category.trim()) {
                                  const newCategory = data.category.trim();
                                  console.log('🎯 AUTO-FILL: Overwriting category:', {
                                    old: currentItem?.category || item.category,
                                    new: newCategory,
                                    itemId: item.id
                                  });
                                  updateItem(item.id, 'category', newCategory);
                                  updatedFields.push('category');
                                } else {
                                  logger.warn(data.category);
                                }
                                
                                // Update HSN code if available
                                if (data.hsn && typeof data.hsn === 'string' && data.hsn.trim()) {
                                  console.log('🎯 AUTO-FILL: Setting HSN code:', data.hsn);
                                  updateItem(item.id, 'hsn_code', data.hsn.trim());
                                  updatedFields.push('HSN code');
                                } else {
                                  logger.warn(data.hsn);
                                }
                                
                                // Log currency information (handled at quote level)
                                if (data.currency) {
                                  console.log('ℹ️ Currency from scraping:', data.currency);
                                }
                                
                                // Handle product images from scraping with validation
                                const images = (data as any).images;
                                if (images && Array.isArray(images) && images.length > 0) {
                                  // Filter valid image URLs
                                  const validImages = images.filter(img => 
                                    typeof img === 'string' && 
                                    img.trim() && 
                                    (img.startsWith('http://') || img.startsWith('https://'))
                                  );
                                  
                                  if (validImages.length > 0) {
                                    updateItem(item.id, 'images', validImages);
                                    updateItem(item.id, 'main_image', validImages[0]); // First image as main
                                    updatedFields.push(`${validImages.length} image${validImages.length > 1 ? 's' : ''}`);
                                    logger.info(validImages.length, 'valid images');
                                  } else {
                                    logger.warn('⚠️ No valid image URLs found in:', images);
                                  }
                                }
                                
                                // Auto-save scraped data immediately to database
                                if (updatedFields.length > 0) {
                                  console.log('💾 Auto-saving scraped data to database immediately...');
                                  
                                  // Get current items state for saving
                                  const currentItems = items;
                                  
                                  // Immediate save since this is scraped data (critical)
                                  autoSaveService.immediatelyAutoSaveQuoteItems(
                                    quoteId!, 
                                    currentItems, 
                                    { 
                                      showToast: false, // We'll show our own toast below
                                      description: 'scraped product data'
                                    }
                                  ).then((success) => {
                                    if (success) {
                                      logger.info();
                                      toast({
                                        title: "🔄 Product Data Overwritten & Saved",
                                        description: `Successfully updated and saved: ${updatedFields.join(', ')} (existing values were replaced)`,
                                        duration: 4000,
                                      });
                                    } else {
                                      logger.error('❌ Failed to auto-save scraped data');
                                      toast({
                                        title: "🔄 Product Data Overwritten",
                                        description: `Updated: ${updatedFields.join(', ')} (existing values were replaced). Warning: Auto-save failed.`,
                                        duration: 6000,
                                        variant: "destructive"
                                      });
                                    }
                                  }).catch((error) => {
                                    logger.error('❌ Auto-save error:', error);
                                    toast({
                                      title: "🔄 Product Data Overwritten", 
                                      description: `Updated: ${updatedFields.join(', ')}. Warning: Save failed, changes may be lost.`,
                                      duration: 6000,
                                      variant: "destructive"
                                    });
                                  });
                                } else {
                                  toast({
                                    title: "⚠️ No Valid Data Found",
                                    description: "Scraping completed but no valid data was available for updating fields.",
                                    duration: 3000,
                                    variant: "default"
                                  });
                                }
                                
                              } catch (error) {
                                logger.error('❌ Error during auto-fill:', error);
                                toast({
                                  title: "❌ Auto-Fill Error",
                                  description: "Product data was retrieved but couldn't be populated due to an error.",
                                  duration: 3000,
                                  variant: "destructive"
                                });
                              }
                      }}
                    />
                    </div>

                    {/* Product Name - Flexible width */}
                    <div className="col-span-8 space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Product Name
                      </Label>
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        placeholder="e.g., iPhone 15 Pro, Samsung Galaxy S23, Sony WH-1000XM5"
                        className="h-10 text-sm font-medium border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                      />
                    </div>
                  </div>
                </div>

                {/* Pricing & Details Section */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Pricing & Details
                  </Label>
                  <div className="grid grid-cols-[80px_1px_100px_1px_1fr_1px_2fr] gap-4 p-4 bg-gray-50/50 rounded-lg border border-gray-200">
                    {/* Quantity Column - FIRST for better UX flow */}
                    <div className="space-y-2 h-18 flex flex-col justify-between">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 font-medium">Quantity</div>
                      </div>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="h-10 text-center text-sm font-medium border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                      />
                    </div>

                    {/* Separator */}
                    <div className="w-px bg-gray-300 self-stretch"></div>

                    {/* Price Column - SECOND */}
                    <div className="space-y-2 h-18 flex flex-col justify-between">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 font-medium">Price ({originCurrency})</div>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price_origin || ''}
                        onChange={(e) => updateItem(item.id, 'unit_price_origin', parseFloat(e.target.value) || 0)}
                        placeholder="25.99"
                        className="h-10 text-center text-sm font-medium border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                      />
                    </div>

                    {/* Separator */}
                    <div className="w-px bg-gray-300 self-stretch"></div>

                    {/* Weight Column - Clean Horizontal Layout */}
                    <div className="space-y-2 h-18 flex flex-col justify-between">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 font-medium">Weight ({weightUnit})</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          value={item.weight_kg || ''}
                          onChange={(e) => updateItem(item.id, 'weight_kg', parseFloat(e.target.value) || undefined)}
                          placeholder="0.5"
                          className="h-10 text-center text-sm font-medium flex-1 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                        />
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
                                  updateItem(item.id, 'ai_weight_suggestion', {
                                    weight: suggestion.suggested_weight_kg,
                                    confidence: suggestion.weight_confidence || 0
                                  });
                                  toast({
                                    title: "Weight Estimated",
                                    description: `Estimated weight: ${suggestion.suggested_weight_kg}${weightUnit} (${Math.round((suggestion.weight_confidence || 0) * 100)}% confidence)`,
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
                                logger.error('Weight estimation error:', error);
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
                          className="h-8 w-8 p-0 bg-gradient-to-r from-blue-50 to-blue-50 border-blue-200 text-blue-700 hover:from-blue-100 hover:to-blue-100"
                          disabled={(!item.name && !item.category) || smartFeatureLoading[`weight-${item.id}`]}
                          title="Get AI weight estimate"
                        >
                          <OptimizedIcon name="Brain" className={`w-3 h-3 ${smartFeatureLoading[`weight-${item.id}`] ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setVolumetricModalOpen(item.id)}
                          className="h-8 w-8 p-0 bg-gradient-to-r from-blue-50 to-blue-50 border-blue-200 text-blue-700 hover:from-blue-100 hover:to-blue-100"
                          title="Set Dimensions"
                        >
                          <OptimizedIcon name="Ruler" className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Separator */}
                    <div className="w-px bg-gray-300 self-stretch"></div>

                    {/* HSN & Category Column */}
                    <div className="space-y-2 min-h-18 flex flex-col justify-between min-w-0">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 font-medium">HSN / Category</div>
                      </div>
                      <div className="w-full overflow-visible h-auto min-h-10">
                        <CompactHSNSearch
                          control={null}
                          index={0}
                          setValue={(name: string, value: any) => {
                            if (name.includes('hsnCode') || name === 'hsnCode') {
                              updateItem(item.id, 'hsn_code', value);
                            }
                            if (name.includes('category') || name === 'category') {
                              updateItem(item.id, 'category', value);
                            }
                            if (name.includes('useHsnRates') || name === 'useHsnRates') {
                              updateItem(item.id, 'use_hsn_rates', value);
                            }
                          }}
                          currentHSN={item.hsn_code || ''}
                          currentCategory={item.category || ''}
                          productName={item.name}
                          countryCode={destinationCountry}
                          currentUseHSNRates={item.use_hsn_rates || false}
                          currentValuationPreference={item.valuation_preference || 'auto'}
                          onHSNRateToggle={(useHSNRates: boolean) => {
                            updateItem(item.id, 'use_hsn_rates', useHSNRates);
                          }}
                          onValuationChange={(preference: 'auto' | 'product_price' | 'minimum_valuation') => {
                            updateItem(item.id, 'valuation_preference', preference);
                          }}
                        />
                      </div>
                  </div>
                </div>

                {/* Dynamic Information Panel - Shows calculations when available */}
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
                  const chargeableWeight = Math.max(actualWeight, volumetricWeight);
                  
                  return (
                    <div className="mt-4 p-4 rounded-lg border border-blue-100 bg-blue-50/30">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <OptimizedIcon name="Scale" className="w-3 h-3 text-blue-600" />
                        </div>
                        <h6 className="text-sm font-semibold text-blue-900">Shipping Weight Calculation</h6>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center justify-between px-3 h-10 rounded-lg bg-white/70 border border-blue-150">
                          <span className="text-gray-600">Dimensions:</span>
                          <span className="font-medium text-gray-900">{length} × {width} × {height} {unit}</span>
                        </div>
                        
                        <div className="flex items-center justify-between px-3 h-10 rounded-lg bg-white/70 border border-blue-150">
                          <span className="text-gray-600">Volumetric:</span>
                          <span className="font-medium text-gray-900">{volumetricWeight.toFixed(2)}{weightUnit}</span>
                        </div>
                        
                        <div className="flex items-center justify-between px-3 h-10 rounded-lg bg-white/70 border border-blue-150">
                          <span className="text-gray-600">Actual:</span>
                          <span className="font-medium text-gray-900">{actualWeight.toFixed(2)}{weightUnit}</span>
                        </div>
                      </div>
                      
                      <div className={`mt-3 p-3 rounded-lg border-2 ${
                        isVolumetric 
                          ? 'bg-orange-50 border-orange-200' 
                          : 'bg-blue-50 border-blue-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className={`font-medium ${
                            isVolumetric ? 'text-orange-800' : 'text-blue-800'
                          }`}>
                            Chargeable Weight:
                          </span>
                          <span className={`text-lg font-bold ${
                            isVolumetric ? 'text-orange-900' : 'text-blue-900'
                          }`}>
                            {chargeableWeight.toFixed(2)}{weightUnit} {isVolumetric ? '(volumetric)' : '(actual)'}
                          </span>
                        </div>
                        {isVolumetric && (
                          <p className="text-xs text-orange-700 mt-1">
                            Using volumetric weight because it's higher than actual weight
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Advanced Options - Collapsible */}
                <div className="border-t pt-4">
                  <button
                    type="button"
                    onClick={() => toggleAdvancedOptions(item.id)}
                    className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <OptimizedIcon name="Settings" className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Advanced Options</span>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <span>Discounts</span>
                        <span>•</span>
                        <span>Dimensions</span>
                        <span>•</span>
                        <span>Settings</span>
                      </div>
                    </div>
                    <OptimizedIcon name="ChevronDown" className={`w-4 h-4 text-gray-500 transition-transform group-hover:text-gray-700 ${
                      advancedOptionsExpanded[item.id] ? 'rotate-180' : ''
                    }`} />
                  </button>
                  
                  {advancedOptionsExpanded[item.id] && (
                    <div className="mt-4 space-y-4">
                      {/* Discount Section */}
                      <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50/30">
                        <h6 className="text-sm font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                          <OptimizedIcon name="Tag" className="w-4 h-4" />
                          Item Discount
                        </h6>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium text-yellow-700">Type:</Label>
                            <select
                              className="text-sm border rounded px-3 py-1 bg-white"
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
                              <option value="percentage">Percentage (%)</option>
                              <option value="amount">Fixed Amount ({currencySymbol})</option>
                            </select>
                          </div>
                          
                          <div className="flex-1">
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
                                  {item.discount_type === 'amount' ? currencySymbol : '%'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Show savings */}
                          {((item.discount_type === 'percentage' && item.discount_percentage && item.discount_percentage > 0) ||
                            (item.discount_type === 'amount' && item.discount_amount && item.discount_amount > 0)) && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-300">
                              Save {currencySymbol}{item.discount_type === 'percentage' 
                                ? ((item.quantity * item.unit_price_origin * (item.discount_percentage || 0)) / 100).toFixed(2)
                                : (item.discount_amount || 0).toFixed(2)
                              }
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                    </div>
                  )}
                </div>
              </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Add Another Item Button - Separate card */}
          <Card className="border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors">
            <CardContent className="flex items-center justify-center p-8">
              <Button onClick={addItem} variant="outline" className="w-full max-w-md">
                <OptimizedIcon name="Plus" className="w-4 h-4 mr-2" />
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
                  <OptimizedIcon name="Calculator" className="h-5 w-5" />
                  Smart Discount System
                </div>
                {isDiscountSectionCollapsed ? (
                  <OptimizedIcon name="ChevronDown" className="h-4 w-4 text-gray-500" />
                ) : (
                  <OptimizedIcon name="ChevronUp" className="h-4 w-4 text-gray-500" />
                )}
              </CardTitle>
              <CardDescription>
                Automatic discounts are applied based on order details. Add coupon codes for additional savings.
              </CardDescription>
            </CardHeader>
            {!isDiscountSectionCollapsed && (
              <CardContent className="p-6 space-y-6">
              {/* Discount Preview Panel */}
              {customerEmail && destinationCountry && calculationResult && (
                <DiscountPreviewPanel
                  orderTotal={
                    calculationResult?.calculation_steps?.subtotal || 
                    calculationResult?.calculation_steps?.items_subtotal ||
                    items.reduce((sum, item) => sum + (item.quantity * item.unit_price_origin), 0) ||
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
                      items.reduce((sum, item) => sum + (item.quantity * item.unit_price_origin), 0) ||
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

                {/* Smart Savings Widget */}
                {calculationResult && (
                  <SmartSavingsWidget
                    customerId={customerEmail}
                    orderTotal={
                      calculationResult?.calculation_steps?.subtotal || 
                      calculationResult?.calculation_steps?.items_subtotal ||
                      items.reduce((sum, item) => sum + (item.quantity * item.unit_price_origin), 0) ||
                      0
                    }
                    countryCode={destinationCountry}
                    originCurrency={customerCurrency}
                    onDiscountApplied={(discount) => {
                      console.log('Discount applied:', discount);
                      // Handle discount application
                    }}
                  />
                )}

                {/* Applied Discounts Summary */}
                {discountCodes.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <OptimizedIcon name="Check" className="h-4 w-4 text-blue-600" />
                      Applied Discount Codes
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {discountCodes.map((code) => (
                        <Badge key={code} variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-800">
                          <OptimizedIcon name="Tag" className="w-3 h-3" />
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
                            className="ml-1 rounded-full hover:bg-blue-200 p-0.5 transition-colors"
                          >
                            <OptimizedIcon name="X" className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Discount Controls - Modern Interface */}
              <AdminDiscountControls 
                currencySymbol={currencySymbol}
                onDiscountChange={(discounts) => {
                  // Handle discount changes from the new component
                  const orderDiscounts = discounts.filter(d => d.type === 'order' && d.applied);
                  const shippingDiscounts = discounts.filter(d => d.type === 'shipping' && d.applied);
                  
                  // Update order discount state
                  if (orderDiscounts.length > 0) {
                    const discount = orderDiscounts[0]; // Take first order discount
                    setOrderDiscountType(discount.method === 'free' ? 'fixed' : discount.method);
                    setOrderDiscountValue(discount.value);
                  } else {
                    setOrderDiscountValue(0);
                  }
                  
                  // Update shipping discount state
                  if (shippingDiscounts.length > 0) {
                    const discount = shippingDiscounts[0]; // Take first shipping discount
                    setShippingDiscountType(discount.method);
                    setShippingDiscountValue(discount.method === 'free' ? 0 : discount.value);
                  } else {
                    setShippingDiscountValue(0);
                  }
                }}
              />
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
            <CardContent className="p-6 space-y-4">
              <Button 
                onClick={calculateQuote} 
                className="w-full"
                disabled={calculating || !items.some(item => item.unit_price_origin > 0)}
              >
                <OptimizedIcon name="Calculator" className="w-4 h-4 mr-2" />
                {calculating ? 'Calculating...' : 'Calculate Quote'}
              </Button>
              
              {calculationResult && (
                <>
                  <Button 
                    onClick={() => setShowPreview(!showPreview)} 
                    variant="outline"
                    className="w-full"
                  >
                    <OptimizedIcon name="Eye" className="w-4 h-4 mr-2" />
                    {showPreview ? 'Hide' : 'Show'} Breakdown
                  </Button>
                  
                  <Button 
                    onClick={saveQuote} 
                    variant="default"
                    className="w-full"
                    disabled={loading}
                  >
                    <OptimizedIcon name="Save" className="w-4 h-4 mr-2" />
                    {loading ? 'Saving...' : (isEditMode ? 'Update Quote' : 'Save Quote')}
                  </Button>
                  
                  
                  {/* Email sending for edit mode */}
                  {isEditMode && calculationResult && currentQuoteStatus === 'calculated' && !emailSent && (
                    <Button 
                      onClick={() => setShowEmailSection(true)} 
                      variant="secondary"
                      className="w-full"
                    >
                      <OptimizedIcon name="Eye" className="w-4 h-4 mr-2" />
                      Send Quote Email
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Shipping Route Error */}
          {shippingError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <OptimizedIcon name="AlertCircle" className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-red-800 mb-1">
                      Shipping Route Missing
                    </div>
                    <div className="text-sm text-red-700 mb-3">
                      {shippingError}
                    </div>
                    <Button 
                      onClick={() => navigate('/admin/shipping-routes')} 
                      variant="outline" 
                      size="sm"
                      className="text-red-700 border-red-300 hover:bg-red-100"
                    >
                      <OptimizedIcon name="Settings" className="w-4 h-4 mr-2" />
                      Configure Shipping Route
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Breakdown using proper component - First in order */}
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
                items: items.filter(item => item.unit_price_origin > 0),
                calculation_data: calculationResult,
                total_quote_origincurrency: calculationResult.calculation_steps.total_quote_origincurrency || 0,
                total_quote_origincurrency: calculationResult.calculation_steps.total_quote_origincurrency || 0,
                customer_currency: customerCurrency,
                created_at: new Date().toISOString(),
                calculated_at: calculationResult.calculation_timestamp
              }}
            />
          )}

          {/* Quote Details & Analysis - Second in order */}
          {calculationResult && calculationResult.calculation_steps && (
            <QuoteDetailsAnalysis 
              quote={{
                id: 'temp-' + Date.now(),
                quote_number: 'PREVIEW',
                status: 'draft',
                customer_email: customerEmail || 'preview@example.com',
                customer_name: customerName,
                origin_country: originCountry,
                destination_country: destinationCountry,
                items: items.filter(item => item.unit_price_origin > 0),
                calculation_data: calculationResult,
                total_quote_origincurrency: calculationResult.calculation_steps.total_quote_origincurrency || 0,
                total_quote_origincurrency: calculationResult.calculation_steps.total_quote_origincurrency || 0,
                customer_currency: customerCurrency,
                created_at: new Date().toISOString(),
                calculated_at: calculationResult.calculation_timestamp
              }}
            />
          )}

          {/* Shipping Route Debug Component - Third in order */}
          {calculationResult && calculationResult.calculation_steps && (
            <ShippingRouteDebug
              routeCalculations={calculationResult.route_calculations}
              originCountry={originCountry}
              destinationCountry={destinationCountry}
              weight={items.reduce((sum, item) => sum + (item.weight_kg || 0.5) * item.quantity, 0)}
              itemValueUSD={items.reduce((sum, item) => sum + item.unit_price_origin * item.quantity, 0)}
              fallbackUsed={!calculationResult.route_calculations}
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