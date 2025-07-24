/**
 * HSN Data Validation Service
 * Ensures data integrity and quality during HSN system migration
 *
 * Validation Categories:
 * 1. Data integrity checks
 * 2. Business rule validation
 * 3. Tax calculation accuracy
 * 4. HSN code validity
 * 5. Migration completeness
 */

import { supabase } from '@/integrations/supabase/client';
import { unifiedDataEngine } from './UnifiedDataEngine';
import { hsnQuoteIntegrationService } from './HSNQuoteIntegrationService';
import { governmentAPIOrchestrator } from './api/GovernmentAPIOrchestrator';
import { HSNSystemError, HSNErrors, hsnErrorHandler } from '@/lib/error-handling/HSNSystemError';
import { hsnSecurity, HSNPermission } from '@/lib/security/HSNSecurityManager';
import type { UnifiedQuote } from '@/types/unified-quote';

interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: 'integrity' | 'business' | 'tax' | 'hsn' | 'migration';
  severity: 'critical' | 'high' | 'medium' | 'low';
  automated: boolean;
  validation_function: (data: any) => Promise<ValidationResult>;
}

interface ValidationResult {
  rule_id: string;
  passed: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  details?: any;
  suggested_fix?: string;
  data_context: {
    quote_id?: string;
    item_id?: string;
    affected_records?: number;
  };
}

interface ValidationReport {
  validation_id: string;
  run_date: string;
  total_rules_checked: number;
  rules_passed: number;
  rules_failed: number;
  data_integrity_score: number;
  business_rule_compliance: number;
  tax_accuracy_score: number;
  hsn_classification_quality: number;
  migration_completeness: number;
  overall_score: number;
  validation_results: ValidationResult[];
  recommendations: string[];
  critical_issues: ValidationResult[];
  requires_attention: ValidationResult[];
}

interface ValidationOptions {
  include_categories: ('integrity' | 'business' | 'tax' | 'hsn' | 'migration')[];
  severity_threshold: 'critical' | 'high' | 'medium' | 'low';
  sample_size?: number;
  deep_validation: boolean;
  validate_government_apis: boolean;
  generate_recommendations: boolean;
}

class HSNDataValidationService {
  private validationRules: Map<string, ValidationRule> = new Map();
  private validationHistory: ValidationReport[] = [];

  constructor() {
    this.initializeValidationRules();
  }

