/**
 * Currency Audit Script
 * 
 * Identifies quotes with currency inconsistencies and data corruption
 * Run this script to audit your database for currency-related issues
 */

import { supabase } from '@/integrations/supabase/client';
import { currencyService } from '@/services/CurrencyService';
import { getOriginCurrency, getDestinationCurrency } from '@/utils/originCurrency';

interface CurrencyAuditResult {
  quoteId: string;
  displayId?: string;
  issues: string[];
  current: {
    customerCurrency: string;
    originCountry: string;
    destinationCountry: string;
    totalOriginCurrency: number;
    finalTotalOrigin: number;
  };
  expected: {
    originCurrency: string;
    destinationCurrency: string;
  };
  severity: 'critical' | 'warning' | 'minor';
}

export async function auditCurrencyConsistency(): Promise<{
  summary: {
    totalQuotes: number;
    issuesFound: number;
    criticalIssues: number;
    warningIssues: number;
    minorIssues: number;
  };
  issues: CurrencyAuditResult[];
}> {
  console.log('🔍 Starting currency audit...');

  try {
    // Fetch all quotes with relevant currency data
    const { data: quotes, error } = await supabase
      .from('quotes_v2')
      .select(`
        id,
        display_id,
        customer_currency,
        origin_country,
        destination_country,
        total_quote_origincurrency,
        final_total_origin,
        status,
        created_at,
        in_cart
      `)
      .order('created_at', { ascending: false })
      .limit(1000); // Audit last 1000 quotes

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    if (!quotes || quotes.length === 0) {
      console.log('📄 No quotes found to audit');
      return {
        summary: { totalQuotes: 0, issuesFound: 0, criticalIssues: 0, warningIssues: 0, minorIssues: 0 },
        issues: []
      };
    }

    console.log(`📊 Auditing ${quotes.length} quotes...`);

    const issues: CurrencyAuditResult[] = [];

    for (let i = 0; i < quotes.length; i++) {
      const quote = quotes[i];
      const quoteIssues: string[] = [];
      
      console.log(`🔍 Auditing quote ${i + 1}/${quotes.length}: ${quote.display_id || quote.id}`);

      // Expected currencies based on countries
      const expectedOriginCurrency = quote.origin_country ? getOriginCurrency(quote.origin_country) : null;
      const expectedDestinationCurrency = quote.destination_country ? getDestinationCurrency(quote.destination_country) : null;

      // Check for missing required data
      if (!quote.customer_currency) {
        quoteIssues.push('Missing customer_currency field');
      }

      if (!quote.origin_country) {
        quoteIssues.push('Missing origin_country field');
      }

      if (!quote.destination_country) {
        quoteIssues.push('Missing destination_country field');
      }

      // Check currency consistency with origin country
      if (quote.customer_currency && quote.origin_country && expectedOriginCurrency) {
        if (quote.customer_currency !== expectedOriginCurrency) {
          quoteIssues.push(`customer_currency (${quote.customer_currency}) doesn't match origin country ${quote.origin_country} (expected: ${expectedOriginCurrency})`);
        }
      }

      // Check for missing price data
      if (!quote.total_quote_origincurrency && !quote.final_total_origin) {
        quoteIssues.push('Missing both total_quote_origincurrency and final_total_origin');
      }

      // Check for suspicious price values (very high or very low)
      const priceValue = quote.total_quote_origincurrency || quote.final_total_origin || 0;
      if (priceValue > 1000000) {
        quoteIssues.push(`Suspiciously high price: ${priceValue} ${quote.customer_currency}`);
      }
      if (priceValue > 0 && priceValue < 1) {
        quoteIssues.push(`Suspiciously low price: ${priceValue} ${quote.customer_currency}`);
      }

      // Check for USD currency in non-USD origin countries (major red flag)
      if (quote.customer_currency === 'USD' && quote.origin_country && 
          !['US', 'AS', 'GU', 'MP', 'PR', 'UM', 'VI'].includes(quote.origin_country)) {
        quoteIssues.push(`USD currency with non-US origin country ${quote.origin_country} - likely data corruption`);
      }

      // Check for cart items with issues (these cause immediate problems)
      if (quote.in_cart && quoteIssues.length > 0) {
        quoteIssues.push('❗ URGENT: Quote is in cart with currency issues');
      }

      // If issues found, add to results
      if (quoteIssues.length > 0) {
        // Determine severity
        let severity: 'critical' | 'warning' | 'minor' = 'minor';
        
        if (quote.in_cart || 
            (quote.customer_currency === 'USD' && quote.origin_country && quote.origin_country !== 'US')) {
          severity = 'critical';
        } else if (quote.customer_currency && expectedOriginCurrency && 
                  quote.customer_currency !== expectedOriginCurrency) {
          severity = 'warning';
        }

        issues.push({
          quoteId: quote.id,
          displayId: quote.display_id,
          issues: quoteIssues,
          current: {
            customerCurrency: quote.customer_currency || 'null',
            originCountry: quote.origin_country || 'null',
            destinationCountry: quote.destination_country || 'null',
            totalOriginCurrency: quote.total_quote_origincurrency || 0,
            finalTotalOrigin: quote.final_total_origin || 0
          },
          expected: {
            originCurrency: expectedOriginCurrency || 'unknown',
            destinationCurrency: expectedDestinationCurrency || 'unknown'
          },
          severity
        });
      }
    }

    // Generate summary
    const summary = {
      totalQuotes: quotes.length,
      issuesFound: issues.length,
      criticalIssues: issues.filter(i => i.severity === 'critical').length,
      warningIssues: issues.filter(i => i.severity === 'warning').length,
      minorIssues: issues.filter(i => i.severity === 'minor').length
    };

    // Log results
    console.log('\n🎯 CURRENCY AUDIT RESULTS');
    console.log('==========================');
    console.log(`Total quotes audited: ${summary.totalQuotes}`);
    console.log(`Issues found: ${summary.issuesFound}`);
    console.log(`  📛 Critical: ${summary.criticalIssues}`);
    console.log(`  ⚠️ Warning: ${summary.warningIssues}`);
    console.log(`  ℹ️ Minor: ${summary.minorIssues}`);

    if (summary.criticalIssues > 0) {
      console.log('\n🚨 CRITICAL ISSUES (requires immediate attention):');
      issues.filter(i => i.severity === 'critical').forEach(issue => {
        console.log(`\n📋 Quote: ${issue.displayId || issue.quoteId}`);
        issue.issues.forEach(i => console.log(`   • ${i}`));
        console.log(`   Current: ${issue.current.customerCurrency} (${issue.current.originCountry} → ${issue.current.destinationCountry})`);
        console.log(`   Expected: ${issue.expected.originCurrency}`);
      });
    }

    return { summary, issues };

  } catch (error) {
    console.error('❌ Currency audit failed:', error);
    throw error;
  }
}

