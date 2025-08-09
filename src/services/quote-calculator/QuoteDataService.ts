/**
 * Quote Data Service
 * Handles save/load operations and persistence for the quote calculator
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { autoSaveService } from '@/services/AutoSaveService';
import { QuoteFormData, QuoteItem } from './QuoteFormState';
import { QuoteCalculationData } from './QuoteCalculationEngine';
import { toast } from '@/hooks/use-toast';

export interface SaveQuoteOptions {
  autoSave?: boolean;
  skipValidation?: boolean;
  includeCalculation?: boolean;
  updateExisting?: boolean;
}

export interface LoadQuoteOptions {
  includeCalculation?: boolean;
  loadDrafts?: boolean;
  includeArchived?: boolean;
}

export interface SaveResult {
  success: boolean;
  quoteId?: string;
  error?: string;
  isUpdate?: boolean;
}

export interface QuoteData {
  id: string;
  formData: QuoteFormData;
  calculationData?: QuoteCalculationData;
  metadata: {
    created_at: string;
    updated_at: string;
    created_by?: string;
    status: 'draft' | 'sent' | 'approved' | 'rejected' | 'archived';
    version: string;
  };
}

export interface QuoteDraft {
  id: string;
  formData: Partial<QuoteFormData>;
  timestamp: Date;
  autoSaved: boolean;
}

export class QuoteDataService {
  private readonly version = '2.0.0';
  private drafts: Map<string, QuoteDraft> = new Map();
  private autoSaveEnabled = true;
  private autoSaveInterval = 30000; // 30 seconds
  private autoSaveTimer?: NodeJS.Timeout;

  constructor() {
    this.initializeAutoSave();
    logger.info('QuoteDataService initialized');
  }

  /**
   * Save quote to database
   */
  async saveQuote(formData: QuoteFormData, calculation?: QuoteCalculationData, options: SaveQuoteOptions = {}): Promise<SaveResult> {
    try {
      const startTime = Date.now();

      // Prepare quote data
      const quoteData = this.prepareQuoteForSave(formData, calculation);
      
      // Determine if this is an update or new quote
      const isUpdate = options.updateExisting && formData.quoteId;
      
      let result: any;
      
      if (isUpdate) {
        // Update existing quote
        result = await supabase
          .from('quotes_v2')
          .update(quoteData)
          .eq('id', formData.quoteId)
          .select()
          .single();
      } else {
        // Create new quote
        result = await supabase
          .from('quotes_v2')
          .insert([quoteData])
          .select()
          .single();
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      const quoteId = result.data.id;

      // Save items separately
      if (formData.items && formData.items.length > 0) {
        await this.saveQuoteItems(quoteId, formData.items, isUpdate);
      }

      // Clear draft if this was a full save
      if (!options.autoSave) {
        this.clearDraft(formData.quoteId || 'new');
      }

      logger.info('Quote saved successfully', {
        quoteId,
        isUpdate,
        processingTime: Date.now() - startTime
      });

      return {
        success: true,
        quoteId,
        isUpdate
      };

    } catch (error) {
      logger.error('Quote save error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Save failed'
      };
    }
  }

  /**
   * Load quote from database
   */
  async loadQuote(quoteId: string, options: LoadQuoteOptions = {}): Promise<{ success: boolean; data?: QuoteData; error?: string }> {
    try {
      const startTime = Date.now();

      // Load main quote data (excluding deprecated total_quote_origincurrency)
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes_v2')
        .select(`
          id, quote_number, customer_id, customer_email, customer_name, customer_phone,
          origin_country, origin_state, destination_country, destination_state, destination_pincode,
          destination_address, items, shipping_method, payment_gateway, customer_currency,
          order_discount_type, order_discount_value, order_discount_code,
          shipping_discount_type, shipping_discount_value, insurance_required, insurance_enabled,
          admin_notes, customer_notes, status, calculation_data, calculation_result,
          total_quote_origincurrency, share_token, expires_at, reminder_count, last_reminder_at,
          created_at, updated_at, calculated_at, approved_at, created_by, approved_by,
          validity_days, sent_at, viewed_at, email_sent, sms_sent, whatsapp_sent,
          preferred_contact, version, parent_quote_id, revision_reason, changes_summary,
          payment_terms, approval_required, max_discount_percentage, minimum_order_value,
          converted_to_order_id, original_quote_id, external_reference, source,
          ip_address, user_agent, utm_source, utm_medium, utm_campaign,
          is_latest_version, approval_required_above, max_discount_allowed, api_version,
          applied_discounts, selected_shipping_option_id, delivery_address_id,
          options_last_updated_at, options_last_updated_by, in_cart
        `)
        .eq('id', quoteId)
        .single();

      if (quoteError) {
        throw new Error(quoteError.message);
      }

      if (!quoteData) {
        throw new Error('Quote not found');
      }

      // Load quote items
      const { data: itemsData, error: itemsError } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at');

      if (itemsError) {
        logger.warn('Failed to load quote items:', itemsError);
      }

      // Transform database data to form data format
      const formData = this.transformDatabaseToFormData(quoteData, itemsData || []);

      const result: QuoteData = {
        id: quoteId,
        formData,
        calculationData: options.includeCalculation ? quoteData.calculation_data : undefined,
        metadata: {
          created_at: quoteData.created_at,
          updated_at: quoteData.updated_at,
          created_by: quoteData.created_by,
          status: quoteData.status,
          version: this.version
        }
      };

      logger.info('Quote loaded successfully', {
        quoteId,
        processingTime: Date.now() - startTime
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      logger.error('Quote load error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Load failed'
      };
    }
  }

  /**
   * Auto-save functionality
   */
  async autoSave(formData: QuoteFormData): Promise<void> {
    if (!this.autoSaveEnabled) return;

    try {
      const draftId = formData.quoteId || 'new';
      
      // Save to local drafts
      const draft: QuoteDraft = {
        id: draftId,
        formData: { ...formData },
        timestamp: new Date(),
        autoSaved: true
      };

      this.drafts.set(draftId, draft);

      // Also use the existing auto-save service
      if (formData.quoteId) {
        await autoSaveService.saveQuoteData(formData.quoteId, {
          form_data: formData,
          last_modified: new Date().toISOString()
        });
      }

      logger.debug('Auto-save completed', { draftId });

    } catch (error) {
      logger.warn('Auto-save failed:', error);
    }
  }

  /**
   * Load draft data
   */
  loadDraft(draftId: string): QuoteDraft | null {
    const draft = this.drafts.get(draftId);
    
    if (draft) {
      logger.info('Draft loaded', { draftId, age: Date.now() - draft.timestamp.getTime() });
      return draft;
    }

    return null;
  }

  /**
   * Clear draft
   */
  clearDraft(draftId: string): void {
    this.drafts.delete(draftId);
    logger.debug('Draft cleared', { draftId });
  }

  /**
   * Get all drafts
   */
  getAllDrafts(): QuoteDraft[] {
    return Array.from(this.drafts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Export quote data
   */
  exportQuote(formData: QuoteFormData, calculation?: QuoteCalculationData, format: 'json' | 'csv' = 'json'): { success: boolean; data?: string; filename?: string; error?: string } {
    try {
      const exportData = {
        quote: formData,
        calculation,
        exported_at: new Date().toISOString(),
        version: this.version
      };

      if (format === 'json') {
        return {
          success: true,
          data: JSON.stringify(exportData, null, 2),
          filename: `quote_${formData.quoteId || 'new'}_${Date.now()}.json`
        };
      } else if (format === 'csv') {
        const csvData = this.convertToCSV(formData);
        return {
          success: true,
          data: csvData,
          filename: `quote_${formData.quoteId || 'new'}_${Date.now()}.csv`
        };
      }

      throw new Error('Unsupported export format');

    } catch (error) {
      logger.error('Export error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Import quote data
   */
  importQuote(data: string, format: 'json' | 'csv' = 'json'): { success: boolean; formData?: QuoteFormData; error?: string } {
    try {
      if (format === 'json') {
        const importData = JSON.parse(data);
        
        if (!importData.quote) {
          throw new Error('Invalid import data format');
        }

        // Validate and clean imported data
        const formData = this.validateImportedData(importData.quote);
        
        return {
          success: true,
          formData
        };
      } else {
        throw new Error('CSV import not yet supported');
      }

    } catch (error) {
      logger.error('Import error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Import failed'
      };
    }
  }

  /**
   * Duplicate quote
   */
  async duplicateQuote(sourceQuoteId: string): Promise<SaveResult> {
    try {
      // Load the source quote
      const loadResult = await this.loadQuote(sourceQuoteId);
      
      if (!loadResult.success || !loadResult.data) {
        throw new Error(loadResult.error || 'Failed to load source quote');
      }

      // Modify the form data for duplication
      const duplicatedFormData: QuoteFormData = {
        ...loadResult.data.formData,
        quoteId: undefined, // Remove ID to create new quote
        isEditMode: false,
        isDirty: true,
        adminNotes: `Duplicated from quote ${sourceQuoteId}\n\n${loadResult.data.formData.adminNotes || ''}`
      };

      // Generate new IDs for items
      duplicatedFormData.items = duplicatedFormData.items.map(item => ({
        ...item,
        id: crypto.randomUUID()
      }));

      // Save as new quote
      const saveResult = await this.saveQuote(duplicatedFormData);
      
      if (saveResult.success) {
        toast({
          title: "Quote Duplicated",
          description: `Successfully created a copy with ID: ${saveResult.quoteId}`,
        });
      }

      return saveResult;

    } catch (error) {
      logger.error('Quote duplication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Duplication failed'
      };
    }
  }

  /**
   * Search quotes
   */
  async searchQuotes(query: string, filters: {
    status?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    customerEmail?: string;
    limit?: number;
  } = {}): Promise<{ success: boolean; quotes?: any[]; error?: string }> {
    try {
      let queryBuilder = supabase
        .from('quotes_v2')
        .select('id, customer_name, customer_email, status, final_total_origin, total_origin_currency, created_at, updated_at')
        .order('updated_at', { ascending: false });

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        queryBuilder = queryBuilder.in('status', filters.status);
      }

      if (filters.dateFrom) {
        queryBuilder = queryBuilder.gte('created_at', filters.dateFrom.toISOString());
      }

      if (filters.dateTo) {
        queryBuilder = queryBuilder.lte('created_at', filters.dateTo.toISOString());
      }

      if (filters.customerEmail) {
        queryBuilder = queryBuilder.ilike('customer_email', `%${filters.customerEmail}%`);
      }

      if (query) {
        queryBuilder = queryBuilder.or(`customer_name.ilike.%${query}%,customer_email.ilike.%${query}%,id.ilike.%${query}%`);
      }

      if (filters.limit) {
        queryBuilder = queryBuilder.limit(filters.limit);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        quotes: data
      };

    } catch (error) {
      logger.error('Quote search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }

  /**
   * Private helper methods
   */
  private prepareQuoteForSave(formData: QuoteFormData, calculation?: QuoteCalculationData): any {
    return {
      // Basic info
      origin_country: formData.originCountry,
      destination_country: formData.destinationCountry,
      destination_state: formData.destinationState,
      shipping_method: formData.shippingMethod,
      
      // Customer info
      customer_name: formData.customerName,
      customer_email: formData.customerEmail,
      customer_phone: formData.customerPhone,
      customer_currency: formData.customerCurrency,
      
      // Address (stored as JSON)
      customer_address: formData.customerAddress,
      destination_address: formData.destinationAddress,
      
      // Pricing
      total_origin_currency: calculation?.total_origin_currency || 0,
      total_destination_currency: calculation?.total_destination_currency || 0,
      
      // Discounts
      order_discount_type: formData.orderDiscountType,
      order_discount_value: formData.orderDiscountValue,
      order_discount_code: formData.orderDiscountCode,
      shipping_discount_type: formData.shippingDiscountType,
      shipping_discount_value: formData.shippingDiscountValue,
      
      // Settings
      insurance_enabled: formData.insuranceEnabled,
      payment_gateway: formData.paymentGateway,
      
      // Metadata
      admin_notes: formData.adminNotes,
      calculation_data: calculation,
      form_data: formData,
      
      // Status
      status: formData.isEditMode ? 'draft' : 'draft',
      updated_at: new Date().toISOString()
    };
  }

  private async saveQuoteItems(quoteId: string, items: QuoteItem[], isUpdate: boolean): Promise<void> {
    if (isUpdate) {
      // Delete existing items
      await supabase
        .from('quote_items')
        .delete()
        .eq('quote_id', quoteId);
    }

    // Insert new items
    const itemsData = items.map(item => ({
      quote_id: quoteId,
      name: item.name,
      url: item.url,
      quantity: item.quantity,
      unit_price_origin: item.unit_price_origin,
      weight_kg: item.weight_kg,
      category: item.category,
      notes: item.notes,
      hsn_code: item.hsn_code,
      hsn_display_name: item.hsn_display_name,
      hsn_category: item.hsn_category,
      discount_percentage: item.discount_percentage,
      discount_amount: item.discount_amount,
      discount_type: item.discount_type,
      images: item.images,
      dimensions: item.dimensions,
      volumetric_weight_kg: item.volumetric_weight_kg,
      valuation_preference: item.valuation_preference,
      declared_value: item.declared_value
    }));

    const { error } = await supabase
      .from('quote_items')
      .insert(itemsData);

    if (error) {
      throw new Error(`Failed to save quote items: ${error.message}`);
    }
  }

  private transformDatabaseToFormData(quoteData: any, itemsData: any[]): QuoteFormData {
    // Transform database structure back to form data structure
    const formData: QuoteFormData = {
      // Basic info
      originCountry: quoteData.origin_country || 'US',
      originState: quoteData.origin_state || '',
      destinationCountry: quoteData.destination_country || 'NP',
      destinationState: quoteData.destination_state || 'urban',
      destinationPincode: quoteData.destination_pincode || '',
      destinationAddress: quoteData.destination_address || {
        line1: '', line2: '', city: '', state: '', pincode: ''
      },
      
      // Items
      items: itemsData.map(item => ({
        id: item.id,
        name: item.name,
        url: item.url,
        quantity: item.quantity,
        unit_price_origin: item.unit_price_origin,
        weight_kg: item.weight_kg,
        category: item.category,
        notes: item.notes,
        hsn_code: item.hsn_code,
        hsn_display_name: item.hsn_display_name,
        hsn_category: item.hsn_category,
        discount_percentage: item.discount_percentage,
        discount_amount: item.discount_amount,
        discount_type: item.discount_type,
        images: item.images,
        dimensions: item.dimensions,
        volumetric_weight_kg: item.volumetric_weight_kg,
        valuation_preference: item.valuation_preference,
        declared_value: item.declared_value
      })),
      
      // Shipping & Service Options
      shippingMethod: quoteData.shipping_method || 'standard',
      delhiveryServiceType: 'standard',
      ncmServiceType: 'pickup',
      destinationDistrict: '',
      selectedNCMBranch: null,
      availableNCMBranches: [],
      
      // Payment & Currency
      paymentGateway: quoteData.payment_gateway || 'stripe',
      customerCurrency: quoteData.customer_currency || 'NPR',
      
      // Customer info
      customerName: quoteData.customer_name || '',
      customerEmail: quoteData.customer_email || '',
      customerPhone: quoteData.customer_phone || '',
      customerAddress: quoteData.customer_address,
      
      // Discounts
      orderDiscountType: quoteData.order_discount_type || 'percentage',
      orderDiscountValue: quoteData.order_discount_value || 0,
      orderDiscountCode: quoteData.order_discount_code || '',
      orderDiscountCodeId: null,
      shippingDiscountType: quoteData.shipping_discount_type || 'percentage',
      shippingDiscountValue: quoteData.shipping_discount_value || 0,
      discountCodes: [],
      applyComponentDiscounts: true,
      
      // Settings
      insuranceEnabled: quoteData.insurance_enabled ?? true,
      adminNotes: quoteData.admin_notes || '',
      
      // Metadata
      quoteId: quoteData.id,
      isEditMode: true,
      isDirty: false,
      validationErrors: {},
      lastCalculation: quoteData.calculation_data
    };

    return formData;
  }

  private convertToCSV(formData: QuoteFormData): string {
    const headers = [
      'Item Name', 'URL', 'Quantity', 'Unit Price (Origin)', 
      'Weight (kg)', 'Category', 'Notes', 'HSN Code'
    ];

    const rows = formData.items.map(item => [
      item.name,
      item.url || '',
      item.quantity.toString(),
      item.unit_price_origin.toString(),
      (item.weight_kg || 0).toString(),
      item.category || '',
      item.notes || '',
      item.hsn_code || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  private validateImportedData(data: any): QuoteFormData {
    // Basic validation and cleaning of imported data
    const cleanData = {
      ...data,
      items: (data.items || []).map((item: any) => ({
        ...item,
        id: crypto.randomUUID(), // Generate new IDs
        quantity: Number(item.quantity) || 1,
        unit_price_origin: Number(item.unit_price_origin) || 0,
        weight_kg: Number(item.weight_kg) || 0
      }))
    };

    return cleanData as QuoteFormData;
  }

  private initializeAutoSave(): void {
    if (this.autoSaveEnabled && !this.autoSaveTimer) {
      this.autoSaveTimer = setInterval(() => {
        // Auto-save will be triggered by the main component
      }, this.autoSaveInterval);
    }
  }

  /**
   * Configuration methods
   */
  setAutoSaveEnabled(enabled: boolean): void {
    this.autoSaveEnabled = enabled;
    
    if (enabled && !this.autoSaveTimer) {
      this.initializeAutoSave();
    } else if (!enabled && this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = undefined;
    }
    
    logger.info('Auto-save enabled changed', { enabled });
  }

  setAutoSaveInterval(interval: number): void {
    this.autoSaveInterval = interval;
    
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.initializeAutoSave();
    }
    
    logger.info('Auto-save interval changed', { interval });
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    this.drafts.clear();
    logger.info('QuoteDataService destroyed');
  }
}

// Export singleton instance
export const quoteDataService = new QuoteDataService();