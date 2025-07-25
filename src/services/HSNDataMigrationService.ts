/**
 * HSN Data Migration Service
 * Safely migrates existing quote data to HSN-based tax system
 *
 * Migration Strategy:
 * 1. Analyze existing quotes and items
 * 2. Auto-classify items with HSN codes
 * 3. Migrate tax calculations to per-item HSN method
 * 4. Preserve original data for rollback
 * 5. Validate migration integrity
 */

import { supabase } from '@/integrations/supabase/client';
import { unifiedDataEngine } from './UnifiedDataEngine';
import { autoProductClassifier } from './AutoProductClassifier';
import { hsnQuoteIntegrationService } from './HSNQuoteIntegrationService';
import { HSNSystemError, HSNErrors, hsnErrorHandler } from '@/lib/error-handling/HSNSystemError';
import { hsnSecurity, HSNPermission } from '@/lib/security/HSNSecurityManager';
import type { UnifiedQuote } from '@/types/unified-quote';

interface MigrationBatch {
  batch_id: string;
  quote_ids: string[];
  total_quotes: number;
  processed_items: number;
  classification_results: ClassificationResult[];
  migration_status: 'pending' | 'processing' | 'completed' | 'failed' | 'rolled_back';
  created_at: string;
  completed_at?: string;
  error_count: number;
  warnings: string[];
}

interface ClassificationResult {
  quote_id: string;
  item_id: string;
  item_name: string;
  original_category?: string;
  assigned_hsn_code: string;
  classification_confidence: number;
  classification_method: 'auto' | 'manual' | 'fallback';
  tax_calculation_changed: boolean;
  original_tax_amount?: number;
  new_tax_amount: number;
  validation_status: 'valid' | 'warning' | 'error';
  validation_messages: string[];
}

interface MigrationSummary {
  total_quotes_processed: number;
  total_items_processed: number;
  successful_classifications: number;
  failed_classifications: number;
  average_confidence_score: number;
  tax_calculation_changes: {
    increased: number;
    decreased: number;
    unchanged: number;
    total_difference_usd: number;
  };
  processing_time_ms: number;
  data_integrity_score: number;
  rollback_safety_score: number;
}

interface MigrationOptions {
  batch_size: number;
  dry_run: boolean;
  preserve_original_data: boolean;
  auto_classify_confidence_threshold: number;
  validate_tax_calculations: boolean;
  enable_rollback_snapshots: boolean;
  continue_on_errors: boolean;
  classification_methods: ('keyword' | 'category' | 'ml' | 'url')[];
}

class HSNDataMigrationService {
  private migrationBatches: Map<string, MigrationBatch> = new Map();
  private rollbackSnapshots: Map<string, any[]> = new Map();
  private migrationStats = {
    totalMigrations: 0,
    successfulMigrations: 0,
    failedMigrations: 0,
    totalProcessingTime: 0,
    averageProcessingTime: 0,
  };

  private defaultOptions: MigrationOptions = {
    batch_size: 50,
    dry_run: false,
    preserve_original_data: true,
    auto_classify_confidence_threshold: 0.7,
    validate_tax_calculations: true,
    enable_rollback_snapshots: true,
    continue_on_errors: true,
    classification_methods: ['keyword', 'category', 'ml', 'url'],
  };

