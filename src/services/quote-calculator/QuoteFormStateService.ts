/**
 * Quote Form State Service
 * Centralized form state management and validation for quote calculator
 * Decomposed from QuoteCalculatorV2 for better separation of concerns
 */

import { logger } from '@/utils/logger';
import { currencyService } from '@/services/CurrencyService';

export interface QuoteItem {
  id: string;
  name: string;
  url?: string;
  quantity: number;
  unit_price_origin: number;
  weight_kg?: number;
  category?: string;
  notes?: string;
  discount_percentage?: number;
  discount_amount?: number;
  discount_type?: 'percentage' | 'amount';
  hsn_code?: string;
  use_hsn_rates?: boolean;
  valuation_preference?: 'auto' | 'product_price' | 'minimum_valuation';
  images?: string[];
  main_image?: string;
  ai_weight_suggestion?: {
    weight: number;
    confidence: number;
  };
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit?: 'cm' | 'in';
  };
  volumetric_divisor?: number;
}

export interface CustomerInfo {
  email: string;
  name: string;
  phone: string;
}

export interface AddressInfo {
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
}

export interface QuoteFormState {
  // Customer information
  customer: CustomerInfo;
  
  // Location settings
  originCountry: string;
  originState: string;
  destinationCountry: string;
  destinationState: string;
  destinationPincode: string;
  destinationAddress: AddressInfo;
  
  // Shipping configuration
  shippingMethod: 'standard' | 'express' | 'economy';
  delhiveryServiceType: 'standard' | 'express' | 'same_day';
  ncmServiceType: 'pickup' | 'collect';
  destinationDistrict: string;
  selectedNCMBranch: any | null;
  
  // Payment and currency
  paymentGateway: string;
  customerCurrency: string;
  originCurrency: string;
  
  // Items and discounts
  items: QuoteItem[];
  orderDiscountType: 'percentage' | 'fixed';
  orderDiscountValue: number;
  orderDiscountCode: string;
  orderDiscountCodeId: string | null;
  shippingDiscountType: 'percentage' | 'fixed' | 'free';
  shippingDiscountValue: number;
  
  // Flags and toggles
  insuranceEnabled: boolean;
  applyComponentDiscounts: boolean;
  isDiscountSectionCollapsed: boolean;
  
  // UI state
  isEditMode: boolean;
  loadingQuote: boolean;
  calculating: boolean;
  showPreview: boolean;
  showEmailSection: boolean;
  showDocumentsModal: boolean;
  showAddressDetails: boolean;
  
  // Admin features
  adminNotes: string;
  currentQuoteStatus: string;
  shareToken: string;
  expiresAt: string | null;
  reminderCount: number;
  lastReminderAt: string | null;
  
  // Advanced options
  advancedOptionsExpanded: { [itemId: string]: boolean };
  volumetricModalOpen: string | null;
  
  // Smart features loading
  smartFeatureLoading: Record<string, boolean>;
  
  // User override tracking
  userOverrodeDestination: boolean;
  userOverrodeNCMBranch: boolean;
  isAutoSelected: boolean;
  quoteLoadingComplete: boolean;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface StateUpdateOptions {
  triggerCalculation?: boolean;
  source?: string;
  skipValidation?: boolean;
}

export class QuoteFormStateService {
  private state: QuoteFormState;
  private listeners = new Map<string, Function[]>();
  private validationRules: Map<string, Function[]> = new Map();

  constructor(initialState?: Partial<QuoteFormState>) {
    this.state = this.createDefaultState(initialState);
    this.initializeValidationRules();
    logger.info('QuoteFormStateService initialized');
  }

