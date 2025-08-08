/**
 * Currency Repair Script
 * 
 * Fixes corrupted currency data in quotes table
 * Run this script AFTER running the audit script to fix identified issues
 * 
 * IMPORTANT: This script makes permanent changes to the database
 * Make sure to backup your data before running
 */

import { supabase } from '@/integrations/supabase/client';
import { getOriginCurrency, getDestinationCurrency } from '@/utils/originCurrency';
import { auditSpecificQuote, type CurrencyAuditResult } from './currency-audit';

interface RepairResult {
  quoteId: string;
  displayId?: string;
  repaired: boolean;
  changes: {
    field: string;
    from: string;
    to: string;
  }[];
  error?: string;
}

interface RepairSummary {
  totalProcessed: number;
  successfulRepairs: number;
  failedRepairs: number;
  skippedQuotes: number;
  results: RepairResult[];
}

/**
 * Repair all quotes with currency inconsistencies
 */
export async function repairAllCurrencyIssues(dryRun: boolean = true): Promise<RepairSummary> {
  console.log(`🔧 Starting currency repair (${dryRun ? 'DRY RUN' : 'LIVE RUN'})...`);
  
  if (!dryRun) {
    console.warn('⚠️ THIS IS A LIVE RUN - DATABASE WILL BE MODIFIED!');
    // Add a small delay for user to cancel if needed
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  try {
    // First, find all quotes with currency issues
    const { data: problematicQuotes, error } = await supabase
      .from('quotes_v2')
      .select(`
        id,
        display_id,
        customer_currency,
        origin_country,
        destination_country,
        total_quote_origincurrency,
        final_total_origin,
        in_cart,
        status
      `)
      .not('origin_country', 'is', null)
      .not('customer_currency', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to query quotes: ${error.message}`);
    }

    if (!problematicQuotes || problematicQuotes.length === 0) {
      console.log('✅ No quotes found to repair');
      return {
        totalProcessed: 0,
        successfulRepairs: 0,
        failedRepairs: 0,
        skippedQuotes: 0,
        results: []
      };
    }

    console.log(`📊 Analyzing ${problematicQuotes.length} quotes for currency issues...`);

    const results: RepairResult[] = [];
    let successfulRepairs = 0;
    let failedRepairs = 0;
    let skippedQuotes = 0;

    for (let i = 0; i < problematicQuotes.length; i++) {
      const quote = problematicQuotes[i];
      
      console.log(`🔍 Processing ${i + 1}/${problematicQuotes.length}: ${quote.display_id || quote.id}`);

      try {
        const repairResult = await repairQuoteCurrency(quote.id, dryRun);
        
        if (repairResult.repaired) {
          successfulRepairs++;
        } else if (repairResult.error) {
          failedRepairs++;
        } else {
          skippedQuotes++;
        }

        results.push(repairResult);

      } catch (error) {
        console.error(`❌ Failed to repair quote ${quote.id}:`, error);
        failedRepairs++;
        results.push({
          quoteId: quote.id,
          displayId: quote.display_id,
          repaired: false,
          changes: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const summary: RepairSummary = {
      totalProcessed: problematicQuotes.length,
      successfulRepairs,
      failedRepairs,
      skippedQuotes,
      results
    };

    // Log summary
    console.log('\n🎯 CURRENCY REPAIR SUMMARY');
    console.log('==========================');
    console.log(`Mode: ${dryRun ? 'DRY RUN (no changes made)' : 'LIVE RUN (changes applied)'}`);
    console.log(`Total processed: ${summary.totalProcessed}`);
    console.log(`✅ Successful repairs: ${summary.successfulRepairs}`);
    console.log(`❌ Failed repairs: ${summary.failedRepairs}`);
    console.log(`⏭️ Skipped (no issues): ${summary.skippedQuotes}`);

    if (summary.successfulRepairs > 0) {
      console.log('\n🔧 SUCCESSFUL REPAIRS:');
      results.filter(r => r.repaired).forEach(result => {
        console.log(`\n📋 Quote: ${result.displayId || result.quoteId}`);
        result.changes.forEach(change => {
          console.log(`   ${change.field}: ${change.from} → ${change.to}`);
        });
      });
    }

    if (summary.failedRepairs > 0) {
      console.log('\n❌ FAILED REPAIRS:');
      results.filter(r => r.error).forEach(result => {
        console.log(`📋 Quote: ${result.displayId || result.quoteId} - ${result.error}`);
      });
    }

    return summary;

  } catch (error) {
    console.error('💥 Currency repair failed:', error);
    throw error;
  }
}

/**
 * Repair currency issues for a specific quote
 */
export async function repairQuoteCurrency(quoteId: string, dryRun: boolean = true): Promise<RepairResult> {
  try {
    // First, get the quote data
    const { data: quote, error } = await supabase
      .from('quotes_v2')
      .select(`
        id,
        display_id,
        customer_currency,
        origin_country,
        destination_country,
        total_quote_origincurrency,
        final_total_origin
      `)
      .eq('id', quoteId)
      .single();

    if (error || !quote) {
      return {
        quoteId,
        repaired: false,
        changes: [],
        error: 'Quote not found'
      };
    }

    const changes: { field: string; from: string; to: string }[] = [];
    const updates: Record<string, any> = {};

    // Determine correct currency based on origin country
    const expectedOriginCurrency = quote.origin_country ? getOriginCurrency(quote.origin_country) : null;

    // Check if customer_currency needs fixing
    if (quote.customer_currency && expectedOriginCurrency && 
        quote.customer_currency !== expectedOriginCurrency) {
      
      // Special case: USD currency with non-US origin country (major data corruption)
      if (quote.customer_currency === 'USD' && 
          !['US', 'AS', 'GU', 'MP', 'PR', 'UM', 'VI'].includes(quote.origin_country)) {
        
        console.log(`🚨 Critical issue: Quote ${quote.display_id || quoteId} has USD currency with ${quote.origin_country} origin`);
        
        changes.push({
          field: 'customer_currency',
          from: quote.customer_currency,
          to: expectedOriginCurrency
        });
        
        updates.customer_currency = expectedOriginCurrency;
      }
      // Other currency mismatches
      else if (quote.origin_country && expectedOriginCurrency) {
        changes.push({
          field: 'customer_currency',
          from: quote.customer_currency,
          to: expectedOriginCurrency
        });
        
        updates.customer_currency = expectedOriginCurrency;
      }
    }

    // If no changes needed, skip
    if (changes.length === 0) {
      return {
        quoteId,
        displayId: quote.display_id,
        repaired: false,
        changes: []
      };
    }

    // Apply changes (if not dry run)
    if (!dryRun && Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('quotes_v2')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      if (updateError) {
        return {
          quoteId,
          displayId: quote.display_id,
          repaired: false,
          changes: [],
          error: `Update failed: ${updateError.message}`
        };
      }

      console.log(`✅ Repaired quote ${quote.display_id || quoteId}`);
    } else if (dryRun) {
      console.log(`🔍 [DRY RUN] Would repair quote ${quote.display_id || quoteId}`);
    }

    return {
      quoteId,
      displayId: quote.display_id,
      repaired: !dryRun,
      changes
    };

  } catch (error) {
    return {
      quoteId,
      repaired: false,
      changes: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Emergency repair for cart items (highest priority)
 */
export async function repairCartItemCurrencies(dryRun: boolean = true): Promise<RepairSummary> {
  console.log(`🚨 Emergency repair for cart items (${dryRun ? 'DRY RUN' : 'LIVE RUN'})...`);

  try {
    // Find all quotes currently in cart
    const { data: cartQuotes, error } = await supabase
      .from('quotes_v2')
      .select(`
        id,
        display_id,
        customer_currency,
        origin_country,
        destination_country,
        total_quote_origincurrency,
        final_total_origin
      `)
      .eq('in_cart', true);

    if (error) {
      throw new Error(`Failed to query cart quotes: ${error.message}`);
    }

    if (!cartQuotes || cartQuotes.length === 0) {
      console.log('✅ No items in cart to repair');
      return {
        totalProcessed: 0,
        successfulRepairs: 0,
        failedRepairs: 0,
        skippedQuotes: 0,
        results: []
      };
    }

    console.log(`🛒 Found ${cartQuotes.length} items in cart to check...`);

    const results: RepairResult[] = [];
    let successfulRepairs = 0;
    let failedRepairs = 0;
    let skippedQuotes = 0;

    for (const quote of cartQuotes) {
      try {
        const repairResult = await repairQuoteCurrency(quote.id, dryRun);
        
        if (repairResult.repaired) {
          successfulRepairs++;
          console.log(`🔧 Repaired cart item: ${quote.display_id || quote.id}`);
        } else if (repairResult.error) {
          failedRepairs++;
        } else {
          skippedQuotes++;
        }

        results.push(repairResult);

      } catch (error) {
        console.error(`❌ Failed to repair cart item ${quote.id}:`, error);
        failedRepairs++;
        results.push({
          quoteId: quote.id,
          displayId: quote.display_id,
          repaired: false,
          changes: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`🛒 Cart repair complete: ${successfulRepairs} repaired, ${failedRepairs} failed, ${skippedQuotes} skipped`);

    return {
      totalProcessed: cartQuotes.length,
      successfulRepairs,
      failedRepairs,
      skippedQuotes,
      results
    };

  } catch (error) {
    console.error('💥 Cart currency repair failed:', error);
    throw error;
  }
}

// Make available globally for browser console
if (typeof window !== 'undefined') {
  (window as any).currencyRepair = {
    repairAll: repairAllCurrencyIssues,
    repairQuote: repairQuoteCurrency,
    repairCartItems: repairCartItemCurrencies
  };
  console.log('Currency repair utilities available at window.currencyRepair');
}

export default { 
  repairAllCurrencyIssues, 
  repairQuoteCurrency, 
  repairCartItemCurrencies 
};