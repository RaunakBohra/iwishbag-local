/**
 * Quote Form State Management Service
 * Manages all form state for the quote calculator with type safety
 */

import { logger } from '@/utils/logger';

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
  hsn_display_name?: string;
  hsn_category?: string;
  valuation_preference?: 'actual' | 'minimum' | 'declared';
  declared_value?: number;
  images?: string[];
  volumetric_weight_kg?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'inch';
  };
  customs_declarations?: any;
  seller_info?: any;
}

export interface QuoteAddress {
  address_line1?: string;
  address_line2?: string;
  city: string;
  state_province_region: string;
  postal_code: string;
  destination_country: string;
  recipient_name?: string;
  recipient_phone?: string;
}

export interface QuoteFormData {
  // Basic Info
  originCountry: string;
  originState: string;
  destinationCountry: string;
  destinationState: string;
  destinationPincode: string;
  destinationAddress: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    pincode: string;
  };
  
  // Items
  items: QuoteItem[];
  
  // Shipping & Service Options
  shippingMethod: 'standard' | 'express' | 'economy';
  delhiveryServiceType: 'standard' | 'express' | 'same_day';
  ncmServiceType: 'pickup' | 'collect';
  destinationDistrict: string;
  selectedNCMBranch: any;
  availableNCMBranches: any[];
  
  // Payment & Currency
  paymentGateway: string;
  customerCurrency: string;
  
  // Discounts
  orderDiscountType: 'percentage' | 'fixed';
  orderDiscountValue: number;
  orderDiscountCode: string;
  orderDiscountCodeId: string | null;
  shippingDiscountType: 'percentage' | 'fixed' | 'free';
  shippingDiscountValue: number;
  discountCodes: string[];
  applyComponentDiscounts: boolean;
  
  // Settings
  insuranceEnabled: boolean;
  adminNotes: string;
  
  // Customer Info
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: QuoteAddress | null;
  
  // Metadata
  quoteId?: string;
  isEditMode: boolean;
  lastCalculation?: any;
  isDirty: boolean;
  validationErrors: Record<string, string>;
}

export interface QuoteFormActions {
  // Item Management
  addItem: () => void;
  removeItem: (id: string) => void;
  updateItem: <K extends keyof QuoteItem>(id: string, field: K, value: QuoteItem[K]) => void;
  duplicateItem: (id: string) => void;
  clearAllItems: () => void;
  
  // Country & Address Management
  setOriginCountry: (country: string) => void;
  setDestinationCountry: (country: string) => void;
  setDestinationAddress: (address: Partial<QuoteFormData['destinationAddress']>) => void;
  setCustomerAddress: (address: QuoteAddress | null) => void;
  
  // Discount Management
  setOrderDiscount: (type: 'percentage' | 'fixed', value: number, code?: string) => void;
  setShippingDiscount: (type: 'percentage' | 'fixed' | 'free', value: number) => void;
  clearDiscounts: () => void;
  addDiscountCode: (code: string) => void;
  removeDiscountCode: (code: string) => void;
  
  // Form Management
  updateField: <K extends keyof QuoteFormData>(field: K, value: QuoteFormData[K]) => void;
  setValidationError: (field: string, error: string) => void;
  clearValidationError: (field: string) => void;
  clearAllValidationErrors: () => void;
  markDirty: () => void;
  markClean: () => void;
  
  // State Reset & Management
  resetForm: () => void;
  loadFormData: (data: Partial<QuoteFormData>) => void;
  exportFormData: () => QuoteFormData;
  isFormValid: () => boolean;
  getFormErrors: () => string[];
}

export type QuoteFormState = QuoteFormData & QuoteFormActions;

/**
 * Create initial form state
 */
export function createInitialFormState(): QuoteFormData {
  return {
    // Basic Info
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
    
    // Items
    items: [{
      id: crypto.randomUUID(),
      name: '',
      quantity: 1,
      unit_price_origin: 0,
      weight_kg: 0,
      category: '',
      notes: ''
    }],
    
    // Shipping & Service Options
    shippingMethod: 'standard',
    delhiveryServiceType: 'standard',
    ncmServiceType: 'pickup',
    destinationDistrict: '',
    selectedNCMBranch: null,
    availableNCMBranches: [],
    
    // Payment & Currency
    paymentGateway: 'stripe',
    customerCurrency: 'NPR',
    
    // Discounts
    orderDiscountType: 'percentage',
    orderDiscountValue: 0,
    orderDiscountCode: '',
    orderDiscountCodeId: null,
    shippingDiscountType: 'percentage',
    shippingDiscountValue: 0,
    discountCodes: [],
    applyComponentDiscounts: true,
    
    // Settings
    insuranceEnabled: true,
    adminNotes: '',
    
    // Customer Info
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: null,
    
    // Metadata
    isEditMode: false,
    isDirty: false,
    validationErrors: {}
  };
}

