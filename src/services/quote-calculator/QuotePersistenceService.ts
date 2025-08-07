/**
 * Quote Persistence Service
 * Handles save/load/update operations, auto-save functionality, and share token management
 * Decomposed from QuoteCalculatorV2 for better separation of concerns
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { autoSaveService } from '@/services/AutoSaveService';
import type { QuoteItem } from './QuoteFormStateService';
import { toast } from '@/hooks/use-toast';
import { getOriginCurrency } from '@/utils/originCurrency';

export interface QuoteData {
  id?: string;
  quote_number?: string;
  customer_email?: string;
  customer_name?: string;
  customer_phone?: string;
  origin_country: string;
  origin_state?: string;
  destination_country: string;
  destination_state?: string;
  destination_pincode?: string;
  destination_address?: any;
  items: QuoteItem[];
  shipping_method: string;
  payment_gateway: string;
  customer_currency: string;
  order_discount_type: 'percentage' | 'fixed';
  order_discount_value: number;
  order_discount_code?: string;
  shipping_discount_type: 'percentage' | 'fixed' | 'free';
  shipping_discount_value: number;
  insurance_enabled: boolean;
  admin_notes?: string;
  status: string;
  calculation_result?: any;
  share_token?: string;
  expires_at?: string;
  reminder_count?: number;
  last_reminder_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SaveResult {
  success: boolean;
  quoteId?: string;
  error?: string;
  isUpdate?: boolean;
}

export interface ShareTokenResult {
  success: boolean;
  shareToken?: string;
  expiresAt?: string;
  shareUrl?: string;
  error?: string;
}

export interface AutoSaveState {
  enabled: boolean;
  interval: number;
  lastSaved?: Date;
  pendingChanges: boolean;
  error?: string;
}

export interface QuoteVersion {
  id: string;
  quoteId: string;
  version: number;
  changes: string[];
  data: Partial<QuoteData>;
  createdAt: Date;
  createdBy?: string;
}

export class QuotePersistenceService {
  private autoSaveInterval?: NodeJS.Timeout;
  private autoSaveState: AutoSaveState = {
    enabled: true,
    interval: 30000, // 30 seconds
    pendingChanges: false
  };
  
  private listeners = new Map<string, Function[]>();
  private versionHistory = new Map<string, QuoteVersion[]>();

  constructor() {
    logger.info('QuotePersistenceService initialized');
  }

  /**
   * Save quote (create or update)
   */
  async saveQuote(data: QuoteData): Promise<SaveResult> {
    try {
      const isUpdate = !!data.id;
      const now = new Date().toISOString();

      // Prepare quote data
      const quotePayload = {
        customer_email: data.customer_email || '',
        customer_name: data.customer_name || '',
        customer_phone: data.customer_phone || '',
        origin_country: data.origin_country,
        origin_state: data.origin_state || '',
        destination_country: data.destination_country,
        destination_state: data.destination_state || 'urban',
        destination_pincode: data.destination_pincode || '',
        destination_address: data.destination_address || {},
        items: data.items || [],
        shipping_method: data.shipping_method || 'standard',
        payment_gateway: data.payment_gateway || 'stripe',
        customer_currency: data.customer_currency || getOriginCurrency(data.origin_country),
        order_discount_type: data.order_discount_type || 'percentage',
        order_discount_value: data.order_discount_value || 0,
        order_discount_code: data.order_discount_code || '',
        shipping_discount_type: data.shipping_discount_type || 'percentage',
        shipping_discount_value: data.shipping_discount_value || 0,
        insurance_enabled: data.insurance_enabled !== false,
        admin_notes: data.admin_notes || '',
        status: data.status || 'draft',
        calculation_result: data.calculation_result || {},
        updated_at: now
      };

      let result;

      if (isUpdate) {
        // Update existing quote
        result = await supabase
          .from('quotes_v2')
          .update(quotePayload)
          .eq('id', data.id!)
          .select()
          .single();

        if (result.error) {
          throw new Error(`Update failed: ${result.error.message}`);
        }

        // Create version entry
        await this.createVersion(data.id!, 'update', ['general_update'], quotePayload);

        logger.info(`Quote ${data.id} updated successfully`);
        this.notifyListeners('updated', { quoteId: data.id, data: result.data });

      } else {
        // Create new quote
        const createPayload = {
          ...quotePayload,
          quote_number: await this.generateQuoteNumber(),
          created_at: now
        };

        result = await supabase
          .from('quotes_v2')
          .insert(createPayload)
          .select()
          .single();

        if (result.error) {
          throw new Error(`Create failed: ${result.error.message}`);
        }

        logger.info(`Quote ${result.data.id} created successfully`);
        this.notifyListeners('created', { quoteId: result.data.id, data: result.data });
      }

      // Clear pending changes
      this.autoSaveState.pendingChanges = false;
      this.autoSaveState.lastSaved = new Date();

      return {
        success: true,
        quoteId: result.data.id,
        isUpdate
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Quote save failed:', error);
      
      toast({
        title: "Save Failed",
        description: errorMessage,
        variant: "destructive"
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Load quote by ID
   */
  async loadQuote(quoteId: string): Promise<QuoteData | null> {
    try {
      const { data, error } = await supabase
        .from('quotes_v2')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          logger.warn(`Quote ${quoteId} not found`);
          return null;
        }
        throw error;
      }

      logger.info(`Quote ${quoteId} loaded successfully`);
      this.notifyListeners('loaded', { quoteId, data });

      return data as QuoteData;

    } catch (error) {
      logger.error('Quote load failed:', error);
      toast({
        title: "Load Failed",
        description: "Failed to load quote",
        variant: "destructive"
      });
      return null;
    }
  }

  /**
   * Load quote by share token
   */
  async loadQuoteByShareToken(shareToken: string): Promise<QuoteData | null> {
    try {
      const { data, error } = await supabase
        .from('quotes_v2')
        .select('*')
        .eq('share_token', shareToken)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          logger.warn(`Quote with share token ${shareToken} not found`);
          return null;
        }
        throw error;
      }

      // Check if share token has expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        logger.warn(`Share token ${shareToken} has expired`);
        return null;
      }

      logger.info(`Quote loaded via share token: ${shareToken}`);
      return data as QuoteData;

    } catch (error) {
      logger.error('Quote load by share token failed:', error);
      return null;
    }
  }

  /**
   * Generate or update share token
   */
  async generateShareToken(quoteId: string, expirationHours = 168): Promise<ShareTokenResult> { // 7 days default
    try {
      const shareToken = this.generateToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expirationHours);

      const { error } = await supabase
        .from('quotes_v2')
        .update({
          share_token: shareToken,
          expires_at: expiresAt.toISOString()
        })
        .eq('id', quoteId);

      if (error) {
        throw error;
      }

      const shareUrl = `${window.location.origin}/quotes/shared/${shareToken}`;

      logger.info(`Share token generated for quote ${quoteId}: ${shareToken}`);
      this.notifyListeners('share_token_generated', { quoteId, shareToken, shareUrl });

      return {
        success: true,
        shareToken,
        expiresAt: expiresAt.toISOString(),
        shareUrl
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Share token generation failed:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Delete quote
   */
  async deleteQuote(quoteId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('quotes_v2')
        .delete()
        .eq('id', quoteId);

      if (error) {
        throw error;
      }

      // Clean up version history
      this.versionHistory.delete(quoteId);

      logger.info(`Quote ${quoteId} deleted successfully`);
      this.notifyListeners('deleted', { quoteId });

      return true;

    } catch (error) {
      logger.error('Quote delete failed:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete quote",
        variant: "destructive"
      });
      return false;
    }
  }

  /**
   * Auto-save functionality
   */
  enableAutoSave(data: QuoteData, interval = 30000): void {
    this.autoSaveState.enabled = true;
    this.autoSaveState.interval = interval;

    // Clear existing interval
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    // Set up new interval
    this.autoSaveInterval = setInterval(async () => {
      if (this.autoSaveState.pendingChanges && data.id) {
        try {
          const result = await this.saveQuote(data);
          if (result.success) {
            logger.debug('Auto-save completed successfully');
            this.autoSaveState.error = undefined;
          } else {
            this.autoSaveState.error = result.error;
          }
        } catch (error) {
          this.autoSaveState.error = error instanceof Error ? error.message : 'Auto-save failed';
          logger.warn('Auto-save failed:', error);
        }
      }
    }, interval);

    logger.info(`Auto-save enabled with ${interval}ms interval`);
  }

  /**
   * Disable auto-save
   */
  disableAutoSave(): void {
    this.autoSaveState.enabled = false;
    
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = undefined;
    }

    logger.info('Auto-save disabled');
  }

  /**
   * Mark changes as pending for auto-save
   */
  markPendingChanges(): void {
    this.autoSaveState.pendingChanges = true;
  }

  /**
   * Get auto-save state
   */
  getAutoSaveState(): AutoSaveState {
    return { ...this.autoSaveState };
  }

  /**
   * Get recent quotes
   */
  async getRecentQuotes(limit = 10): Promise<QuoteData[]> {
    try {
      const { data, error } = await supabase
        .from('quotes_v2')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data as QuoteData[];

    } catch (error) {
      logger.error('Failed to fetch recent quotes:', error);
      return [];
    }
  }

  /**
   * Search quotes
   */
  async searchQuotes(query: string, filters?: {
    status?: string;
    country?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<QuoteData[]> {
    try {
      let queryBuilder = supabase
        .from('quotes_v2')
        .select('*');

      // Apply text search
      if (query.trim()) {
        queryBuilder = queryBuilder.or(`
          customer_name.ilike.%${query}%,
          customer_email.ilike.%${query}%,
          quote_number.ilike.%${query}%
        `);
      }

      // Apply filters
      if (filters?.status) {
        queryBuilder = queryBuilder.eq('status', filters.status);
      }
      
      if (filters?.country) {
        queryBuilder = queryBuilder.eq('destination_country', filters.country);
      }

      if (filters?.dateFrom) {
        queryBuilder = queryBuilder.gte('created_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        queryBuilder = queryBuilder.lte('created_at', filters.dateTo);
      }

      const { data, error } = await queryBuilder
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      return data as QuoteData[];

    } catch (error) {
      logger.error('Quote search failed:', error);
      return [];
    }
  }

  /**
   * Export quote data
   */
  async exportQuote(quoteId: string, format: 'json' | 'pdf' = 'json'): Promise<string | ArrayBuffer | null> {
    const quote = await this.loadQuote(quoteId);
    if (!quote) return null;

    switch (format) {
      case 'json':
        return JSON.stringify(quote, null, 2);
      
      case 'pdf':
        // Would need PDF generation library
        throw new Error('PDF export not implemented');
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Create version history entry
   */
  private async createVersion(
    quoteId: string, 
    action: string, 
    changes: string[], 
    data: Partial<QuoteData>
  ): Promise<void> {
    const version: QuoteVersion = {
      id: crypto.randomUUID(),
      quoteId,
      version: this.getNextVersionNumber(quoteId),
      changes,
      data,
      createdAt: new Date()
    };

    // Store in memory (could be extended to database)
    if (!this.versionHistory.has(quoteId)) {
      this.versionHistory.set(quoteId, []);
    }
    
    const versions = this.versionHistory.get(quoteId)!;
    versions.push(version);

    // Keep only last 10 versions
    if (versions.length > 10) {
      versions.splice(0, versions.length - 10);
    }

    logger.debug(`Version ${version.version} created for quote ${quoteId}: ${action}`);
  }

  /**
   * Get version history
   */
  getVersionHistory(quoteId: string): QuoteVersion[] {
    return this.versionHistory.get(quoteId) || [];
  }

  /**
   * Subscribe to events
   */
  subscribe(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    this.listeners.get(event)!.push(callback);
    
    return () => {
      const callbacks = this.listeners.get(event);
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
  private async generateQuoteNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `Q${year}${randomSuffix}`;
  }

  private generateToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private getNextVersionNumber(quoteId: string): number {
    const versions = this.versionHistory.get(quoteId) || [];
    return versions.length + 1;
  }

  private notifyListeners(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`Listener error for event ${event}:`, error);
        }
      });
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.disableAutoSave();
    this.listeners.clear();
    this.versionHistory.clear();
    logger.info('QuotePersistenceService disposed');
  }
}

export default QuotePersistenceService;