  /**
   * Create default state with sensible defaults
   */
  private createDefaultState(partial?: Partial<QuoteFormState>): QuoteFormState {
    return {
      // Customer information
      customer: {
        email: '',
        name: '',
        phone: '',
      },
      
      // Location settings
      originCountry: 'US',
      originState: '',
      destinationCountry: 'NP',
      destinationState: 'urban',
      destinationPincode: '',
      destinationAddress: {
        line1: '',
        line2: '',
        city: '',
        state: '',
        pincode: ''
      },
      
      // Shipping configuration
      shippingMethod: 'standard',
      delhiveryServiceType: 'standard',
      ncmServiceType: 'pickup',
      destinationDistrict: '',
      selectedNCMBranch: null,
      
      // Payment and currency
      paymentGateway: 'stripe',
      customerCurrency: 'NPR',
      originCurrency: 'USD',
      
      // Items and discounts
      items: [{
        id: crypto.randomUUID(),
        name: '',
        url: '',
        quantity: 1,
        unit_price_origin: 0,
        weight_kg: undefined,
        category: '',
        notes: ''
      }],
      orderDiscountType: 'percentage',
      orderDiscountValue: 0,
      orderDiscountCode: '',
      orderDiscountCodeId: null,
      shippingDiscountType: 'percentage',
      shippingDiscountValue: 0,
      
      // Flags and toggles
      insuranceEnabled: true,
      applyComponentDiscounts: true,
      isDiscountSectionCollapsed: true,
      
      // UI state
      isEditMode: false,
      loadingQuote: false,
      calculating: false,
      showPreview: false,
      showEmailSection: false,
      showDocumentsModal: false,
      showAddressDetails: false,
      
      // Admin features
      adminNotes: '',
      currentQuoteStatus: 'draft',
      shareToken: '',
      expiresAt: null,
      reminderCount: 0,
      lastReminderAt: null,
      
      // Advanced options
      advancedOptionsExpanded: {},
      volumetricModalOpen: null,
      
      // Smart features loading
      smartFeatureLoading: {},
      
      // User override tracking
      userOverrodeDestination: false,
      userOverrodeNCMBranch: false,
      isAutoSelected: false,
      quoteLoadingComplete: false,
      
      ...partial,
    };
  }

  /**
   * Get current state
   */
  getState(): QuoteFormState {
    return { ...this.state };
  }

  /**
   * Get specific state value
   */
  get<K extends keyof QuoteFormState>(key: K): QuoteFormState[K] {
    return this.state[key];
  }

  /**
   * Update state with validation
   */
  async updateState<K extends keyof QuoteFormState>(
    updates: Partial<QuoteFormState> | ((state: QuoteFormState) => Partial<QuoteFormState>),
    options: StateUpdateOptions = {}
  ): Promise<boolean> {
    try {
      const updatesObj = typeof updates === 'function' ? updates(this.state) : updates;
      
      // Validate updates if not skipped
      if (!options.skipValidation) {
        const validation = this.validateUpdates(updatesObj);
        if (!validation.isValid) {
          logger.warn('State update validation failed:', validation.errors);
          return false;
        }
      }
      
      // Apply updates
      const previousState = { ...this.state };
      this.state = { ...this.state, ...updatesObj };
      
      // Log significant changes
      this.logStateChanges(previousState, updatesObj, options.source);
      
      // Notify listeners
      this.notifyListeners(updatesObj);
      
      // Trigger calculation if requested
      if (options.triggerCalculation) {
        this.notifyListeners({ _triggerCalculation: true } as any);
      }
      
      return true;
      
    } catch (error) {
      logger.error('State update failed:', error);
      return false;
    }
  }

  /**
   * Update customer information
   */
  async updateCustomer(customer: Partial<CustomerInfo>, options?: StateUpdateOptions): Promise<boolean> {
    return this.updateState({
      customer: { ...this.state.customer, ...customer }
    }, options);
  }