  /**
   * Start HSN migration for quotes within date range
   */
  async startMigration(
    dateRange: { start: string; end: string },
    options: Partial<MigrationOptions> = {},
  ): Promise<{
    success: boolean;
    batch_id: string;
    total_quotes: number;
    estimated_duration_minutes: number;
    migration_summary?: MigrationSummary;
    errors?: string[];
  }> {
    try {
      // Check permissions
      await hsnSecurity.checkPermission(HSNPermission.MANAGE_HSN_CODES);

      const finalOptions = { ...this.defaultOptions, ...options };
      const startTime = Date.now();

      console.log('🚀 Starting HSN Data Migration', {
        dateRange,
        options: finalOptions,
      });

      // 1. Get quotes to migrate
      const quotesToMigrate = await this.getQuotesToMigrate(dateRange);

      if (quotesToMigrate.length === 0) {
        return {
          success: true,
          batch_id: '',
          total_quotes: 0,
          estimated_duration_minutes: 0,
        };
      }

      // 2. Create migration batch
      const batchId = this.generateBatchId();
      const migrationBatch: MigrationBatch = {
        batch_id: batchId,
        quote_ids: quotesToMigrate.map((q) => q.id),
        total_quotes: quotesToMigrate.length,
        processed_items: 0,
        classification_results: [],
        migration_status: 'pending',
        created_at: new Date().toISOString(),
        error_count: 0,
        warnings: [],
      };

      this.migrationBatches.set(batchId, migrationBatch);

      // 3. Estimate duration
      const estimatedDuration = Math.ceil((quotesToMigrate.length / finalOptions.batch_size) * 2); // 2 minutes per batch

      // 4. If dry run, analyze only
      if (finalOptions.dry_run) {
        const analysisResult = await this.analyzeMigrationImpact(quotesToMigrate, finalOptions);
        return {
          success: true,
          batch_id: batchId,
          total_quotes: quotesToMigrate.length,
          estimated_duration_minutes: estimatedDuration,
          migration_summary: analysisResult,
        };
      }

      // 5. Start actual migration
      migrationBatch.migration_status = 'processing';
      const migrationResult = await this.executeMigration(quotesToMigrate, finalOptions, batchId);

      const processingTime = Date.now() - startTime;
      this.updateMigrationStats(processingTime, migrationResult.success);

      return {
        success: migrationResult.success,
        batch_id: batchId,
        total_quotes: quotesToMigrate.length,
        estimated_duration_minutes: Math.ceil(processingTime / 60000),
        migration_summary: migrationResult.summary,
        errors: migrationResult.errors,
      };
    } catch (error) {
      const hsnError = HSNErrors.migrationFailed(
        'data_migration',
        { dateRange, options },
        error as Error,
      );
      await hsnErrorHandler.handleError(hsnError);
      throw hsnError;
    }
  }

