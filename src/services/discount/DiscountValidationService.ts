/**
 * Discount Validation Service
 * Handles discount code validation, conditions checking, and abuse detection
 * Decomposed from DiscountService for focused responsibility
 * 
 * RESPONSIBILITIES:
 * - Discount code validation and database lookup
 * - Usage limit checking and customer restrictions
 * - Date validity and expiration handling
 * - Country-specific discount validation
 * - Abuse detection integration
 * - Enhanced error handling and messaging
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { DiscountAbuseDetectionService } from '@/services/DiscountAbuseDetectionService';
import { DiscountErrorService } from '@/services/DiscountErrorService';
import { DiscountLoggingService } from '@/services/DiscountLoggingService';

export interface ValidationRequest {
  code: string;
  customerId?: string;
  orderTotal?: number;
  countryCode?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ValidationResult {
  valid: boolean;
  discount?: any;
  error?: string;
  enhancedError?: any;
  actionRequired?: string;
  blockDuration?: number;
}

export interface DiscountCodeData {
  id: string;
  code: string;
  is_active: boolean;
  valid_from: string;
  valid_until?: string;
  usage_limit?: number;
  usage_count: number;
  usage_per_customer?: number;
  campaign?: any;
  discount_type?: any;
  priority?: number;
  campaign_id?: string;
}

export interface CountryValidation {
  is_valid: boolean;
  error_message?: string;
  min_order_amount?: number;
}

export class DiscountValidationService {
  private static instance: DiscountValidationService;
  private abuseDetectionService: DiscountAbuseDetectionService;
  private loggingService: DiscountLoggingService;
  private validationCache = new Map<string, { result: ValidationResult; timestamp: number }>();
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.abuseDetectionService = DiscountAbuseDetectionService.getInstance();
    this.loggingService = DiscountLoggingService.getInstance();
    logger.info('DiscountValidationService initialized');
  }

  static getInstance(): DiscountValidationService {
    if (!DiscountValidationService.instance) {
      DiscountValidationService.instance = new DiscountValidationService();
    }
    return DiscountValidationService.instance;
  }

  /**
   * Main validation method that orchestrates all validation steps
   */
  async validateDiscountCode(request: ValidationRequest): Promise<ValidationResult> {
    try {
      const { code, customerId, orderTotal, countryCode, sessionId, ipAddress, userAgent } = request;

      // Check cache first (for performance)
      const cacheKey = this.createCacheKey(request);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug(`Using cached validation result for code: ${code}`);
        return cached;
      }

      logger.info(`Validating discount code: ${code}`);

      // STEP 1: Abuse Detection Check
      if (sessionId) {
        const abuseCheckResult = await this.performAbuseCheck({
          sessionId,
          customerId,
          code,
          ipAddress,
          userAgent,
          countryCode
        });

        if (!abuseCheckResult.allowed) {
          return abuseCheckResult.result;
        }
      }

      // STEP 2: Database Lookup and Basic Validation
      const discountCode = await this.fetchDiscountCode(code);
      if (!discountCode) {
        const result = await this.handleInvalidCode(code, customerId, orderTotal, countryCode);
        this.setCache(cacheKey, result);
        return result;
      }

      // STEP 3: Active Status Check
      if (!discountCode.is_active) {
        const result = this.handleInactiveCode(code);
        this.setCache(cacheKey, result);
        return result;
      }

      // STEP 4: Date Validity Check
      const dateValidation = this.validateDates(discountCode);
      if (!dateValidation.valid) {
        if (dateValidation.expired) {
          await this.logExpiredCodeAttempt(code, customerId, orderTotal, countryCode, discountCode.valid_until);
        }
        this.setCache(cacheKey, dateValidation.result!);
        return dateValidation.result!;
      }

      // STEP 5: Usage Limits Check
      const usageLimitValidation = this.validateUsageLimits(discountCode);
      if (!usageLimitValidation.valid) {
        this.setCache(cacheKey, usageLimitValidation.result!);
        return usageLimitValidation.result!;
      }

      // STEP 6: Customer Usage Limit Check
      if (customerId && discountCode.usage_per_customer) {
        const customerLimitValidation = await this.validateCustomerUsageLimit(
          customerId, 
          discountCode, 
          code
        );
        if (!customerLimitValidation.valid) {
          this.setCache(cacheKey, customerLimitValidation.result!);
          return customerLimitValidation.result!;
        }
      }

      // STEP 7: Country-specific Validation
      if (countryCode && orderTotal !== undefined) {
        const countryValidation = await this.validateCountryRestrictions(
          code, 
          countryCode, 
          orderTotal
        );
        if (!countryValidation.valid) {
          this.setCache(cacheKey, countryValidation.result!);
          return countryValidation.result!;
        }
      }

      // STEP 8: Log Successful Validation
      await this.logSuccessfulValidation({
        code,
        customerId,
        orderTotal,
        countryCode,
        discountCode
      });

      const successResult: ValidationResult = { 
        valid: true, 
        discount: discountCode 
      };
      
      this.setCache(cacheKey, successResult);
      logger.info(`Discount code validated successfully: ${code}`);
      return successResult;

    } catch (error) {
      logger.error('Discount validation failed with error:', error);
      return await this.handleNetworkError(request.code, request.customerId, request.orderTotal, request.countryCode);
    }
  }

  /**
   * Perform abuse detection check
   */
  private async performAbuseCheck(params: {
    sessionId: string;
    customerId?: string;
    code: string;
    ipAddress?: string;
    userAgent?: string;
    countryCode?: string;
  }): Promise<{ allowed: boolean; result?: ValidationResult }> {
    try {
      const abuseCheck = await this.abuseDetectionService.checkDiscountAttempt({
        session_id: params.sessionId,
        customer_id: params.customerId,
        discount_code: params.code,
        ip_address: params.ipAddress,
        user_agent: params.userAgent,
        country: params.countryCode
      });

      if (!abuseCheck.allowed) {
        const enhancedError = DiscountErrorService.getEnhancedError('BLOCKED_SUSPICIOUS_ACTIVITY', params.code, {
          reason: abuseCheck.reason,
          action: abuseCheck.action_required
        });

        return {
          allowed: false,
          result: {
            valid: false,
            error: abuseCheck.reason || 'Request blocked due to suspicious activity',
            enhancedError,
            actionRequired: abuseCheck.action_required,
            blockDuration: abuseCheck.block_duration
          }
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.warn('Abuse detection check failed, allowing validation to continue:', error);
      return { allowed: true };
    }
  }

  /**
   * Fetch discount code from database
   */
  private async fetchDiscountCode(code: string): Promise<DiscountCodeData | null> {
    try {
      const { data: discountCode, error } = await supabase
        .from('discount_codes')
        .select(`
          *,
          campaign:discount_campaigns(*),
          discount_type:discount_types(*)
        `)
        .eq('code', code.toUpperCase())
        .single();

      if (error || !discountCode) {
        return null;
      }

      return discountCode;
    } catch (error) {
      logger.error('Failed to fetch discount code:', error);
      return null;
    }
  }

  /**
   * Validate date constraints
   */
  private validateDates(discountCode: DiscountCodeData): { 
    valid: boolean; 
    expired?: boolean; 
    result?: ValidationResult 
  } {
    const now = new Date();
    
    // Check if not yet valid
    if (new Date(discountCode.valid_from) > now) {
      const enhancedError = DiscountErrorService.getEnhancedError('CODE_NOT_YET_VALID', discountCode.code, {
        validFrom: discountCode.valid_from
      });
      
      return {
        valid: false,
        result: {
          valid: false,
          error: 'This discount code is not yet valid',
          enhancedError
        }
      };
    }
    
    // Check if expired
    if (discountCode.valid_until && new Date(discountCode.valid_until) < now) {
      const enhancedError = DiscountErrorService.getEnhancedError('CODE_EXPIRED', discountCode.code, {
        validUntil: discountCode.valid_until
      });
      
      return {
        valid: false,
        expired: true,
        result: {
          valid: false,
          error: 'This discount code has expired',
          enhancedError
        }
      };
    }

    return { valid: true };
  }

  /**
   * Validate usage limits
   */
  private validateUsageLimits(discountCode: DiscountCodeData): { 
    valid: boolean; 
    result?: ValidationResult 
  } {
    if (discountCode.usage_limit && discountCode.usage_count >= discountCode.usage_limit) {
      const enhancedError = DiscountErrorService.getEnhancedError('USAGE_LIMIT_REACHED', discountCode.code, {
        usageLimit: discountCode.usage_limit,
        usageCount: discountCode.usage_count
      });
      
      return {
        valid: false,
        result: {
          valid: false,
          error: 'This discount code has reached its usage limit',
          enhancedError
        }
      };
    }

    return { valid: true };
  }

  /**
   * Validate customer usage limits
   */
  private async validateCustomerUsageLimit(
    customerId: string, 
    discountCode: DiscountCodeData, 
    code: string
  ): Promise<{ valid: boolean; result?: ValidationResult }> {
    try {
      // Handle email as customer ID
      let actualCustomerId = customerId;
      
      if (customerId.includes('@')) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', customerId)
          .single();
        
        if (profile) {
          actualCustomerId = profile.id;
        } else {
          // If no profile found, allow for now (guest user scenario)
          logger.info('No profile found for email, skipping customer usage check:', customerId);
          return { valid: true };
        }
      }

      const { count } = await supabase
        .from('customer_discount_usage')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', actualCustomerId)
        .eq('discount_code_id', discountCode.id);

      if (count && count >= discountCode.usage_per_customer!) {
        const enhancedError = DiscountErrorService.getEnhancedError('CUSTOMER_LIMIT_REACHED', code, {
          customerLimit: discountCode.usage_per_customer,
          customerUsage: count
        });
        
        return {
          valid: false,
          result: {
            valid: false,
            error: 'You have already used this discount code',
            enhancedError
          }
        };
      }

      return { valid: true };
    } catch (error) {
      logger.error('Failed to validate customer usage limit:', error);
      return { valid: true }; // Allow on error to avoid blocking valid users
    }
  }

  /**
   * Validate country restrictions
   */
  private async validateCountryRestrictions(
    code: string, 
    countryCode: string, 
    orderTotal: number
  ): Promise<{ valid: boolean; result?: ValidationResult }> {
    try {
      const { data: countryValidation, error: countryError } = await supabase
        .rpc('validate_country_discount_code', {
          p_discount_code: code.toUpperCase(),
          p_customer_country: countryCode,
          p_order_total: orderTotal
        });

      if (countryError) {
        logger.error('Error validating country discount:', countryError);
        const enhancedError = DiscountErrorService.getEnhancedError('SERVER_ERROR', code);
        
        return {
          valid: false,
          result: {
            valid: false,
            error: 'Error validating discount for your location',
            enhancedError
          }
        };
      }

      if (countryValidation && countryValidation.length > 0) {
        const validation = countryValidation[0];
        if (!validation.is_valid) {
          // Determine specific error type based on validation message
          let errorType = 'COUNTRY_NOT_ELIGIBLE';
          if (validation.error_message?.includes('minimum')) {
            errorType = 'MINIMUM_ORDER_NOT_MET';
          }
          
          const enhancedError = DiscountErrorService.getEnhancedError(errorType, code, {
            country: countryCode,
            orderTotal: orderTotal,
            minOrder: validation.min_order_amount
          });
          
          return {
            valid: false,
            result: {
              valid: false,
              error: validation.error_message || 'This discount is not valid for your location or order amount',
              enhancedError
            }
          };
        }
      } else {
        const enhancedError = DiscountErrorService.getEnhancedError('COUNTRY_NOT_ELIGIBLE', code, {
          country: countryCode
        });
        
        return {
          valid: false,
          result: {
            valid: false,
            error: 'This discount is not available for your location',
            enhancedError
          }
        };
      }

      return { valid: true };
    } catch (error) {
      logger.error('Failed to validate country restrictions:', error);
      return { valid: true }; // Allow on error to avoid blocking valid users
    }
  }

  /**
   * Handle invalid discount code
   */
  private async handleInvalidCode(
    code: string, 
    customerId?: string, 
    orderTotal?: number, 
    countryCode?: string
  ): Promise<ValidationResult> {
    await this.loggingService.logDiscountValidation({
      discount_code: code,
      customer_id: customerId,
      validation_result: 'invalid',
      error_message: 'Discount code not found',
      order_total: orderTotal,
      customer_country: countryCode,
      validated_at: new Date(),
      metadata: {
        error_type: 'invalid_code',
        user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
      }
    });

    const enhancedError = DiscountErrorService.getEnhancedError('INVALID_CODE', code);
    
    return { 
      valid: false, 
      error: 'Invalid discount code',
      enhancedError 
    };
  }

  /**
   * Handle inactive discount code
   */
  private handleInactiveCode(code: string): ValidationResult {
    const enhancedError = DiscountErrorService.getEnhancedError('CODE_INACTIVE', code);
    
    return { 
      valid: false, 
      error: 'This discount code is no longer active',
      enhancedError 
    };
  }

  /**
   * Log expired code attempt
   */
  private async logExpiredCodeAttempt(
    code: string, 
    customerId?: string, 
    orderTotal?: number, 
    countryCode?: string, 
    validUntil?: string
  ): Promise<void> {
    await this.loggingService.logDiscountValidation({
      discount_code: code,
      customer_id: customerId,
      validation_result: 'expired',
      error_message: 'Discount code has expired',
      order_total: orderTotal,
      customer_country: countryCode,
      conditions_checked: {
        valid_until: validUntil,
        current_date: new Date().toISOString()
      },
      validated_at: new Date(),
      metadata: {
        error_type: 'expired_code',
        expired_date: validUntil,
        user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
      }
    });
  }

  /**
   * Log successful validation
   */
  private async logSuccessfulValidation(params: {
    code: string;
    customerId?: string;
    orderTotal?: number;
    countryCode?: string;
    discountCode: DiscountCodeData;
  }): Promise<void> {
    await this.loggingService.logDiscountValidation({
      discount_code: params.code,
      customer_id: params.customerId,
      validation_result: 'valid',
      order_total: params.orderTotal,
      customer_country: params.countryCode,
      conditions_checked: {
        is_active: params.discountCode.is_active,
        date_valid: true,
        usage_limit_ok: true,
        customer_limit_ok: true,
        country_eligible: params.countryCode ? true : undefined,
        min_order_met: params.orderTotal ? true : undefined
      },
      validated_at: new Date(),
      metadata: {
        discount_name: params.discountCode.discount_type?.name,
        discount_value: params.discountCode.discount_type?.value,
        user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
      }
    });
  }

  /**
   * Handle network errors
   */
  private async handleNetworkError(
    code: string, 
    customerId?: string, 
    orderTotal?: number, 
    countryCode?: string
  ): Promise<ValidationResult> {
    await this.loggingService.logDiscountValidation({
      discount_code: code,
      customer_id: customerId,
      validation_result: 'invalid',
      error_message: 'Network error during validation',
      order_total: orderTotal,
      customer_country: countryCode,
      validated_at: new Date(),
      metadata: {
        error_type: 'network_error',
        user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
      }
    });

    const enhancedError = DiscountErrorService.getEnhancedError('NETWORK_ERROR', code);
    
    return { 
      valid: false, 
      error: 'Error validating discount code',
      enhancedError 
    };
  }

  /**
   * Cache management
   */
  private createCacheKey(request: ValidationRequest): string {
    return [
      request.code,
      request.customerId || 'anonymous',
      request.orderTotal || 0,
      request.countryCode || 'unknown'
    ].join('|');
  }

  private getFromCache(key: string): ValidationResult | null {
    const cached = this.validationCache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheTTL;
    if (isExpired) {
      this.validationCache.delete(key);
      return null;
    }

    return cached.result;
  }

  private setCache(key: string, result: ValidationResult): void {
    this.validationCache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
    logger.info('Discount validation cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.validationCache.size,
      entries: Array.from(this.validationCache.keys())
    };
  }

  /**
   * Clean up expired cache entries
   */
  cleanExpiredCache(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cached] of this.validationCache.entries()) {
      if (now - cached.timestamp > this.cacheTTL) {
        this.validationCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned ${cleanedCount} expired cache entries`);
    }

    return cleanedCount;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.clearCache();
    logger.info('DiscountValidationService disposed');
  }
}

export default DiscountValidationService;