  /**
   * Update location settings
   */
  async updateLocation(location: {
    originCountry?: string;
    originState?: string;
    destinationCountry?: string;
    destinationState?: string;
    destinationPincode?: string;
  }, options?: StateUpdateOptions): Promise<boolean> {
    const updates: Partial<QuoteFormState> = { ...location };
    
    // Auto-update customer currency when destination changes
    if (location.destinationCountry) {
      const currency = await this.getCustomerCurrency(location.destinationCountry);
      updates.customerCurrency = currency;
      
      // Clear location-specific data when country changes
      if (location.destinationCountry !== 'IN') {
        updates.destinationPincode = '';
      }
      if (location.destinationCountry !== 'NP') {
        updates.destinationDistrict = '';
        updates.selectedNCMBranch = null;
      }
    }
    
    return this.updateState(updates, options);
  }

  /**
   * Update shipping configuration
   */
  async updateShipping(shipping: {
    shippingMethod?: 'standard' | 'express' | 'economy';
    delhiveryServiceType?: 'standard' | 'express' | 'same_day';
    ncmServiceType?: 'pickup' | 'collect';
    selectedNCMBranch?: any;
  }, options?: StateUpdateOptions): Promise<boolean> {
    return this.updateState(shipping, options);
  }

  /**
   * Add new item
   */
  addItem(): string {
    const newItem: QuoteItem = {
      id: crypto.randomUUID(),
      name: '',
      url: '',
      quantity: 1,
      unit_price_origin: 0,
      weight_kg: undefined,
      category: '',
      notes: ''
    };
    
    this.updateState({
      items: [...this.state.items, newItem]
    }, { triggerCalculation: true });
    
    return newItem.id;
  }

  /**
   * Update specific item
   */
  async updateItem(itemId: string, updates: Partial<QuoteItem>, options?: StateUpdateOptions): Promise<boolean> {
    const updatedItems = this.state.items.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    
    return this.updateState({
      items: updatedItems
    }, { ...options, triggerCalculation: true });
  }

  /**
   * Remove item
   */
  async removeItem(itemId: string): Promise<boolean> {
    if (this.state.items.length <= 1) {
      logger.warn('Cannot remove the last item');
      return false;
    }
    
    const updatedItems = this.state.items.filter(item => item.id !== itemId);
    return this.updateState({
      items: updatedItems,
      advancedOptionsExpanded: Object.fromEntries(
        Object.entries(this.state.advancedOptionsExpanded).filter(([id]) => id !== itemId)
      )
    }, { triggerCalculation: true });
  }

  /**
   * Update discount settings
   */
  async updateDiscounts(discounts: {
    orderDiscountType?: 'percentage' | 'fixed';
    orderDiscountValue?: number;
    orderDiscountCode?: string;
    shippingDiscountType?: 'percentage' | 'fixed' | 'free';
    shippingDiscountValue?: number;
  }, options?: StateUpdateOptions): Promise<boolean> {
    return this.updateState(discounts, { ...options, triggerCalculation: true });
  }

  /**
   * Toggle advanced options for item
   */
  toggleAdvancedOptions(itemId: string): void {
    this.updateState({
      advancedOptionsExpanded: {
        ...this.state.advancedOptionsExpanded,
        [itemId]: !this.state.advancedOptionsExpanded[itemId]
      }
    });
  }

  /**
   * Set smart feature loading state
   */
  setSmartFeatureLoading(feature: string, loading: boolean): void {
    this.updateState({
      smartFeatureLoading: {
        ...this.state.smartFeatureLoading,
        [feature]: loading
      }
    });
  }

  /**
   * Reset form to defaults
   */
  reset(keepCustomer = false): void {
    const resetState = this.createDefaultState();
    if (keepCustomer) {
      resetState.customer = this.state.customer;
    }
    
    this.state = resetState;
    this.notifyListeners({ _reset: true } as any);
  }

  /**
   * Load state from external data
   */
  loadState(data: Partial<QuoteFormState>): void {
    this.state = this.createDefaultState(data);
    this.notifyListeners({ _loaded: true } as any);
  }