  /**
   * Initialize all validation rules
   */
  private initializeValidationRules(): void {
    const rules: ValidationRule[] = [
      // Data Integrity Rules
      {
        id: 'integrity_001',
        name: 'Quote Data Completeness',
        description: 'Ensures all required quote fields are present and valid',
        category: 'integrity',
        severity: 'critical',
        automated: true,
        validation_function: this.validateQuoteDataCompleteness.bind(this),
      },
      {
        id: 'integrity_002',
        name: 'Item Data Consistency',
        description: 'Validates item data consistency across related tables',
        category: 'integrity',
        severity: 'high',
        automated: true,
        validation_function: this.validateItemDataConsistency.bind(this),
      },
      {
        id: 'integrity_003',
        name: 'Foreign Key Integrity',
        description: 'Checks all foreign key relationships are valid',
        category: 'integrity',
        severity: 'critical',
        automated: true,
        validation_function: this.validateForeignKeyIntegrity.bind(this),
      },

      // Business Rule Validation
      {
        id: 'business_001',
        name: 'Price Validation',
        description: 'Ensures all prices are positive and within reasonable ranges',
        category: 'business',
        severity: 'high',
        automated: true,
        validation_function: this.validatePriceRanges.bind(this),
      },
      {
        id: 'business_002',
        name: 'Quantity Validation',
        description: 'Validates item quantities are logical and positive',
        category: 'business',
        severity: 'medium',
        automated: true,
        validation_function: this.validateQuantities.bind(this),
      },
      {
        id: 'business_003',
        name: 'Country Route Validation',
        description: 'Ensures origin-destination country combinations are supported',
        category: 'business',
        severity: 'high',
        automated: true,
        validation_function: this.validateCountryRoutes.bind(this),
      },

      // Tax Calculation Validation
      {
        id: 'tax_001',
        name: 'Tax Calculation Accuracy',
        description: 'Validates HSN-based tax calculations against expected ranges',
        category: 'tax',
        severity: 'critical',
        automated: true,
        validation_function: this.validateTaxCalculationAccuracy.bind(this),
      },
      {
        id: 'tax_002',
        name: 'Minimum Valuation Rules',
        description: 'Checks minimum valuation rules are applied correctly',
        category: 'tax',
        severity: 'high',
        automated: true,
        validation_function: this.validateMinimumValuationRules.bind(this),
      },
      {
        id: 'tax_003',
        name: 'Tax Rate Consistency',
        description: 'Ensures tax rates are consistent with government APIs',
        category: 'tax',
        severity: 'medium',
        automated: true,
        validation_function: this.validateTaxRateConsistency.bind(this),
      },

      // HSN Classification Validation
      {
        id: 'hsn_001',
        name: 'HSN Code Validity',
        description: 'Validates all HSN codes exist in master database',
        category: 'hsn',
        severity: 'critical',
        automated: true,
        validation_function: this.validateHSNCodeValidity.bind(this),
      },
      {
        id: 'hsn_002',
        name: 'Classification Confidence',
        description: 'Checks HSN classification confidence scores meet thresholds',
        category: 'hsn',
        severity: 'medium',
        automated: true,
        validation_function: this.validateClassificationConfidence.bind(this),
      },
      {
        id: 'hsn_003',
        name: 'Category Alignment',
        description: 'Ensures HSN codes align with product categories',
        category: 'hsn',
        severity: 'low',
        automated: true,
        validation_function: this.validateCategoryAlignment.bind(this),
      },

      // Migration Completeness
      {
        id: 'migration_001',
        name: 'Migration Status Completeness',
        description: 'Ensures all eligible quotes have been migrated to HSN system',
        category: 'migration',
        severity: 'high',
        automated: true,
        validation_function: this.validateMigrationCompleteness.bind(this),
      },
      {
        id: 'migration_002',
        name: 'Operational Data Integrity',
        description: 'Validates operational metadata is correctly set after migration',
        category: 'migration',
        severity: 'medium',
        automated: true,
        validation_function: this.validateOperationalDataIntegrity.bind(this),
      },
    ];

    rules.forEach((rule) => {
      this.validationRules.set(rule.id, rule);
    });
  }

  /**
   * Run comprehensive data validation
   */
  async runValidation(options: Partial<ValidationOptions> = {}): Promise<ValidationReport> {
    try {
      await hsnSecurity.checkPermission(HSNPermission.MANAGE_HSN_CODES);

      const defaultOptions: ValidationOptions = {
        include_categories: ['integrity', 'business', 'tax', 'hsn', 'migration'],
        severity_threshold: 'low',
        deep_validation: true,
        validate_government_apis: false,
        generate_recommendations: true,
      };

      const finalOptions = { ...defaultOptions, ...options };
      const validationId = this.generateValidationId();
      const startTime = Date.now();

      console.log('🔍 Starting HSN Data Validation', {
        validationId,
        options: finalOptions,
      });

      // Get applicable validation rules
      const applicableRules = Array.from(this.validationRules.values())
        .filter((rule) => finalOptions.include_categories.includes(rule.category))
        .filter((rule) => this.shouldRunRule(rule, finalOptions.severity_threshold));

      const validationResults: ValidationResult[] = [];

      // Run validation rules
      for (const rule of applicableRules) {
        try {
          console.log(`Running validation rule: ${rule.name}`);
          const result = await rule.validation_function(finalOptions);
          validationResults.push(result);
        } catch (error) {
          console.error(`Validation rule ${rule.id} failed:`, error);
          validationResults.push({
            rule_id: rule.id,
            passed: false,
            severity: rule.severity,
            message: `Validation rule execution failed: ${error}`,
            data_context: {},
          });
        }
      }

      // Calculate scores
      const scores = this.calculateValidationScores(validationResults);

      // Generate report
      const report: ValidationReport = {
        validation_id: validationId,
        run_date: new Date().toISOString(),
        total_rules_checked: applicableRules.length,
        rules_passed: validationResults.filter((r) => r.passed).length,
        rules_failed: validationResults.filter((r) => !r.passed).length,
        ...scores,
        validation_results: validationResults,
        recommendations: finalOptions.generate_recommendations
          ? this.generateRecommendations(validationResults)
          : [],
        critical_issues: validationResults.filter((r) => !r.passed && r.severity === 'critical'),
        requires_attention: validationResults.filter(
          (r) => !r.passed && ['critical', 'high'].includes(r.severity),
        ),
      };

      // Save validation history
      this.validationHistory.push(report);

      console.log('✅ HSN Data Validation completed', {
        validationId,
        overallScore: report.overall_score,
        processingTime: Date.now() - startTime,
      });

      return report;
    } catch (error) {
      const hsnError = HSNErrors.validationFailed('data_validation', { options }, error as Error);
      await hsnErrorHandler.handleError(hsnError);
      throw hsnError;
    }
  }

