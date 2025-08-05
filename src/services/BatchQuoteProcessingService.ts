/**
 * Batch Quote Processing Service
 * High-performance batch processing for scraping and auto-filling multiple quotes
 * Leverages BrightData's generous rate limits (300 req/min, 100 concurrent batch requests)
 */

import { supabase } from '@/integrations/supabase/client';
import { brightDataProductService } from './BrightDataProductService';

export interface QuoteItem {
  id: string;
  url: string;
  name?: string;
  costprice_origin?: number;
  weight_kg?: number;
  weight?: number;
  quantity: number;
  category?: string;
  images?: string[];
  main_image?: string;
}

export interface BatchQuote {
  id: string;
  status: string;
  items: QuoteItem[];
  customer_name?: string;
  customer_email?: string;
}

export interface BatchProcessingProgress {
  totalQuotes: number;
  processedQuotes: number;
  successfulQuotes: number;
  failedQuotes: number;
  currentQuoteId?: string;
  processingSpeed: number; // quotes per minute
  timeElapsed: number; // seconds
  estimatedTimeRemaining: number; // seconds
}

export interface BatchProcessingResult {
  quoteId: string;
  success: boolean;
  itemsProcessed: number;
  itemsSuccessful: number;
  itemsFailed: number;
  errors?: string[];
  processingTime: number; // milliseconds
}

export interface BatchProcessingOptions {
  concurrency?: number; // Default: 50
  retryAttempts?: number; // Default: 2
  retryDelay?: number; // Default: 1000ms
  onProgress?: (progress: BatchProcessingProgress) => void;
  onQuoteComplete?: (result: BatchProcessingResult) => void;
  onError?: (error: string) => void;
}

class BatchQuoteProcessingService {
  private isProcessing = false;
  private shouldCancel = false;
  private startTime = 0;
  private processedCount = 0;
  private totalCount = 0;

  /**
   * Main method to process all draft/pending quotes in batch
   */
  async processBatchQuotes(options: BatchProcessingOptions = {}): Promise<BatchProcessingResult[]> {
    const {
      concurrency = 50,
      retryAttempts = 2,
      retryDelay = 1000,
      onProgress,
      onQuoteComplete,
      onError
    } = options;

    if (this.isProcessing) {
      throw new Error('Batch processing is already in progress');
    }

    this.isProcessing = true;
    this.shouldCancel = false;
    this.startTime = Date.now();
    this.processedCount = 0;

    try {
      // Fetch all draft/pending quotes
      const quotes = await this.fetchBatchQuotes();
      this.totalCount = quotes.length;

      if (quotes.length === 0) {
        onProgress?.({
          totalQuotes: 0,
          processedQuotes: 0,
          successfulQuotes: 0,
          failedQuotes: 0,
          processingSpeed: 0,
          timeElapsed: 0,
          estimatedTimeRemaining: 0
        });
        return [];
      }

      console.log(`🚀 Starting batch processing of ${quotes.length} quotes with concurrency: ${concurrency}`);

      // Process quotes in batches with high concurrency
      const results: BatchProcessingResult[] = [];
      const semaphore = new Semaphore(concurrency);

      const promises = quotes.map(async (quote) => {
        if (this.shouldCancel) return null;

        return semaphore.acquire(async () => {
          if (this.shouldCancel) return null;

          const result = await this.processQuoteWithRetry(quote, retryAttempts, retryDelay);
          
          this.processedCount++;
          
          // Update progress
          const timeElapsed = (Date.now() - this.startTime) / 1000;
          const processingSpeed = this.processedCount / (timeElapsed / 60); // quotes per minute
          const estimatedTimeRemaining = Math.max(0, (this.totalCount - this.processedCount) / (processingSpeed / 60));

          onProgress?.({
            totalQuotes: this.totalCount,
            processedQuotes: this.processedCount,
            successfulQuotes: results.filter(r => r?.success).length + (result.success ? 1 : 0),
            failedQuotes: results.filter(r => r && !r.success).length + (result.success ? 0 : 1),
            currentQuoteId: quote.id,
            processingSpeed,
            timeElapsed,
            estimatedTimeRemaining
          });

          onQuoteComplete?.(result);
          return result;
        });
      });

      // Wait for all quotes to complete
      const allResults = await Promise.all(promises);
      const validResults = allResults.filter((result): result is BatchProcessingResult => result !== null);

      console.log(`✅ Batch processing completed. ${validResults.filter(r => r.success).length}/${validResults.length} quotes successful`);

      return validResults;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during batch processing';
      console.error('❌ Batch processing failed:', errorMessage);
      onError?.(errorMessage);
      throw error;
    } finally {
      this.isProcessing = false;
      this.shouldCancel = false;
    }
  }

  /**
   * Cancel ongoing batch processing
   */
  cancelProcessing(): void {
    console.log('🛑 Cancelling batch processing...');
    this.shouldCancel = true;
  }

  /**
   * Check if batch processing is currently running
   */
  isRunning(): boolean {
    return this.isProcessing;
  }