/**
 * Quick audit for specific quote ID
 */
export async function auditSpecificQuote(quoteId: string): Promise<CurrencyAuditResult | null> {
  console.log(`🔍 Auditing specific quote: ${quoteId}`);

  const { data: quote, error } = await supabase
    .from('quotes_v2')
    .select(`
      id,
      display_id,
      customer_currency,
      origin_country,
      destination_country,
      total_quote_origincurrency,
      final_total_origin,
      status,
      in_cart
    `)
    .eq('id', quoteId)
    .single();

  if (error || !quote) {
    console.log('❌ Quote not found');
    return null;
  }

  const issues: string[] = [];
  const expectedOriginCurrency = quote.origin_country ? getOriginCurrency(quote.origin_country) : null;
  const expectedDestinationCurrency = quote.destination_country ? getDestinationCurrency(quote.destination_country) : null;

  // Same validation logic as above
  if (quote.customer_currency && expectedOriginCurrency && 
      quote.customer_currency !== expectedOriginCurrency) {
    issues.push(`customer_currency (${quote.customer_currency}) doesn't match origin country ${quote.origin_country} (expected: ${expectedOriginCurrency})`);
  }

  if (quote.customer_currency === 'USD' && quote.origin_country && 
      !['US', 'AS', 'GU', 'MP', 'PR', 'UM', 'VI'].includes(quote.origin_country)) {
    issues.push(`USD currency with non-US origin country ${quote.origin_country} - likely data corruption`);
  }

  if (quote.in_cart && issues.length > 0) {
    issues.push('❗ URGENT: Quote is in cart with currency issues');
  }

  if (issues.length === 0) {
    console.log('✅ No currency issues found for this quote');
    return null;
  }

  const result: CurrencyAuditResult = {
    quoteId: quote.id,
    displayId: quote.display_id,
    issues,
    current: {
      customerCurrency: quote.customer_currency || 'null',
      originCountry: quote.origin_country || 'null',
      destinationCountry: quote.destination_country || 'null',
      totalOriginCurrency: quote.total_quote_origincurrency || 0,
      finalTotalOrigin: quote.final_total_origin || 0
    },
    expected: {
      originCurrency: expectedOriginCurrency || 'unknown',
      destinationCurrency: expectedDestinationCurrency || 'unknown'
    },
    severity: quote.in_cart || 
             (quote.customer_currency === 'USD' && quote.origin_country !== 'US') ? 'critical' : 'warning'
  };

  console.log('🎯 Issues found:');
  result.issues.forEach(issue => console.log(`  • ${issue}`));

  return result;
}

// Make available globally for browser console
if (typeof window !== 'undefined') {
  (window as any).currencyAudit = {
    auditAll: auditCurrencyConsistency,
    auditQuote: auditSpecificQuote
  };
  console.log('Currency audit utilities available at window.currencyAudit');
}

export default { auditCurrencyConsistency, auditSpecificQuote };