  /**
   * Get quotes that need HSN migration
   */
  private async getQuotesToMigrate(dateRange: {
    start: string;
    end: string;
  }): Promise<UnifiedQuote[]> {
    const { data: quotes, error } = await supabase
      .from('quotes')
      .select('*')
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end)
      .or(
        'operational_data->>hsn_tax_calculation.is.null,operational_data->>hsn_tax_calculation.eq.false',
      )
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch quotes for migration: ${error.message}`);
    }

    return quotes || [];
  }

  /**
   * Analyze migration impact without making changes
   */
  private async analyzeMigrationImpact(
    quotes: UnifiedQuote[],
    options: MigrationOptions,
  ): Promise<MigrationSummary> {
    let totalItems = 0;
    let successfulClassifications = 0;
    let totalConfidenceScore = 0;
    const taxChanges = { increased: 0, decreased: 0, unchanged: 0, total_difference_usd: 0 };

    for (const quote of quotes) {
      if (!quote.items) continue;

      for (const item of quote.items) {
        totalItems++;

        try {
          // Attempt classification
          const classificationResult = await autoProductClassifier.classifyProduct(
            {
              name: item.name,
              description: item.description,
              category: item.category,
              url: item.url,
            },
            {
              methods: options.classification_methods,
              confidence_threshold: options.auto_classify_confidence_threshold,
            },
          );

          if (
            classificationResult.success &&
            classificationResult.confidence >= options.auto_classify_confidence_threshold
          ) {
            successfulClassifications++;
            totalConfidenceScore += classificationResult.confidence;

            // Simulate tax calculation difference
            const originalTax = this.estimateOriginalTax(item, quote);
            const newTax = this.estimateNewTax(item, classificationResult.hsn_code, quote);

            if (newTax > originalTax) {
              taxChanges.increased++;
            } else if (newTax < originalTax) {
              taxChanges.decreased++;
            } else {
              taxChanges.unchanged++;
            }

            taxChanges.total_difference_usd += newTax - originalTax;
          }
        } catch (error) {
          console.warn('Classification analysis failed for item:', item.id, error);
        }
      }
    }

    return {
      total_quotes_processed: quotes.length,
      total_items_processed: totalItems,
      successful_classifications: successfulClassifications,
      failed_classifications: totalItems - successfulClassifications,
      average_confidence_score:
        successfulClassifications > 0 ? totalConfidenceScore / successfulClassifications : 0,
      tax_calculation_changes: taxChanges,
      processing_time_ms: 0, // Analysis only
      data_integrity_score: 0.95, // Estimated
      rollback_safety_score: options.enable_rollback_snapshots ? 0.99 : 0.85,
    };
  }

  /**
   * Execute the actual migration
   */
  private async executeMigration(
    quotes: UnifiedQuote[],
    options: MigrationOptions,
    batchId: string,
  ): Promise<{
    success: boolean;
    summary: MigrationSummary;
    errors: string[];
  }> {
    const startTime = Date.now();
    const batch = this.migrationBatches.get(batchId)!;
    const errors: string[] = [];
    const classificationResults: ClassificationResult[] = [];

    // Process quotes in batches
    const batches = this.chunkArray(quotes, options.batch_size);

    for (let i = 0; i < batches.length; i++) {
      const quoteBatch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} (${quoteBatch.length} quotes)`);

      try {
        const batchResults = await this.processMigrationBatch(quoteBatch, options, batchId);
        classificationResults.push(...batchResults);

        batch.processed_items += quoteBatch.reduce((sum, q) => sum + (q.items?.length || 0), 0);
        batch.classification_results = classificationResults;
      } catch (error) {
        batch.error_count++;
        const errorMsg = `Batch ${i + 1} failed: ${error}`;
        errors.push(errorMsg);
        batch.warnings.push(errorMsg);

        if (!options.continue_on_errors) {
          throw error;
        }
      }
    }

    // Calculate summary
    const summary = this.calculateMigrationSummary(classificationResults, Date.now() - startTime);

    // Update batch status
    batch.migration_status =
      errors.length > 0 && errors.length === batches.length ? 'failed' : 'completed';
    batch.completed_at = new Date().toISOString();

    return {
      success: batch.migration_status === 'completed',
      summary,
      errors,
    };
  }

  /**
   * Process a single batch of quotes
   */
  private async processMigrationBatch(
    quotes: UnifiedQuote[],
    options: MigrationOptions,
    batchId: string,
  ): Promise<ClassificationResult[]> {
    const results: ClassificationResult[] = [];

    for (const quote of quotes) {
      if (!quote.items) continue;

      // Create rollback snapshot if enabled
      if (options.enable_rollback_snapshots) {
        await this.createRollbackSnapshot(quote);
      }

      for (const item of quote.items) {
        try {
          const result = await this.migrateQuoteItem(quote, item, options);
          results.push(result);
        } catch (error) {
          console.error('Failed to migrate item:', item.id, error);
          results.push({
            quote_id: quote.id,
            item_id: item.id,
            item_name: item.name,
            assigned_hsn_code: 'UNKNOWN',
            classification_confidence: 0,
            classification_method: 'fallback',
            tax_calculation_changed: false,
            new_tax_amount: 0,
            validation_status: 'error',
            validation_messages: [`Migration failed: ${error}`],
          });
        }
      }

      // Update quote with HSN flag
      await this.markQuoteAsHSNMigrated(quote.id);
    }

    return results;
  }

  /**
   * Migrate a single quote item to HSN system
   */
  private async migrateQuoteItem(
    quote: UnifiedQuote,
    item: any,
    options: MigrationOptions,
  ): Promise<ClassificationResult> {
    // 1. Classify product with HSN code
    const classificationResult = await autoProductClassifier.classifyProduct(
      {
        name: item.name,
        description: item.description,
        category: item.category,
        url: item.url,
      },
      {
        methods: options.classification_methods,
        confidence_threshold: options.auto_classify_confidence_threshold,
      },
    );

    let hsnCode = 'UNKNOWN';
    let confidence = 0;
    let method: 'auto' | 'manual' | 'fallback' = 'fallback';

    if (
      classificationResult.success &&
      classificationResult.confidence >= options.auto_classify_confidence_threshold
    ) {
      hsnCode = classificationResult.hsn_code;
      confidence = classificationResult.confidence;
      method = 'auto';
    } else {
      // Use fallback HSN code based on category
      hsnCode = this.getFallbackHSNCode(item.category);
      confidence = 0.3;
      method = 'fallback';
    }

    // 2. Calculate tax amounts
    const originalTax = this.estimateOriginalTax(item, quote);
    const newTax = await this.calculateNewTax(item, hsnCode, quote);

    // 3. Update database
    await this.updateItemWithHSN(quote.id, item.id, hsnCode, method, confidence);

    // 4. Validate result
    const validation = this.validateMigrationResult(item, hsnCode, originalTax, newTax);

    return {
      quote_id: quote.id,
      item_id: item.id,
      item_name: item.name,
      original_category: item.category,
      assigned_hsn_code: hsnCode,
      classification_confidence: confidence,
      classification_method: method,
      tax_calculation_changed: Math.abs(newTax - originalTax) > 0.01,
      original_tax_amount: originalTax,
      new_tax_amount: newTax,
      validation_status: validation.status,
      validation_messages: validation.messages,
    };
  }

  /**
   * Calculate new tax amount using HSN system
   */
  private async calculateNewTax(item: any, hsnCode: string, quote: UnifiedQuote): Promise<number> {
    try {
      const result = await hsnQuoteIntegrationService.calculateItemTax({
        item: { ...item, hsn_code: hsnCode },
        quote,
        options: { use_minimum_valuation: true },
      });

      return result.success ? result.tax_amount : 0;
    } catch (error) {
      console.warn('Failed to calculate new tax for item:', item.id, error);
      return 0;
    }
  }

  /**
   * Estimate original tax amount (before HSN migration)
   */
  private estimateOriginalTax(item: any, quote: UnifiedQuote): number {
    // This is an estimation based on the old system
    const itemValue = item.costprice_origin * item.quantity;
    const customsRate = 0.1; // Typical 10% customs
    const localTaxRate = quote.destination_country === 'IN' ? 0.18 : 0.13; // GST/VAT

    return itemValue * (customsRate + localTaxRate);
  }

  /**
   * Estimate new tax amount for analysis
   */
  private estimateNewTax(item: any, hsnCode: string, quote: UnifiedQuote): number {
    // Simplified estimation for analysis
    const itemValue = item.costprice_origin * item.quantity;

    // Get typical rates for HSN code (simplified)
    const rates = this.getTypicalTaxRates(hsnCode, quote.destination_country);

    return itemValue * (rates.customs + rates.local);
  }

  /**
   * Get typical tax rates for HSN code
   */
  private getTypicalTaxRates(
    hsnCode: string,
    destinationCountry: string,
  ): { customs: number; local: number } {
    // Simplified mapping for analysis
    const rateMapping: Record<string, { customs: number; local: number }> = {
      '8517': { customs: 0.1, local: destinationCountry === 'IN' ? 0.18 : 0.13 }, // Electronics
      '6109': { customs: 0.12, local: destinationCountry === 'IN' ? 0.12 : 0.13 }, // Clothing
      '4901': { customs: 0.05, local: destinationCountry === 'IN' ? 0.05 : 0.13 }, // Books
      UNKNOWN: { customs: 0.1, local: destinationCountry === 'IN' ? 0.18 : 0.13 }, // Default
    };

    return rateMapping[hsnCode] || rateMapping['UNKNOWN'];
  }

  /**
   * Get fallback HSN code based on category
   */
  private getFallbackHSNCode(category?: string): string {
    const categoryMapping: Record<string, string> = {
      electronics: '8517',
      clothing: '6109',
      books: '4901',
      home: '9403',
      sports: '9506',
      beauty: '3304',
    };

    return categoryMapping[category?.toLowerCase() || ''] || '8517'; // Default to electronics
  }

  /**
   * Update item with HSN classification using JSONB structure
   */
  private async updateItemWithHSN(
    quoteId: string,
    itemId: string,
    hsnCode: string,
    method: string,
    confidence: number,
  ): Promise<void> {
    try {
      // Get current quote data
      const quote = await unifiedDataEngine.getQuote(quoteId);
      if (!quote) {
        throw new Error(`Quote ${quoteId} not found`);
      }

      // Find and update the specific item in the JSONB array
      const updatedItems = quote.items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            hsn_code: hsnCode,
            // Enhance smart_data with HSN classification info
            smart_data: {
              ...item.smart_data,
              hsn_classification_method: method,
              hsn_classification_confidence: confidence,
              hsn_migration_date: new Date().toISOString(),
            },
          };
        }
        return item;
      });

      // Check if item was found and updated
      const wasUpdated = updatedItems.some(item => 
        item.id === itemId && item.hsn_code === hsnCode
      );
      
      if (!wasUpdated) {
        throw new Error(`Item ${itemId} not found in quote ${quoteId}`);
      }

      // Update the quote with the new items array using UnifiedDataEngine
      const success = await unifiedDataEngine.updateQuote(quoteId, {
        items: updatedItems,
        // Update operational_data to mark HSN processing
        operational_data: {
          ...quote.operational_data,
          hsn_items_processed: (quote.operational_data?.hsn_items_processed || 0) + 1,
          last_hsn_update: new Date().toISOString(),
        },
      });

      if (!success) {
        throw new Error(`Failed to update quote ${quoteId} with HSN data for item ${itemId}`);
      }

      console.log(`✅ Successfully updated item ${itemId} with HSN code ${hsnCode} (confidence: ${confidence})`);
    } catch (error) {
      console.error(`❌ Error updating item ${itemId} with HSN:`, error);
      throw error;
    }
  }

  /**
   * Mark quote as HSN migrated using UnifiedDataEngine
   */
  private async markQuoteAsHSNMigrated(quoteId: string): Promise<void> {
    try {
      const quote = await unifiedDataEngine.getQuote(quoteId);
      if (!quote) {
        throw new Error(`Quote ${quoteId} not found`);
      }

      // Update operational_data using proper JSONB structure
      const success = await unifiedDataEngine.updateQuote(quoteId, {
        operational_data: {
          ...quote.operational_data,
          hsn_tax_calculation: true,
          hsn_migration_date: new Date().toISOString(),
          calculation_method: 'per_item_hsn',
          hsn_migration_completed: true,
          hsn_items_total: quote.items.length,
          hsn_items_classified: quote.items.filter(item => item.hsn_code).length,
        },
      });

      if (!success) {
        throw new Error(`Failed to mark quote ${quoteId} as HSN migrated`);
      }

      console.log(`✅ Quote ${quoteId} successfully marked as HSN migrated`);
    } catch (error) {
      console.error(`❌ Error marking quote ${quoteId} as HSN migrated:`, error);
      throw error;
    }
  }

  /**
   * Validate migration result
   */
  private validateMigrationResult(
    item: any,
    hsnCode: string,
    originalTax: number,
    newTax: number,
  ): { status: 'valid' | 'warning' | 'error'; messages: string[] } {
    const messages: string[] = [];
    let status: 'valid' | 'warning' | 'error' = 'valid';

    // Check HSN code validity
    if (hsnCode === 'UNKNOWN' || !hsnCode) {
      status = 'error';
      messages.push('No valid HSN code assigned');
    }

    // Check tax calculation changes
    const taxDifference = Math.abs(newTax - originalTax);
    const percentageChange = originalTax > 0 ? (taxDifference / originalTax) * 100 : 0;

    if (percentageChange > 50) {
      status = 'warning';
      messages.push(`Tax calculation changed by ${percentageChange.toFixed(1)}%`);
    }

    if (newTax <= 0 && originalTax > 0) {
      status = 'warning';
      messages.push('New tax calculation resulted in zero tax');
    }

    return { status, messages };
  }

  /**
   * Create rollback snapshot
   */
  private async createRollbackSnapshot(quote: UnifiedQuote): Promise<void> {
    const snapshotKey = `quote_${quote.id}`;

    if (!this.rollbackSnapshots.has(snapshotKey)) {
      this.rollbackSnapshots.set(snapshotKey, {
        quote: { ...quote },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Calculate migration summary
   */
  private calculateMigrationSummary(
    results: ClassificationResult[],
    processingTimeMs: number,
  ): MigrationSummary {
    const successful = results.filter((r) => r.validation_status !== 'error').length;
    const failed = results.filter((r) => r.validation_status === 'error').length;

    const confidenceScores = results
      .filter((r) => r.classification_confidence > 0)
      .map((r) => r.classification_confidence);

    const taxChanges = {
      increased: results.filter((r) => r.new_tax_amount > (r.original_tax_amount || 0)).length,
      decreased: results.filter((r) => r.new_tax_amount < (r.original_tax_amount || 0)).length,
      unchanged: results.filter(
        (r) => Math.abs(r.new_tax_amount - (r.original_tax_amount || 0)) < 0.01,
      ).length,
      total_difference_usd: results.reduce(
        (sum, r) => sum + (r.new_tax_amount - (r.original_tax_amount || 0)),
        0,
      ),
    };

    const quotesProcessed = new Set(results.map((r) => r.quote_id)).size;

    return {
      total_quotes_processed: quotesProcessed,
      total_items_processed: results.length,
      successful_classifications: successful,
      failed_classifications: failed,
      average_confidence_score:
        confidenceScores.length > 0
          ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
          : 0,
      tax_calculation_changes: taxChanges,
      processing_time_ms: processingTimeMs,
      data_integrity_score: successful / results.length,
      rollback_safety_score: 0.95, // Based on rollback snapshots
    };
  }

  /**
   * Rollback migration for a batch
   */
  async rollbackMigration(batchId: string): Promise<{
    success: boolean;
    quotes_rolled_back: number;
    items_rolled_back: number;
    errors: string[];
  }> {
    try {
      await hsnSecurity.checkPermission(HSNPermission.MANAGE_HSN_CODES);

      const batch = this.migrationBatches.get(batchId);
      if (!batch) {
        throw new Error(`Migration batch ${batchId} not found`);
      }

      console.log('🔄 Rolling back HSN migration batch:', batchId);

      let quotesRolledBack = 0;
      let itemsRolledBack = 0;
      const errors: string[] = [];

      for (const quoteId of batch.quote_ids) {
        try {
          const snapshot = this.rollbackSnapshots.get(`quote_${quoteId}`);
          if (snapshot) {
            await this.restoreQuoteFromSnapshot(quoteId, snapshot);
            quotesRolledBack++;

            const quote = snapshot.quote as UnifiedQuote;
            itemsRolledBack += quote.items?.length || 0;
          }
        } catch (error) {
          errors.push(`Failed to rollback quote ${quoteId}: ${error}`);
        }
      }

      // Update batch status
      if (errors.length === 0) {
        batch.migration_status = 'rolled_back';
      }

      return {
        success: errors.length === 0,
        quotes_rolled_back: quotesRolledBack,
        items_rolled_back: itemsRolledBack,
        errors,
      };
    } catch (error) {
      const hsnError = HSNErrors.migrationFailed('rollback', { batchId }, error as Error);
      await hsnErrorHandler.handleError(hsnError);
      throw hsnError;
    }
  }

  /**
   * Restore quote from rollback snapshot using JSONB structure
   */
  private async restoreQuoteFromSnapshot(quoteId: string, snapshot: any): Promise<void> {
    const originalQuote = snapshot.quote as UnifiedQuote;

    try {
      // Restore complete quote using UnifiedDataEngine
      const success = await unifiedDataEngine.updateQuote(quoteId, {
        items: originalQuote.items || [],
        operational_data: originalQuote.operational_data || {},
        calculation_data: originalQuote.calculation_data || {},
        // Restore other critical fields if needed
        base_total_usd: originalQuote.base_total_usd,
        final_total_usd: originalQuote.final_total_usd,
      });

      if (!success) {
        throw new Error(`Failed to restore quote ${quoteId} from snapshot`);
      }

      console.log(`✅ Successfully restored quote ${quoteId} from snapshot (${originalQuote.items?.length || 0} items)`);
    } catch (error) {
      console.error(`❌ Error restoring quote ${quoteId} from snapshot:`, error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  getMigrationStatus(batchId: string): MigrationBatch | null {
    return this.migrationBatches.get(batchId) || null;
  }

  /**
   * Get migration statistics
   */
  getMigrationStats() {
    return { ...this.migrationStats };
  }

  /**
   * Utility methods
   */
  private generateBatchId(): string {
    return `hsn_migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private updateMigrationStats(processingTime: number, success: boolean): void {
    this.migrationStats.totalMigrations++;
    this.migrationStats.totalProcessingTime += processingTime;
    this.migrationStats.averageProcessingTime =
      this.migrationStats.totalProcessingTime / this.migrationStats.totalMigrations;

    if (success) {
      this.migrationStats.successfulMigrations++;
    } else {
      this.migrationStats.failedMigrations++;
    }
  }
}

export const hsnDataMigrationService = new HSNDataMigrationService();
export type { MigrationBatch, ClassificationResult, MigrationSummary, MigrationOptions };