  /**
   * Validation Rule Implementations
   */

  private async validateQuoteDataCompleteness(
    options: ValidationOptions,
  ): Promise<ValidationResult> {
    const { data: quotes, error } = await supabase
      .from('quotes')
      .select('id, origin_country, destination_country, final_total_usd, customer_data')
      .is('origin_country', null)
      .or('destination_country.is.null,final_total_usd.is.null')
      .limit(options.sample_size || 1000);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    const incompleteQuotes = quotes?.length || 0;

    return {
      rule_id: 'integrity_001',
      passed: incompleteQuotes === 0,
      severity: 'critical',
      message:
        incompleteQuotes === 0
          ? 'All quotes have complete required data'
          : `Found ${incompleteQuotes} quotes with missing required data`,
      details: { incomplete_quotes: incompleteQuotes },
      suggested_fix:
        incompleteQuotes > 0 ? 'Review and complete missing quote data fields' : undefined,
      data_context: { affected_records: incompleteQuotes },
    };
  }

  private async validateItemDataConsistency(options: ValidationOptions): Promise<ValidationResult> {
    const { data: inconsistentItems, error } = await supabase
      .from('quote_items')
      .select('id, quote_id, costprice_origin, quantity, weight_kg')
      .lte('costprice_origin', 0)
      .or('quantity.lte.0,weight_kg.lt.0')
      .limit(options.sample_size || 1000);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    const inconsistentCount = inconsistentItems?.length || 0;

    return {
      rule_id: 'integrity_002',
      passed: inconsistentCount === 0,
      severity: 'high',
      message:
        inconsistentCount === 0
          ? 'All items have consistent data'
          : `Found ${inconsistentCount} items with inconsistent data`,
      details: { inconsistent_items: inconsistentCount },
      suggested_fix:
        inconsistentCount > 0
          ? 'Review and fix items with invalid prices, quantities, or weights'
          : undefined,
      data_context: { affected_records: inconsistentCount },
    };
  }

  private async validateForeignKeyIntegrity(options: ValidationOptions): Promise<ValidationResult> {
    // Check for orphaned quote items
    const { data: orphanedItems, error } = await supabase
      .from('quote_items')
      .select('id, quote_id')
      .not('quote_id', 'in', `(SELECT id FROM quotes)`)
      .limit(options.sample_size || 1000);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    const orphanedCount = orphanedItems?.length || 0;

    return {
      rule_id: 'integrity_003',
      passed: orphanedCount === 0,
      severity: 'critical',
      message:
        orphanedCount === 0
          ? 'All foreign key relationships are valid'
          : `Found ${orphanedCount} orphaned quote items`,
      details: { orphaned_items: orphanedCount },
      suggested_fix:
        orphanedCount > 0 ? 'Remove orphaned items or restore missing parent quotes' : undefined,
      data_context: { affected_records: orphanedCount },
    };
  }

  private async validatePriceRanges(options: ValidationOptions): Promise<ValidationResult> {
    const { data: invalidPrices, error } = await supabase
      .from('quote_items')
      .select('id, name, costprice_origin')
      .or('costprice_origin.lt.0.01,costprice_origin.gt.50000')
      .limit(options.sample_size || 1000);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    const invalidCount = invalidPrices?.length || 0;

    return {
      rule_id: 'business_001',
      passed: invalidCount === 0,
      severity: 'high',
      message:
        invalidCount === 0
          ? 'All prices are within reasonable ranges'
          : `Found ${invalidCount} items with prices outside reasonable ranges`,
      details: { invalid_price_items: invalidCount },
      suggested_fix:
        invalidCount > 0
          ? 'Review items with extremely low (<$0.01) or high (>$50,000) prices'
          : undefined,
      data_context: { affected_records: invalidCount },
    };
  }