  /**
   * Fetch all quotes that need processing (draft/pending status)
   */
  private async fetchBatchQuotes(): Promise<BatchQuote[]> {
    const { data, error } = await supabase
      .from('quotes_v2')
      .select(`
        id,
        status,
        customer_name,
        customer_email,
        items
      `)
      .in('status', ['draft', 'pending'])
      .not('items', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch quotes: ${error.message}`);
    }

    // Filter quotes that have items with URLs that need processing
    const quotesNeedingProcessing = (data || []).filter(quote => {
      if (!quote.items || !Array.isArray(quote.items)) return false;
      
      return quote.items.some((item: any) => 
        item.url && 
        item.url.trim() !== '' &&
        (!item.name || !item.costprice_origin) // Only process if missing key data
      );
    });

    console.log(`📊 Found ${data?.length || 0} draft/pending quotes, ${quotesNeedingProcessing.length} need processing`);
    
    return quotesNeedingProcessing;
  }

  /**
   * Process a single quote with retry logic
   */
  private async processQuoteWithRetry(
    quote: BatchQuote, 
    retryAttempts: number, 
    retryDelay: number
  ): Promise<BatchProcessingResult> {
    const startTime = Date.now();

    for (let attempt = 1; attempt <= retryAttempts + 1; attempt++) {
      if (this.shouldCancel) {
        return {
          quoteId: quote.id,
          success: false,
          itemsProcessed: 0,
          itemsSuccessful: 0,
          itemsFailed: 0,
          errors: ['Processing cancelled'],
          processingTime: Date.now() - startTime
        };
      }

      try {
        const result = await this.processQuote(quote);
        if (result.success || attempt === retryAttempts + 1) {
          return result;
        }
      } catch (error) {
        console.warn(`⚠️ Quote ${quote.id} failed attempt ${attempt}/${retryAttempts + 1}:`, error);
        
        if (attempt === retryAttempts + 1) {
          return {
            quoteId: quote.id,
            success: false,
            itemsProcessed: 0,
            itemsSuccessful: 0,
            itemsFailed: quote.items.length,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            processingTime: Date.now() - startTime
          };
        }

        // Wait before retry
        if (attempt <= retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }

    // This shouldn't be reached, but TypeScript requires it
    return {
      quoteId: quote.id,
      success: false,
      itemsProcessed: 0,
      itemsSuccessful: 0,
      itemsFailed: quote.items.length,
      errors: ['Max retries exceeded'],
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Process a single quote by scraping all its items
   */
  private async processQuote(quote: BatchQuote): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    console.log(`🔄 Processing quote ${quote.id} with ${quote.items.length} items`);

    const results = await Promise.allSettled(
      quote.items.map(item => this.processQuoteItem(item))
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));

    const errors = failed.map(r => 
      r.status === 'rejected' 
        ? r.reason instanceof Error ? r.reason.message : 'Unknown error'
        : r.value.error || 'Processing failed'
    );

    const updatedItems = quote.items.map((item, index) => {
      const result = results[index];
      if (result.status === 'fulfilled' && result.value.success) {
        // Always overwrite with new data when available
        const updatedItem = { ...item };
        
        if (result.value.data?.productName) {
          updatedItem.name = result.value.data.productName;
        }
        
        if (result.value.data?.price && result.value.data.price > 0) {
          updatedItem.costprice_origin = result.value.data.price;
        }
        
        if (result.value.data?.weight && result.value.data.weight > 0) {
          updatedItem.weight_kg = result.value.data.weight;
          updatedItem.weight = result.value.data.weight; // Support both field names
        }
        
        // Update images from scraping with validation
        if (result.value.data?.images && Array.isArray(result.value.data.images) && result.value.data.images.length > 0) {
          // Filter valid image URLs
          const validImages = result.value.data.images.filter((img: any) => 
            typeof img === 'string' && 
            img.trim() && 
            (img.startsWith('http://') || img.startsWith('https://'))
          );
          
          if (validImages.length > 0) {
            updatedItem.images = validImages;
            updatedItem.main_image = validImages[0]; // First image as main
            console.log(`✅ Updated ${validImages.length} images for item ${item.id}`);
          }
        }
        
        // Update category if available
        if (result.value.data?.category && typeof result.value.data.category === 'string') {
          updatedItem.category = result.value.data.category;
        }
        
        return updatedItem;
      }
      return item;
    });

    // Update quote in database if we have any successful items
    if (successful.length > 0) {
      try {
        await this.updateQuoteInDatabase(quote.id, updatedItems, successful.length === quote.items.length);
      } catch (error) {
        console.error(`❌ Failed to update quote ${quote.id} in database:`, error);
        errors.push('Database update failed');
      }
    }

    const result: BatchProcessingResult = {
      quoteId: quote.id,
      success: successful.length > 0,
      itemsProcessed: quote.items.length,
      itemsSuccessful: successful.length,
      itemsFailed: failed.length,
      errors: errors.length > 0 ? errors : undefined,
      processingTime: Date.now() - startTime
    };

    console.log(`${result.success ? '✅' : '❌'} Quote ${quote.id}: ${successful.length}/${quote.items.length} items successful`);
    
    return result;
  }

  /**
   * Process a single quote item by scraping its URL
   */
  private async processQuoteItem(item: QuoteItem): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    if (!item.url || item.url.trim() === '') {
      return { success: false, error: 'No product URL provided' };
    }

    // Always process URLs to allow overwriting existing data
    // This ensures batch processing can update/refresh product information

    try {
      const result = await brightDataProductService.fetchProductData(item.url, {
        includeImages: true,
        includeVariants: true,
        enhanceWithAI: true
      });

      if (result.success && result.data) {
        return {
          success: true,
          data: {
            productName: result.data.title,
            price: result.data.price,
            weight: result.data.weight || result.data.weight_value,
            currency: result.data.currency,
            category: result.data.category,
            brand: result.data.brand,
            images: result.data.images
          }
        };
      } else {
        return { success: false, error: result.error || 'Scraping failed' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown scraping error' 
      };
    }
  }

  /**
   * Update quote in database with scraped data
   */
  private async updateQuoteInDatabase(
    quoteId: string, 
    updatedItems: QuoteItem[], 
    allItemsSuccessful: boolean
  ): Promise<void> {
    const updateData: any = {
      items: updatedItems,
      updated_at: new Date().toISOString()
    };

    // First, save the scraped data
    const { error: updateError } = await supabase
      .from('quotes_v2')
      .update(updateData)
      .eq('id', quoteId);

    if (updateError) {
      throw new Error(`Failed to update quote ${quoteId}: ${updateError.message}`);
    }

    console.log(`✅ Quote ${quoteId}: Scraped data saved to database`);

    // If all items were successfully processed, trigger auto-calculation
    if (allItemsSuccessful) {
      console.log(`🧮 Quote ${quoteId}: All items scraped successfully, triggering auto-calculation...`);
      
      try {
        // Fetch the complete quote data for calculation
        const { data: quoteData, error: fetchError } = await supabase
          .from('quotes_v2')
          .select('*')
          .eq('id', quoteId)
          .single();

        if (fetchError) {
          console.error(`❌ Failed to fetch quote data for calculation:`, fetchError);
          return;
        }

        if (!quoteData) {
          console.error(`❌ Quote ${quoteId} not found for calculation`);
          return;
        }

        // Trigger calculation using QuoteCalculatorService
        console.log(`📊 Calculating quote ${quoteId} with ${updatedItems.length} items...`);
        
        // Skip auto-calculation for now - let admin handle it manually
        console.log(`⏸️ Auto-calculation skipped. Quote ${quoteId} is ready for manual calculation.`);
        
        // Update status to indicate items are scraped and ready
        const { error: statusError } = await supabase
          .from('quotes_v2')
          .update({ 
            status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', quoteId);

        if (statusError) {
          console.error(`❌ Failed to update quote status:`, statusError);
        } else {
          console.log(`✅ Quote ${quoteId}: Items scraped, ready for calculation`);
        }
        
        if (false) { // Skip this entire block
          // Save calculation results back to database
          const calculationUpdateData = {
            calculation_data: calculationResult.data,
            total_usd: calculationResult.data.calculation_steps?.total_usd || 0,
            total_customer_currency: calculationResult.data.calculation_steps?.total_customer_currency || 0,
            customer_currency: calculationResult.data.calculation_steps?.customer_currency,
            status: 'calculated',
            calculated_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { error: calcError } = await supabase
            .from('quotes_v2')
            .update(calculationUpdateData)
            .eq('id', quoteId);

          if (calcError) {
            console.error(`❌ Failed to save calculation results for quote ${quoteId}:`, calcError);
          } else {
            console.log(`✅ Quote ${quoteId}: Auto-calculation completed and saved successfully`);
          }
        } else {
          console.error(`❌ Quote ${quoteId}: Calculation failed:`, calculationResult.error);
        }
      } catch (error) {
        console.error(`❌ Quote ${quoteId}: Auto-calculation error:`, error);
      }
    }
  }
}

/**
 * Semaphore class for controlling concurrency
 */
class Semaphore {
  private permits: number;
  private waiting: Array<(value?: any) => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.permits > 0) {
        this.permits--;
        this.executeTask(task, resolve, reject);
      } else {
        this.waiting.push(() => {
          this.permits--;
          this.executeTask(task, resolve, reject);
        });
      }
    });
  }

  private async executeTask<T>(
    task: () => Promise<T>,
    resolve: (value: T) => void,
    reject: (reason?: any) => void
  ): Promise<void> {
    try {
      const result = await task();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.permits++;
      if (this.waiting.length > 0) {
        const next = this.waiting.shift();
        next?.();
      }
    }
  }
}

// Export singleton instance
export const batchQuoteProcessingService = new BatchQuoteProcessingService();