  /**
   * Validate current state
   */
  validate(): FormValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Customer validation
    if (!this.state.customer.email && this.state.showEmailSection) {
      errors.push('Customer email is required for sending quotes');
    }
    
    // Items validation
    if (this.state.items.length === 0) {
      errors.push('At least one item is required');
    }
    
    const invalidItems = this.state.items.filter(item => 
      !item.name || item.unit_price_origin <= 0 || item.quantity <= 0
    );
    
    if (invalidItems.length > 0) {
      errors.push(`${invalidItems.length} item(s) have missing or invalid data`);
    }
    
    // Weight warnings
    const itemsWithoutWeight = this.state.items.filter(item => 
      !item.weight_kg && !item.ai_weight_suggestion
    );
    
    if (itemsWithoutWeight.length > 0) {
      warnings.push(`${itemsWithoutWeight.length} item(s) missing weight - calculations may be inaccurate`);
    }
    
    // Location validation
    if (this.state.destinationCountry === 'IN' && !this.state.destinationPincode) {
      errors.push('Pincode is required for India destinations');
    }
    
    if (this.state.destinationCountry === 'NP' && !this.state.selectedNCMBranch) {
      warnings.push('NCM branch selection recommended for Nepal destinations');
    }
    
    // Discount validation
    if (this.state.orderDiscountValue < 0) {
      errors.push('Discount value cannot be negative');
    }
    
    if (this.state.orderDiscountType === 'percentage' && this.state.orderDiscountValue > 100) {
      errors.push('Percentage discount cannot exceed 100%');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(key: string, callback: (updates: Partial<QuoteFormState>) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    
    this.listeners.get(key)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Private helper methods
   */
  private initializeValidationRules(): void {
    // Add validation rules for specific fields
    this.validationRules.set('customer.email', [
      (value: string) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Invalid email format'
    ]);
    
    this.validationRules.set('destinationPincode', [
      (value: string, state: QuoteFormState) => 
        state.destinationCountry !== 'IN' || !value || /^\d{6}$/.test(value) || 'Indian pincode must be 6 digits'
    ]);
  }

  private validateUpdates(updates: Partial<QuoteFormState>): FormValidationResult {
    const errors: string[] = [];
    const state = { ...this.state, ...updates };
    
    // Run field-specific validations
    for (const [fieldPath, rules] of this.validationRules.entries()) {
      const fieldValue = this.getNestedValue(updates, fieldPath);
      if (fieldValue !== undefined) {
        for (const rule of rules) {
          const result = rule(fieldValue, state);
          if (typeof result === 'string') {
            errors.push(result);
          }
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    return current;
  }

  private logStateChanges(
    previousState: QuoteFormState, 
    updates: Partial<QuoteFormState>, 
    source?: string
  ): void {
    const significantChanges = [
      'destinationCountry',
      'originCountry', 
      'items',
      'orderDiscountValue',
      'shippingMethod'
    ];
    
    const changedFields = significantChanges.filter(field => 
      field in updates && updates[field as keyof QuoteFormState] !== previousState[field as keyof QuoteFormState]
    );
    
    if (changedFields.length > 0) {
      logger.debug('Significant state changes:', {
        fields: changedFields,
        source: source || 'unknown',
        timestamp: new Date().toISOString()
      });
    }
  }

  private notifyListeners(updates: Partial<QuoteFormState>): void {
    for (const [key, callbacks] of this.listeners.entries()) {
      try {
        callbacks.forEach(callback => callback(updates));
      } catch (error) {
        logger.error(`Listener error for key ${key}:`, error);
      }
    }
  }

  private async getCustomerCurrency(countryCode: string): Promise<string> {
    try {
      const currency = await currencyService.getCurrency(countryCode);
      return currency;
    } catch (error) {
      logger.error('Failed to get customer currency:', error);
      return 'USD'; // Fallback
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.listeners.clear();
    this.validationRules.clear();
    logger.info('QuoteFormStateService disposed');
  }
}

export default QuoteFormStateService;