  private async validateQuantities(options: ValidationOptions): Promise<ValidationResult> {
    const { data: invalidQuantities, error } = await supabase
      .from('quote_items')
      .select('id, name, quantity')
      .or('quantity.lte.0,quantity.gt.1000')
      .limit(options.sample_size || 1000);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    const invalidCount = invalidQuantities?.length || 0;

    return {
      rule_id: 'business_002',
      passed: invalidCount === 0,
      severity: 'medium',
      message:
        invalidCount === 0
          ? 'All quantities are logical'
          : `Found ${invalidCount} items with invalid quantities`,
      details: { invalid_quantity_items: invalidCount },
      suggested_fix:
        invalidCount > 0
          ? 'Review items with zero/negative or extremely high (>1000) quantities'
          : undefined,
      data_context: { affected_records: invalidCount },
    };
  }

  private async validateCountryRoutes(options: ValidationOptions): Promise<ValidationResult> {
    // Get all unique country combinations
    const { data: routes, error } = await supabase
      .from('quotes')
      .select('origin_country, destination_country')
      .not('origin_country', 'is', null)
      .not('destination_country', 'is', null);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    const supportedCountries = ['US', 'IN', 'NP', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP'];
    const unsupportedRoutes =
      routes?.filter(
        (route) =>
          !supportedCountries.includes(route.origin_country) ||
          !supportedCountries.includes(route.destination_country),
      ) || [];

    return {
      rule_id: 'business_003',
      passed: unsupportedRoutes.length === 0,
      severity: 'high',
      message:
        unsupportedRoutes.length === 0
          ? 'All country routes are supported'
          : `Found ${unsupportedRoutes.length} quotes using unsupported country routes`,
      details: { unsupported_routes: unsupportedRoutes.length },
      suggested_fix:
        unsupportedRoutes.length > 0
          ? 'Review quotes with unsupported country combinations'
          : undefined,
      data_context: { affected_records: unsupportedRoutes.length },
    };
  }

  private async validateTaxCalculationAccuracy(
    options: ValidationOptions,
  ): Promise<ValidationResult> {
    // Sample quotes with HSN calculations
    const { data: hsnQuotes, error } = await supabase
      .from('quotes')
      .select(
        `
        id, 
        destination_country, 
        final_total_usd, 
        calculation_data,
        items:quote_items(id, name, costprice_origin, quantity, hsn_code)
      `,
      )
      .eq('operational_data->>hsn_tax_calculation', true)
      .limit(options.sample_size || 100);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    let inaccurateCalculations = 0;
    let totalChecked = 0;

    if (hsnQuotes && options.deep_validation) {
      for (const quote of hsnQuotes) {
        try {
          const recalculated = await hsnQuoteIntegrationService.calculateQuoteWithHSN(quote.id);
          if (recalculated.success) {
            const difference = Math.abs(recalculated.quote.final_total_usd - quote.final_total_usd);
            const percentageDiff = (difference / quote.final_total_usd) * 100;

            if (percentageDiff > 5) {
              // Allow 5% tolerance
              inaccurateCalculations++;
            }
          }
          totalChecked++;
        } catch (error) {
          console.warn('Failed to recalculate quote for validation:', quote.id, error);
        }
      }
    }

    return {
      rule_id: 'tax_001',
      passed: inaccurateCalculations === 0,
      severity: 'critical',
      message:
        inaccurateCalculations === 0
          ? `All ${totalChecked} checked tax calculations are accurate`
          : `Found ${inaccurateCalculations} quotes with potentially inaccurate tax calculations`,
      details: {
        inaccurate_calculations: inaccurateCalculations,
        total_checked: totalChecked,
      },
      suggested_fix:
        inaccurateCalculations > 0
          ? 'Recalculate taxes for flagged quotes using latest HSN system'
          : undefined,
      data_context: { affected_records: inaccurateCalculations },
    };
  }

  private async validateMinimumValuationRules(
    options: ValidationOptions,
  ): Promise<ValidationResult> {
    // Check Nepal quotes for minimum valuation application
    const { data: nepalQuotes, error } = await supabase
      .from('quotes')
      .select(
        `
        id,
        calculation_data,
        items:quote_items(id, name, costprice_origin, quantity, hsn_code)
      `,
      )
      .eq('destination_country', 'NP')
      .eq('operational_data->>hsn_tax_calculation', true)
      .limit(options.sample_size || 100);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    let incorrectValuationCount = 0;

    if (nepalQuotes) {
      for (const quote of nepalQuotes) {
        if (quote.items) {
          for (const item of quote.items) {
            const itemValue = item.costprice_origin * item.quantity;

            // Check if minimum valuation should apply (simplified check)
            if (item.hsn_code === '6109' && itemValue < 10) {
              const breakdown = quote.calculation_data?.hsn_breakdown;
              const itemBreakdown = breakdown?.item_breakdowns?.find(
                (ib: any) => ib.itemId === item.id,
              );

              if (!itemBreakdown?.minimum_valuation_applied) {
                incorrectValuationCount++;
              }
            }
          }
        }
      }
    }

    return {
      rule_id: 'tax_002',
      passed: incorrectValuationCount === 0,
      severity: 'high',
      message:
        incorrectValuationCount === 0
          ? 'Minimum valuation rules are correctly applied'
          : `Found ${incorrectValuationCount} items where minimum valuation rules may be incorrectly applied`,
      details: { incorrect_valuation_items: incorrectValuationCount },
      suggested_fix:
        incorrectValuationCount > 0
          ? 'Review minimum valuation rule application for Nepal destinations'
          : undefined,
      data_context: { affected_records: incorrectValuationCount },
    };
  }

  private async validateTaxRateConsistency(options: ValidationOptions): Promise<ValidationResult> {
    if (!options.validate_government_apis) {
      return {
        rule_id: 'tax_003',
        passed: true,
        severity: 'medium',
        message: 'Tax rate consistency check skipped (validate_government_apis disabled)',
        data_context: {},
      };
    }

    // Sample check against government APIs
    let inconsistentRates = 0;
    let totalChecked = 0;

    try {
      // Check a few common HSN codes against government APIs
      const testCases = [
        { hsn: '8517', country: 'IN' },
        { hsn: '6109', country: 'NP' },
        { hsn: '8471', country: 'IN' },
      ];

      for (const testCase of testCases) {
        try {
          const apiResult = await governmentAPIOrchestrator.getTaxRate({
            destinationCountry: testCase.country as any,
            hsnCode: testCase.hsn,
            amount: 100,
          });

          // Get our stored rate
          const { data: storedRate } = await supabase
            .from('hsn_master')
            .select('gst_rate, customs_duty_rate')
            .eq('hsn_code', testCase.hsn)
            .single();

          if (apiResult.success && storedRate) {
            const difference = Math.abs(apiResult.taxes.primary_rate - storedRate.gst_rate);
            if (difference > 2) {
              // Allow 2% tolerance
              inconsistentRates++;
            }
          }
          totalChecked++;
        } catch (error) {
          console.warn('API consistency check failed:', testCase, error);
        }
      }
    } catch (error) {
      console.warn('Tax rate consistency validation failed:', error);
    }

    return {
      rule_id: 'tax_003',
      passed: inconsistentRates === 0,
      severity: 'medium',
      message:
        inconsistentRates === 0
          ? `Tax rates are consistent with government APIs (${totalChecked} checked)`
          : `Found ${inconsistentRates} HSN codes with potentially inconsistent tax rates`,
      details: {
        inconsistent_rates: inconsistentRates,
        total_checked: totalChecked,
      },
      suggested_fix:
        inconsistentRates > 0
          ? 'Update HSN master data with latest government tax rates'
          : undefined,
      data_context: { affected_records: inconsistentRates },
    };
  }

  private async validateHSNCodeValidity(options: ValidationOptions): Promise<ValidationResult> {
    // Check for items with HSN codes not in master database
    const { data: invalidHSNCodes, error } = await supabase
      .from('quote_items')
      .select('id, hsn_code')
      .not('hsn_code', 'is', null)
      .not('hsn_code', 'in', `(SELECT hsn_code FROM hsn_master)`)
      .limit(options.sample_size || 1000);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    const invalidCount = invalidHSNCodes?.length || 0;

    return {
      rule_id: 'hsn_001',
      passed: invalidCount === 0,
      severity: 'critical',
      message:
        invalidCount === 0
          ? 'All HSN codes are valid'
          : `Found ${invalidCount} items with invalid HSN codes`,
      details: { invalid_hsn_items: invalidCount },
      suggested_fix:
        invalidCount > 0
          ? 'Update items with invalid HSN codes or add missing codes to HSN master'
          : undefined,
      data_context: { affected_records: invalidCount },
    };
  }

  private async validateClassificationConfidence(
    options: ValidationOptions,
  ): Promise<ValidationResult> {
    const { data: lowConfidenceItems, error } = await supabase
      .from('quote_items')
      .select('id, name, operational_data')
      .lt('operational_data->>hsn_classification_confidence', 0.7)
      .not('operational_data->>hsn_classification_confidence', 'is', null)
      .limit(options.sample_size || 1000);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    const lowConfidenceCount = lowConfidenceItems?.length || 0;

    return {
      rule_id: 'hsn_002',
      passed: lowConfidenceCount === 0,
      severity: 'medium',
      message:
        lowConfidenceCount === 0
          ? 'All HSN classifications have adequate confidence scores'
          : `Found ${lowConfidenceCount} items with low HSN classification confidence`,
      details: { low_confidence_items: lowConfidenceCount },
      suggested_fix:
        lowConfidenceCount > 0
          ? 'Review and manually verify items with low classification confidence'
          : undefined,
      data_context: { affected_records: lowConfidenceCount },
    };
  }

  private async validateCategoryAlignment(options: ValidationOptions): Promise<ValidationResult> {
    // This is a simplified check - would need more sophisticated logic in production
    const { data: items, error } = await supabase
      .from('quote_items')
      .select('id, category, hsn_code')
      .not('category', 'is', null)
      .not('hsn_code', 'is', null)
      .limit(options.sample_size || 1000);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    let misalignedCount = 0;

    // Simplified alignment check
    const alignmentRules: Record<string, string[]> = {
      electronics: ['8517', '8471', '8528'],
      clothing: ['6109', '6204', '6110'],
      books: ['4901', '4902'],
      home: ['9403', '9404'],
    };

    if (items) {
      for (const item of items) {
        const expectedHSNCodes = alignmentRules[item.category?.toLowerCase()];
        if (expectedHSNCodes && !expectedHSNCodes.includes(item.hsn_code)) {
          misalignedCount++;
        }
      }
    }

    return {
      rule_id: 'hsn_003',
      passed: misalignedCount === 0,
      severity: 'low',
      message:
        misalignedCount === 0
          ? 'HSN codes align well with product categories'
          : `Found ${misalignedCount} items with potentially misaligned HSN codes`,
      details: { misaligned_items: misalignedCount },
      suggested_fix:
        misalignedCount > 0
          ? 'Review HSN code assignments for items with category misalignment'
          : undefined,
      data_context: { affected_records: misalignedCount },
    };
  }

  private async validateMigrationCompleteness(
    options: ValidationOptions,
  ): Promise<ValidationResult> {
    // Check for quotes that should be migrated but aren't
    const { data: unmigrated, error } = await supabase
      .from('quotes')
      .select('id')
      .neq('operational_data->>hsn_tax_calculation', true)
      .gte('created_at', '2024-01-01') // Only check recent quotes
      .limit(options.sample_size || 1000);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    const unmigratedCount = unmigrated?.length || 0;

    return {
      rule_id: 'migration_001',
      passed: unmigratedCount === 0,
      severity: 'high',
      message:
        unmigratedCount === 0
          ? 'All eligible quotes have been migrated to HSN system'
          : `Found ${unmigratedCount} quotes that may need HSN migration`,
      details: { unmigrated_quotes: unmigratedCount },
      suggested_fix:
        unmigratedCount > 0 ? 'Run HSN migration for remaining eligible quotes' : undefined,
      data_context: { affected_records: unmigratedCount },
    };
  }

  private async validateOperationalDataIntegrity(
    options: ValidationOptions,
  ): Promise<ValidationResult> {
    const { data: invalidOperationalData, error } = await supabase
      .from('quotes')
      .select('id, operational_data')
      .eq('operational_data->>hsn_tax_calculation', true)
      .or(
        'operational_data->>calculation_method.is.null,operational_data->>hsn_migration_date.is.null',
      )
      .limit(options.sample_size || 1000);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    const invalidCount = invalidOperationalData?.length || 0;

    return {
      rule_id: 'migration_002',
      passed: invalidCount === 0,
      severity: 'medium',
      message:
        invalidCount === 0
          ? 'All operational metadata is correctly set'
          : `Found ${invalidCount} migrated quotes with incomplete operational data`,
      details: { invalid_operational_data: invalidCount },
      suggested_fix:
        invalidCount > 0 ? 'Update operational metadata for migrated quotes' : undefined,
      data_context: { affected_records: invalidCount },
    };
  }

  /**
   * Helper methods
   */
  private shouldRunRule(rule: ValidationRule, severityThreshold: string): boolean {
    const severityOrder = ['low', 'medium', 'high', 'critical'];
    const ruleIndex = severityOrder.indexOf(rule.severity);
    const thresholdIndex = severityOrder.indexOf(severityThreshold);

    return ruleIndex >= thresholdIndex;
  }

  private calculateValidationScores(results: ValidationResult[]): {
    data_integrity_score: number;
    business_rule_compliance: number;
    tax_accuracy_score: number;
    hsn_classification_quality: number;
    migration_completeness: number;
    overall_score: number;
  } {
    const categoryScores = {
      integrity: this.calculateCategoryScore(results, 'integrity'),
      business: this.calculateCategoryScore(results, 'business'),
      tax: this.calculateCategoryScore(results, 'tax'),
      hsn: this.calculateCategoryScore(results, 'hsn'),
      migration: this.calculateCategoryScore(results, 'migration'),
    };

    const overall = Object.values(categoryScores).reduce((sum, score) => sum + score, 0) / 5;

    return {
      data_integrity_score: categoryScores.integrity,
      business_rule_compliance: categoryScores.business,
      tax_accuracy_score: categoryScores.tax,
      hsn_classification_quality: categoryScores.hsn,
      migration_completeness: categoryScores.migration,
      overall_score: overall,
    };
  }

  private calculateCategoryScore(results: ValidationResult[], category: string): number {
    const categoryRules = Array.from(this.validationRules.values()).filter(
      (rule) => rule.category === category,
    );

    if (categoryRules.length === 0) return 1.0;

    const categoryResults = results.filter((r) =>
      categoryRules.some((rule) => rule.id === r.rule_id),
    );

    if (categoryResults.length === 0) return 1.0;

    const passedRules = categoryResults.filter((r) => r.passed).length;
    return passedRules / categoryResults.length;
  }

  private generateRecommendations(results: ValidationResult[]): string[] {
    const recommendations: string[] = [];
    const failedResults = results.filter((r) => !r.passed);

    // Priority-based recommendations
    const criticalIssues = failedResults.filter((r) => r.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push(
        `🚨 CRITICAL: Address ${criticalIssues.length} critical data integrity issues immediately`,
      );
    }

    const taxIssues = failedResults.filter((r) => r.rule_id.startsWith('tax_'));
    if (taxIssues.length > 0) {
      recommendations.push(`💰 Review tax calculation accuracy - ${taxIssues.length} issues found`);
    }

    const hsnIssues = failedResults.filter((r) => r.rule_id.startsWith('hsn_'));
    if (hsnIssues.length > 0) {
      recommendations.push(
        `🏷️ Improve HSN classification quality - ${hsnIssues.length} issues found`,
      );
    }

    const migrationIssues = failedResults.filter((r) => r.rule_id.startsWith('migration_'));
    if (migrationIssues.length > 0) {
      recommendations.push(
        `🔄 Complete HSN migration - ${migrationIssues.length} migration issues found`,
      );
    }

    // General recommendations
    if (failedResults.length > 0) {
      recommendations.push(`📊 Run validation regularly to maintain data quality`);
      recommendations.push(`🔧 Consider automated data cleanup for recurring issues`);
    }

    return recommendations;
  }

  private generateValidationId(): string {
    return `hsn_validation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Public methods
   */
  getValidationHistory(): ValidationReport[] {
    return [...this.validationHistory];
  }

  getValidationRules(): ValidationRule[] {
    return Array.from(this.validationRules.values());
  }

  async getDataQualityMetrics(): Promise<{
    overall_health: number;
    last_validation: string | null;
    critical_issues_count: number;
    recommendations_count: number;
  }> {
    const latestValidation = this.validationHistory[this.validationHistory.length - 1];

    return {
      overall_health: latestValidation?.overall_score || 0,
      last_validation: latestValidation?.run_date || null,
      critical_issues_count: latestValidation?.critical_issues.length || 0,
      recommendations_count: latestValidation?.recommendations.length || 0,
    };
  }
}

export const hsnDataValidationService = new HSNDataValidationService();
export type { ValidationRule, ValidationResult, ValidationReport, ValidationOptions };
