/**
 * Quote State Service
 * Manages complex state interactions for the quote calculator
 * Extracted from QuoteCalculatorV2 for clean state management patterns
 * 
 * RESPONSIBILITIES:
 * - Quote form state management and validation
 * - Multi-step form progression and navigation
 * - State persistence and recovery
 * - Undo/redo functionality for quote modifications
 * - Auto-save and draft management
 * - State synchronization across components
 * - Form field dependencies and computed values
 * - State validation and error management
 */

import { logger } from '@/utils/logger';
import { QuoteItem, CalculationInputs } from './QuoteCalculationService';
import { CustomerData, DeliveryAddress } from './CustomerManagementService';

export interface QuoteFormState {
  // Quote identification
  quoteId?: string;
  isDraft: boolean;
  isTemplate: boolean;
  
  // Form progression
  currentStep: QuoteStep;
  completedSteps: QuoteStep[];
  canProceedToNext: boolean;
  
  // Core quote data
  items: QuoteItem[];
  shippingRoute: {
    origin_country: string;
    destination_country: string;
    shipping_method: string;
    estimated_days: number;
  };
  
  // Customer information
  customer?: CustomerData;
  deliveryAddress?: DeliveryAddress;
  customerNotes?: string;
  
  // Calculation state
  calculationResult?: any;
  isCalculating: boolean;
  lastCalculationTime?: number;
  calculationErrors: string[];
  
  // Validation state
  validationResult?: any;
  isValidating: boolean;
  fieldErrors: Record<string, string[]>;
  
  // UI state
  expandedSections: string[];
  selectedItem?: string;
  showAdvancedOptions: boolean;
  
  // Admin state
  adminMode: boolean;
  adminOverrides: {
    skip_weight_validation: boolean;
    skip_price_validation: boolean;
    custom_rates: boolean;
    bulk_discount: number;
  };
  
  // Persistence
  lastSavedAt?: number;
  hasUnsavedChanges: boolean;
  autoSaveEnabled: boolean;
}

export enum QuoteStep {
  ITEMS = 'items',
  SHIPPING = 'shipping',
  CUSTOMER = 'customer',
  REVIEW = 'review',
  CALCULATION = 'calculation',
  APPROVAL = 'approval'
}

export interface StateUpdate {
  type: StateUpdateType;
  payload?: any;
  timestamp: number;
  source: 'user' | 'auto' | 'system';
}

export enum StateUpdateType {
  // Item management
  ADD_ITEM = 'ADD_ITEM',
  REMOVE_ITEM = 'REMOVE_ITEM',
  UPDATE_ITEM = 'UPDATE_ITEM',
  CLEAR_ITEMS = 'CLEAR_ITEMS',
  
  // Navigation
  SET_STEP = 'SET_STEP',
  NEXT_STEP = 'NEXT_STEP',
  PREV_STEP = 'PREV_STEP',
  
  // Customer data
  SET_CUSTOMER = 'SET_CUSTOMER',
  SET_ADDRESS = 'SET_ADDRESS',
  CLEAR_CUSTOMER = 'CLEAR_CUSTOMER',
  
  // Calculations
  START_CALCULATION = 'START_CALCULATION',
  CALCULATION_SUCCESS = 'CALCULATION_SUCCESS',
  CALCULATION_ERROR = 'CALCULATION_ERROR',
  
  // Validation
  START_VALIDATION = 'START_VALIDATION',
  VALIDATION_SUCCESS = 'VALIDATION_SUCCESS',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // UI updates
  TOGGLE_SECTION = 'TOGGLE_SECTION',
  SELECT_ITEM = 'SELECT_ITEM',
  SET_ADMIN_MODE = 'SET_ADMIN_MODE',
  
  // Persistence
  SAVE_DRAFT = 'SAVE_DRAFT',
  LOAD_DRAFT = 'LOAD_DRAFT',
  MARK_SAVED = 'MARK_SAVED',
  MARK_UNSAVED = 'MARK_UNSAVED'
}