/**
 * Quote Form State Service
 * Provides centralized state management for the quote calculator
 */
export class QuoteFormStateService {
  private state: QuoteFormData;
  private listeners: Array<(state: QuoteFormData) => void> = [];
  private historyStack: QuoteFormData[] = [];
  private historyIndex = -1;
  private maxHistorySize = 50;

  constructor(initialState?: Partial<QuoteFormData>) {
    this.state = { ...createInitialFormState(), ...initialState };
    this.saveToHistory();
    
    logger.info('QuoteFormStateService initialized');
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: QuoteFormData) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current state
   */
  getState(): QuoteFormData {
    return { ...this.state };
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<QuoteFormData>, skipHistory = false): void {
    const previousState = { ...this.state };
    this.state = { ...this.state, ...updates, isDirty: true };
    
    // Save to history for undo/redo
    if (!skipHistory) {
      this.saveToHistory();
    }
    
    // Notify listeners
    this.listeners.forEach(callback => {
      try {
        callback(this.state);
      } catch (error) {
        logger.error('State listener error:', error);
      }
    });

    logger.debug('Form state updated', { 
      changes: Object.keys(updates),
      isDirty: this.state.isDirty 
    });
  }

  /**
   * Item Management Actions
   */
  addItem(): void {
    const newItem: QuoteItem = {
      id: crypto.randomUUID(),
      name: '',
      quantity: 1,
      unit_price_origin: 0,
      weight_kg: 0,
      category: '',
      notes: ''
    };

    this.updateState({
      items: [...this.state.items, newItem]
    });

    logger.info('Item added', { itemId: newItem.id });
  }

  removeItem(id: string): void {
    if (this.state.items.length <= 1) {
      logger.warn('Cannot remove last item');
      return;
    }

    this.updateState({
      items: this.state.items.filter(item => item.id !== id)
    });

    logger.info('Item removed', { itemId: id });
  }

  updateItem<K extends keyof QuoteItem>(id: string, field: K, value: QuoteItem[K]): void {
    const updatedItems = this.state.items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );

    this.updateState({ items: updatedItems });
  }

  duplicateItem(id: string): void {
    const originalItem = this.state.items.find(item => item.id === id);
    if (!originalItem) {
      logger.warn('Item not found for duplication', { itemId: id });
      return;
    }

    const duplicatedItem: QuoteItem = {
      ...originalItem,
      id: crypto.randomUUID(),
      name: `${originalItem.name} (Copy)`
    };

    const originalIndex = this.state.items.findIndex(item => item.id === id);
    const newItems = [...this.state.items];
    newItems.splice(originalIndex + 1, 0, duplicatedItem);

    this.updateState({ items: newItems });

    logger.info('Item duplicated', { 
      originalId: id, 
      newId: duplicatedItem.id 
    });
  }

  clearAllItems(): void {
    const newItem: QuoteItem = {
      id: crypto.randomUUID(),
      name: '',
      quantity: 1,
      unit_price_origin: 0,
      weight_kg: 0,
      category: '',
      notes: ''
    };

    this.updateState({ items: [newItem] });
    logger.info('All items cleared');
  }

  /**
   * Country & Address Management
   */
  setOriginCountry(country: string): void {
    this.updateState({ originCountry: country });
  }

  setDestinationCountry(country: string): void {
    this.updateState({ destinationCountry: country });
  }

  setDestinationAddress(address: Partial<QuoteFormData['destinationAddress']>): void {
    this.updateState({
      destinationAddress: { ...this.state.destinationAddress, ...address }
    });
  }

  setCustomerAddress(address: QuoteAddress | null): void {
    this.updateState({ customerAddress: address });
  }

  /**
   * Discount Management
   */
  setOrderDiscount(type: 'percentage' | 'fixed', value: number, code?: string): void {
    this.updateState({
      orderDiscountType: type,
      orderDiscountValue: value,
      orderDiscountCode: code || '',
      orderDiscountCodeId: null // Reset code ID when manually setting
    });
  }

  setShippingDiscount(type: 'percentage' | 'fixed' | 'free', value: number): void {
    this.updateState({
      shippingDiscountType: type,
      shippingDiscountValue: type === 'free' ? 100 : value
    });
  }

  clearDiscounts(): void {
    this.updateState({
      orderDiscountType: 'percentage',
      orderDiscountValue: 0,
      orderDiscountCode: '',
      orderDiscountCodeId: null,
      shippingDiscountType: 'percentage',
      shippingDiscountValue: 0,
      discountCodes: []
    });
  }

  addDiscountCode(code: string): void {
    if (!this.state.discountCodes.includes(code)) {
      this.updateState({
        discountCodes: [...this.state.discountCodes, code]
      });
    }
  }

  removeDiscountCode(code: string): void {
    this.updateState({
      discountCodes: this.state.discountCodes.filter(c => c !== code)
    });
  }

  /**
   * Form Management
   */
  updateField<K extends keyof QuoteFormData>(field: K, value: QuoteFormData[K]): void {
    this.updateState({ [field]: value } as Partial<QuoteFormData>);
  }

  setValidationError(field: string, error: string): void {
    this.updateState({
      validationErrors: { ...this.state.validationErrors, [field]: error }
    }, true); // Skip history for validation errors
  }

  clearValidationError(field: string): void {
    const { [field]: removed, ...remainingErrors } = this.state.validationErrors;
    this.updateState({ validationErrors: remainingErrors }, true);
  }

  clearAllValidationErrors(): void {
    this.updateState({ validationErrors: {} }, true);
  }

  markDirty(): void {
    if (!this.state.isDirty) {
      this.updateState({ isDirty: true }, true);
    }
  }

  markClean(): void {
    this.updateState({ isDirty: false }, true);
  }

  /**
   * State Reset & Management
   */
  resetForm(): void {
    this.state = createInitialFormState();
    this.historyStack = [this.state];
    this.historyIndex = 0;
    
    this.listeners.forEach(callback => callback(this.state));
    logger.info('Form reset to initial state');
  }

  loadFormData(data: Partial<QuoteFormData>): void {
    this.updateState({ ...data, isDirty: false });
    logger.info('Form data loaded');
  }

  exportFormData(): QuoteFormData {
    return { ...this.state };
  }

  isFormValid(): boolean {
    return Object.keys(this.state.validationErrors).length === 0;
  }

  getFormErrors(): string[] {
    return Object.values(this.state.validationErrors);
  }

  /**
   * History Management (Undo/Redo)
   */
  private saveToHistory(): void {
    // Remove any history after current index (for redo functionality)
    if (this.historyIndex < this.historyStack.length - 1) {
      this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
    }

    // Add current state to history
    this.historyStack.push({ ...this.state });
    this.historyIndex = this.historyStack.length - 1;

    // Limit history size
    if (this.historyStack.length > this.maxHistorySize) {
      this.historyStack.shift();
      this.historyIndex--;
    }
  }

  canUndo(): boolean {
    return this.historyIndex > 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.historyStack.length - 1;
  }

  undo(): boolean {
    if (!this.canUndo()) return false;

    this.historyIndex--;
    this.state = { ...this.historyStack[this.historyIndex] };
    this.listeners.forEach(callback => callback(this.state));
    
    logger.info('Undo performed', { historyIndex: this.historyIndex });
    return true;
  }

  redo(): boolean {
    if (!this.canRedo()) return false;

    this.historyIndex++;
    this.state = { ...this.historyStack[this.historyIndex] };
    this.listeners.forEach(callback => callback(this.state));
    
    logger.info('Redo performed', { historyIndex: this.historyIndex });
    return true;
  }

  /**
   * Utility Methods
   */
  getItemById(id: string): QuoteItem | undefined {
    return this.state.items.find(item => item.id === id);
  }

  getTotalItemValue(): number {
    return this.state.items.reduce((sum, item) => 
      sum + (item.unit_price_origin * item.quantity), 0);
  }

  getTotalWeight(): number {
    return this.state.items.reduce((sum, item) => 
      sum + ((item.weight_kg || 0) * item.quantity), 0);
  }

  getItemCount(): number {
    return this.state.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  hasEmptyRequiredFields(): boolean {
    return this.state.items.some(item => !item.name || item.unit_price_origin <= 0);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.listeners = [];
    this.historyStack = [];
    logger.info('QuoteFormStateService destroyed');
  }
}

/**
 * Factory function to create a new form state service
 */
export function createQuoteFormState(initialState?: Partial<QuoteFormData>): QuoteFormStateService {
  return new QuoteFormStateService(initialState);
}