export class QuoteStateService {
  private static instance: QuoteStateService;
  private currentState: QuoteFormState;
  private stateHistory: QuoteFormState[] = [];
  private redoStack: QuoteFormState[] = [];
  private maxHistorySize = 50;
  private listeners: Map<string, (state: QuoteFormState) => void> = new Map();
  private autoSaveTimer?: NodeJS.Timeout;
  private readonly autoSaveInterval = 30000; // 30 seconds

  constructor() {
    this.currentState = this.createInitialState();
    logger.info('QuoteStateService initialized');
  }

  static getInstance(): QuoteStateService {
    if (!QuoteStateService.instance) {
      QuoteStateService.instance = new QuoteStateService();
    }
    return QuoteStateService.instance;
  }

  /**
   * Get current state
   */
  getState(): QuoteFormState {
    return { ...this.currentState };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(id: string, callback: (state: QuoteFormState) => void): () => void {
    this.listeners.set(id, callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(id);
    };
  }

  /**
   * Dispatch state update
   */
  dispatch(update: Omit<StateUpdate, 'timestamp'>): void {
    const fullUpdate: StateUpdate = {
      ...update,
      timestamp: Date.now()
    };

    try {
      const previousState = { ...this.currentState };
      const newState = this.reducer(this.currentState, fullUpdate);
      
      if (newState !== this.currentState) {
        // Add to history for undo functionality
        this.addToHistory(previousState);
        
        // Update current state
        this.currentState = newState;
        
        // Clear redo stack on new action
        this.redoStack = [];
        
        // Notify listeners
        this.notifyListeners();
        
        // Auto-save if enabled
        if (this.currentState.autoSaveEnabled && fullUpdate.source === 'user') {
          this.scheduleAutoSave();
        }
        
        logger.debug(`State updated: ${fullUpdate.type}`, { 
          step: newState.currentStep, 
          items: newState.items.length 
        });
      }
    } catch (error) {
      logger.error('State update failed:', error);
    }
  }

  /**
   * State reducer - handles all state transitions
   */
  private reducer(state: QuoteFormState, update: StateUpdate): QuoteFormState {
    switch (update.type) {
      case StateUpdateType.ADD_ITEM:
        return {
          ...state,
          items: [...state.items, update.payload],
          hasUnsavedChanges: true
        };

      case StateUpdateType.REMOVE_ITEM:
        return {
          ...state,
          items: state.items.filter(item => item.id !== update.payload.id),
          selectedItem: state.selectedItem === update.payload.id ? undefined : state.selectedItem,
          hasUnsavedChanges: true
        };

      case StateUpdateType.UPDATE_ITEM:
        return {
          ...state,
          items: state.items.map(item => 
            item.id === update.payload.id ? { ...item, ...update.payload.updates } : item
          ),
          hasUnsavedChanges: true
        };

      case StateUpdateType.CLEAR_ITEMS:
        return {
          ...state,
          items: [],
          selectedItem: undefined,
          hasUnsavedChanges: true
        };

      case StateUpdateType.SET_STEP:
        const newStep = update.payload.step;
        const completedSteps = this.updateCompletedSteps(state.completedSteps, state.currentStep);
        
        return {
          ...state,
          currentStep: newStep,
          completedSteps,
          canProceedToNext: this.canProceedToStep(newStep, state)
        };

      case StateUpdateType.NEXT_STEP:
        const nextStep = this.getNextStep(state.currentStep);
        if (nextStep && this.canProceedToStep(nextStep, state)) {
          return this.reducer(state, {
            type: StateUpdateType.SET_STEP,
            payload: { step: nextStep },
            timestamp: update.timestamp,
            source: update.source
          });
        }
        return state;

      case StateUpdateType.PREV_STEP:
        const prevStep = this.getPreviousStep(state.currentStep);
        if (prevStep) {
          return this.reducer(state, {
            type: StateUpdateType.SET_STEP,
            payload: { step: prevStep },
            timestamp: update.timestamp,
            source: update.source
          });
        }
        return state;

      case StateUpdateType.SET_CUSTOMER:
        return {
          ...state,
          customer: update.payload,
          hasUnsavedChanges: true
        };

      case StateUpdateType.SET_ADDRESS:
        return {
          ...state,
          deliveryAddress: update.payload,
          hasUnsavedChanges: true
        };

      case StateUpdateType.CLEAR_CUSTOMER:
        return {
          ...state,
          customer: undefined,
          deliveryAddress: undefined,
          hasUnsavedChanges: true
        };

      case StateUpdateType.START_CALCULATION:
        return {
          ...state,
          isCalculating: true,
          calculationErrors: []
        };

      case StateUpdateType.CALCULATION_SUCCESS:
        return {
          ...state,
          isCalculating: false,
          calculationResult: update.payload,
          lastCalculationTime: update.timestamp,
          calculationErrors: []
        };

      case StateUpdateType.CALCULATION_ERROR:
        return {
          ...state,
          isCalculating: false,
          calculationErrors: [update.payload.error]
        };

      case StateUpdateType.START_VALIDATION:
        return {
          ...state,
          isValidating: true,
          fieldErrors: {}
        };

      case StateUpdateType.VALIDATION_SUCCESS:
        return {
          ...state,
          isValidating: false,
          validationResult: update.payload,
          fieldErrors: this.extractFieldErrors(update.payload)
        };

      case StateUpdateType.VALIDATION_ERROR:
        return {
          ...state,
          isValidating: false,
          fieldErrors: { general: [update.payload.error] }
        };

      case StateUpdateType.TOGGLE_SECTION:
        const sectionId = update.payload.sectionId;
        const expandedSections = state.expandedSections.includes(sectionId)
          ? state.expandedSections.filter(id => id !== sectionId)
          : [...state.expandedSections, sectionId];
        
        return {
          ...state,
          expandedSections
        };

      case StateUpdateType.SELECT_ITEM:
        return {
          ...state,
          selectedItem: update.payload.itemId
        };

      case StateUpdateType.SET_ADMIN_MODE:
        return {
          ...state,
          adminMode: update.payload.enabled,
          adminOverrides: update.payload.enabled ? state.adminOverrides : {
            skip_weight_validation: false,
            skip_price_validation: false,
            custom_rates: false,
            bulk_discount: 0
          }
        };

      case StateUpdateType.MARK_SAVED:
        return {
          ...state,
          hasUnsavedChanges: false,
          lastSavedAt: update.timestamp
        };

      case StateUpdateType.MARK_UNSAVED:
        return {
          ...state,
          hasUnsavedChanges: true
        };

      case StateUpdateType.LOAD_DRAFT:
        return {
          ...update.payload,
          hasUnsavedChanges: false
        };

      default:
        return state;
    }
  }

  /**
   * Undo last action
   */
  undo(): boolean {
    if (this.stateHistory.length === 0) {
      return false;
    }

    const previousState = this.stateHistory.pop()!;
    this.redoStack.push({ ...this.currentState });
    
    this.currentState = previousState;
    this.notifyListeners();
    
    logger.debug('Undo action performed');
    return true;
  }

  /**
   * Redo last undone action
   */
  redo(): boolean {
    if (this.redoStack.length === 0) {
      return false;
    }

    const nextState = this.redoStack.pop()!;
    this.addToHistory({ ...this.currentState });
    
    this.currentState = nextState;
    this.notifyListeners();
    
    logger.debug('Redo action performed');
    return true;
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.currentState = this.createInitialState();
    this.stateHistory = [];
    this.redoStack = [];
    this.notifyListeners();
    logger.debug('State reset to initial');
  }

  /**
   * Load state from external source
   */
  loadState(state: Partial<QuoteFormState>): void {
    const mergedState = {
      ...this.createInitialState(),
      ...state,
      hasUnsavedChanges: false,
      lastSavedAt: Date.now()
    };

    this.dispatch({
      type: StateUpdateType.LOAD_DRAFT,
      payload: mergedState,
      source: 'system'
    });
  }

  /**
   * Export current state for persistence
   */
  exportState(): QuoteFormState {
    return {
      ...this.currentState,
      // Clean up non-persistable data
      isCalculating: false,
      isValidating: false
    };
  }

  /**
   * Get calculation inputs from current state
   */
  getCalculationInputs(): CalculationInputs {
    return {
      items: this.currentState.items,
      route: this.currentState.shippingRoute,
      customerEmail: this.currentState.customer?.email,
      customerName: this.currentState.customer?.name,
      customerPhone: this.currentState.customer?.phone,
      deliveryAddress: this.currentState.deliveryAddress,
      adminDiscounts: this.currentState.adminMode ? {
        percentage: this.currentState.adminOverrides.bulk_discount
      } : undefined,
      forceRecalculate: false
    };
  }

  /**
   * Check if current state is valid for step progression
   */
  canProgressTo(step: QuoteStep): boolean {
    switch (step) {
      case QuoteStep.ITEMS:
        return true;

      case QuoteStep.SHIPPING:
        return this.currentState.items.length > 0;

      case QuoteStep.CUSTOMER:
        return this.currentState.items.length > 0 && 
               !!this.currentState.shippingRoute.destination_country;

      case QuoteStep.REVIEW:
        return this.currentState.items.length > 0 && 
               !!this.currentState.shippingRoute.destination_country &&
               !!this.currentState.customer;

      case QuoteStep.CALCULATION:
        return this.canProgressTo(QuoteStep.REVIEW);

      case QuoteStep.APPROVAL:
        return this.canProgressTo(QuoteStep.CALCULATION) && 
               !!this.currentState.calculationResult?.success;

      default:
        return false;
    }
  }

  /**
   * Get validation summary for current state
   */
  getValidationSummary(): {
    isValid: boolean;
    errorCount: number;
    warningCount: number;
    criticalErrors: string[];
  } {
    const fieldErrorCount = Object.values(this.currentState.fieldErrors)
      .flat().length;
    
    const calculationErrorCount = this.currentState.calculationErrors.length;
    const totalErrors = fieldErrorCount + calculationErrorCount;

    const criticalErrors = [
      ...this.currentState.calculationErrors,
      ...Object.entries(this.currentState.fieldErrors)
        .filter(([field, errors]) => errors.length > 0)
        .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
    ];

    return {
      isValid: totalErrors === 0,
      errorCount: totalErrors,
      warningCount: 0, // Would be calculated from validation warnings
      criticalErrors
    };
  }

  /**
   * Private helper methods
   */
  private createInitialState(): QuoteFormState {
    return {
      isDraft: true,
      isTemplate: false,
      currentStep: QuoteStep.ITEMS,
      completedSteps: [],
      canProceedToNext: false,
      items: [],
      shippingRoute: {
        origin_country: 'US',
        destination_country: '',
        shipping_method: 'standard',
        estimated_days: 7
      },
      isCalculating: false,
      calculationErrors: [],
      isValidating: false,
      fieldErrors: {},
      expandedSections: ['items'],
      showAdvancedOptions: false,
      adminMode: false,
      adminOverrides: {
        skip_weight_validation: false,
        skip_price_validation: false,
        custom_rates: false,
        bulk_discount: 0
      },
      hasUnsavedChanges: false,
      autoSaveEnabled: true
    };
  }

  private addToHistory(state: QuoteFormState): void {
    this.stateHistory.push(state);
    
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.getState());
      } catch (error) {
        logger.error('State listener callback failed:', error);
      }
    });
  }

  private scheduleAutoSave(): void {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    this.autoSaveTimer = setTimeout(() => {
      if (this.currentState.hasUnsavedChanges) {
        this.performAutoSave();
      }
    }, this.autoSaveInterval);
  }

  private performAutoSave(): void {
    try {
      const stateData = JSON.stringify(this.exportState());
      localStorage.setItem('quote-draft', stateData);
      
      this.dispatch({
        type: StateUpdateType.MARK_SAVED,
        source: 'auto'
      });
      
      logger.debug('Auto-save completed');
    } catch (error) {
      logger.error('Auto-save failed:', error);
    }
  }

  private updateCompletedSteps(completedSteps: QuoteStep[], currentStep: QuoteStep): QuoteStep[] {
    if (!completedSteps.includes(currentStep)) {
      return [...completedSteps, currentStep];
    }
    return completedSteps;
  }

  private canProceedToStep(step: QuoteStep, state: QuoteFormState): boolean {
    return this.canProgressTo(step);
  }

  private getNextStep(currentStep: QuoteStep): QuoteStep | null {
    const steps = Object.values(QuoteStep);
    const currentIndex = steps.indexOf(currentStep);
    
    if (currentIndex >= 0 && currentIndex < steps.length - 1) {
      return steps[currentIndex + 1];
    }
    
    return null;
  }

  private getPreviousStep(currentStep: QuoteStep): QuoteStep | null {
    const steps = Object.values(QuoteStep);
    const currentIndex = steps.indexOf(currentStep);
    
    if (currentIndex > 0) {
      return steps[currentIndex - 1];
    }
    
    return null;
  }

  private extractFieldErrors(validationResult: any): Record<string, string[]> {
    const fieldErrors: Record<string, string[]> = {};
    
    if (validationResult?.errors) {
      validationResult.errors.forEach((error: any) => {
        const field = error.field || 'general';
        if (!fieldErrors[field]) {
          fieldErrors[field] = [];
        }
        fieldErrors[field].push(error.message);
      });
    }
    
    return fieldErrors;
  }

  /**
   * Utility methods for components
   */
  
  // Item management helpers
  addItem(item: QuoteItem): void {
    this.dispatch({
      type: StateUpdateType.ADD_ITEM,
      payload: item,
      source: 'user'
    });
  }

  updateItem(itemId: string, updates: Partial<QuoteItem>): void {
    this.dispatch({
      type: StateUpdateType.UPDATE_ITEM,
      payload: { id: itemId, updates },
      source: 'user'
    });
  }

  removeItem(itemId: string): void {
    this.dispatch({
      type: StateUpdateType.REMOVE_ITEM,
      payload: { id: itemId },
      source: 'user'
    });
  }

  // Navigation helpers
  goToStep(step: QuoteStep): void {
    this.dispatch({
      type: StateUpdateType.SET_STEP,
      payload: { step },
      source: 'user'
    });
  }

  nextStep(): boolean {
    if (this.currentState.canProceedToNext) {
      this.dispatch({
        type: StateUpdateType.NEXT_STEP,
        source: 'user'
      });
      return true;
    }
    return false;
  }

  previousStep(): void {
    this.dispatch({
      type: StateUpdateType.PREV_STEP,
      source: 'user'
    });
  }

  // Customer data helpers
  setCustomer(customer: CustomerData): void {
    this.dispatch({
      type: StateUpdateType.SET_CUSTOMER,
      payload: customer,
      source: 'user'
    });
  }

  setDeliveryAddress(address: DeliveryAddress): void {
    this.dispatch({
      type: StateUpdateType.SET_ADDRESS,
      payload: address,
      source: 'user'
    });
  }

  // Calculation helpers
  startCalculation(): void {
    this.dispatch({
      type: StateUpdateType.START_CALCULATION,
      source: 'system'
    });
  }

  setCalculationResult(result: any): void {
    this.dispatch({
      type: StateUpdateType.CALCULATION_SUCCESS,
      payload: result,
      source: 'system'
    });
  }

  setCalculationError(error: string): void {
    this.dispatch({
      type: StateUpdateType.CALCULATION_ERROR,
      payload: { error },
      source: 'system'
    });
  }

  /**
   * Cleanup and disposal
   */
  dispose(): void {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    
    this.listeners.clear();
    this.stateHistory = [];
    this.redoStack = [];
    
    logger.info('QuoteStateService disposed');
  }
}

export default QuoteStateService;