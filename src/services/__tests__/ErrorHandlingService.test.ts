import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ErrorHandlingService,
  QuoteCalculationErrorCode,
  QuoteCalculationError,
  RecoveryAction,
  ErrorHandlingConfig,
  errorHandlingService,
  createValidationError,
  createCalculationError,
  createNetworkError
} from '../ErrorHandlingService';

describe('ErrorHandlingService', () => {
  let service: ErrorHandlingService;
  let consoleSpy: {
    error: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    log: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    service = ErrorHandlingService.getInstance();
    service.clearErrorLog();
    
    // Spy on console methods
    consoleSpy = {
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      log: vi.spyOn(console, 'log').mockImplementation(() => {})
    };

    // Reset config to defaults
    service.updateConfig({
      maxRetries: 3,
      retryDelay: 1000,
      enableFallbacks: true,
      logErrors: true,
      showUserMessages: true,
      autoRecovery: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    test('should return the same instance', () => {
      const instance1 = ErrorHandlingService.getInstance();
      const instance2 = ErrorHandlingService.getInstance();
      expect(instance1).toBe(instance2);
    });

    test('should return the same instance as exported singleton', () => {
      const instance = ErrorHandlingService.getInstance();
      expect(instance).toBe(errorHandlingService);
    });
  });

  describe('Error Creation', () => {
    test('should create error with all required fields', () => {
      const error = service.createError(
        QuoteCalculationErrorCode.MISSING_ITEMS,
        'Test error message'
      );

      expect(error).toMatchObject({
        code: QuoteCalculationErrorCode.MISSING_ITEMS,
        message: 'Test error message',
        severity: 'low',
        timestamp: expect.any(Date),
        recoveryActions: expect.any(Array)
      });
    });

    test('should create error with optional details and context', () => {
      const details = { testDetail: 'value' };
      const context = {
        originCountry: 'US',
        destinationCountry: 'IN',
        currency: 'USD',
        itemCount: 2,
        userId: 'user-123',
        sessionId: 'session-456'
      };

      const error = service.createError(
        QuoteCalculationErrorCode.CALCULATION_FAILED,
        'Test calculation error',
        details,
        context,
        'testField'
      );

      expect(error).toMatchObject({
        code: QuoteCalculationErrorCode.CALCULATION_FAILED,
        message: 'Test calculation error',
        details,
        context,
        field: 'testField',
        severity: 'high'
      });
    });

    test('should log error when logErrors is enabled', () => {
      service.createError(
        QuoteCalculationErrorCode.SYSTEM_ERROR,
        'Critical error'
      );

      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[QuoteCalculationCRITICAL]',
        expect.objectContaining({
          code: QuoteCalculationErrorCode.SYSTEM_ERROR,
          message: 'Critical error'
        })
      );
    });

    test('should not log error when logErrors is disabled', () => {
      service.updateConfig({ logErrors: false });
      
      service.createError(
        QuoteCalculationErrorCode.SYSTEM_ERROR,
        'Critical error'
      );

      expect(consoleSpy.error).not.toHaveBeenCalled();
    });
  });

  describe('Error Severity Determination', () => {
    test('should classify system errors as critical', () => {
      const criticalCodes = [
        QuoteCalculationErrorCode.SYSTEM_ERROR,
        QuoteCalculationErrorCode.MEMORY_ERROR,
        QuoteCalculationErrorCode.DATABASE_ERROR
      ];

      criticalCodes.forEach(code => {
        const error = service.createError(code, 'Test');
        expect(error.severity).toBe('critical');
      });
    });

    test('should classify calculation errors as high', () => {
      const highCodes = [
        QuoteCalculationErrorCode.CALCULATION_FAILED,
        QuoteCalculationErrorCode.INVALID_EXCHANGE_RATE,
        QuoteCalculationErrorCode.MISSING_COUNTRY_SETTINGS
      ];

      highCodes.forEach(code => {
        const error = service.createError(code, 'Test');
        expect(error.severity).toBe('high');
      });
    });

    test('should classify API errors as medium', () => {
      const mediumCodes = [
        QuoteCalculationErrorCode.SHIPPING_COST_API_ERROR,
        QuoteCalculationErrorCode.EXCHANGE_RATE_API_ERROR,
        QuoteCalculationErrorCode.NETWORK_ERROR,
        QuoteCalculationErrorCode.TIMEOUT_ERROR
      ];

      mediumCodes.forEach(code => {
        const error = service.createError(code, 'Test');
        expect(error.severity).toBe('medium');
      });
    });

    test('should classify validation errors as low', () => {
      const lowCodes = [
        QuoteCalculationErrorCode.MISSING_ITEMS,
        QuoteCalculationErrorCode.INVALID_ITEM_PRICE,
        QuoteCalculationErrorCode.INVALID_ITEM_WEIGHT
      ];

      lowCodes.forEach(code => {
        const error = service.createError(code, 'Test');
        expect(error.severity).toBe('low');
      });
    });
  });

  describe('Recovery Actions Generation', () => {
    test('should generate retry action for network errors', () => {
      const error = service.createError(
        QuoteCalculationErrorCode.NETWORK_ERROR,
        'Network failure'
      );

      expect(error.recoveryActions).toHaveLength(1);
      expect(error.recoveryActions?.[0]).toMatchObject({
        type: 'retry',
        description: 'Retry the calculation',
        automatic: true,
        action: expect.any(Function)
      });
    });

    test('should generate fallback action for shipping API errors', () => {
      const error = service.createError(
        QuoteCalculationErrorCode.SHIPPING_COST_API_ERROR,
        'Shipping API failure'
      );

      expect(error.recoveryActions).toHaveLength(1);
      expect(error.recoveryActions?.[0]).toMatchObject({
        type: 'fallback',
        description: 'Use fallback shipping calculation',
        automatic: true
      });
    });

    test('should generate contact admin action for configuration errors', () => {
      const error = service.createError(
        QuoteCalculationErrorCode.MISSING_COUNTRY_SETTINGS,
        'Country not configured'
      );

      expect(error.recoveryActions).toHaveLength(1);
      expect(error.recoveryActions?.[0]).toMatchObject({
        type: 'contact_admin',
        description: 'Contact administrator to configure country settings'
      });
    });

    test('should generate manual action for unknown errors', () => {
      const error = service.createError(
        QuoteCalculationErrorCode.UNKNOWN_ERROR,
        'Unknown error'
      );

      expect(error.recoveryActions).toHaveLength(1);
      expect(error.recoveryActions?.[0]).toMatchObject({
        type: 'manual',
        description: 'Please check your input values and try again'
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle error without automatic recovery', async () => {
      const error = service.createError(
        QuoteCalculationErrorCode.MISSING_ITEMS,
        'No items provided'
      );

      const result = await service.handleError(error);

      expect(result).toMatchObject({
        handled: false,
        userMessage: expect.stringContaining('Please add at least one item')
      });
    });

    test('should perform automatic recovery when available', async () => {
      const mockAction = vi.fn().mockResolvedValue(undefined);
      const error = service.createError(
        QuoteCalculationErrorCode.NETWORK_ERROR,
        'Network failure'
      );
      
      // Override with mock action
      error.recoveryActions = [{
        type: 'retry',
        description: 'Mock retry',
        automatic: true,
        action: mockAction
      }];

      const result = await service.handleError(error);

      expect(mockAction).toHaveBeenCalled();
      expect(result).toMatchObject({
        handled: true,
        recovery: 'automatic',
        userMessage: 'Recovered from error: Mock retry'
      });
    });

    test('should handle recovery action failure', async () => {
      const mockAction = vi.fn().mockRejectedValue(new Error('Recovery failed'));
      const error = service.createError(
        QuoteCalculationErrorCode.NETWORK_ERROR,
        'Network failure'
      );
      
      error.recoveryActions = [{
        type: 'retry',
        description: 'Mock retry',
        automatic: true,
        action: mockAction
      }];

      const result = await service.handleError(error);

      expect(mockAction).toHaveBeenCalled();
      expect(result).toMatchObject({
        handled: false,
        userMessage: expect.stringContaining('Network connection issue')
      });
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        '[ErrorHandlingService] Auto-recovery failed:',
        expect.any(Error)
      );
    });

    test('should skip automatic recovery when disabled', async () => {
      service.updateConfig({ autoRecovery: false });
      
      const mockAction = vi.fn().mockResolvedValue(undefined);
      const error = service.createError(
        QuoteCalculationErrorCode.NETWORK_ERROR,
        'Network failure'
      );
      
      error.recoveryActions = [{
        type: 'retry',
        description: 'Mock retry',
        automatic: true,
        action: mockAction
      }];

      const result = await service.handleError(error);

      expect(mockAction).not.toHaveBeenCalled();
      expect(result.handled).toBe(false);
    });
  });

  describe('User Message Generation', () => {
    test('should generate appropriate message for validation errors', () => {
      const error = service.createError(
        QuoteCalculationErrorCode.INVALID_ITEM_PRICE,
        'Invalid price',
        undefined,
        undefined,
        'price'
      );

      const result = service['generateUserMessage'](error);
      expect(result).toBe('Please enter a valid price for all items. (Field: price)');
    });

    test('should include route information in message', () => {
      const error = service.createError(
        QuoteCalculationErrorCode.SHIPPING_COST_API_ERROR,
        'Shipping API error',
        undefined,
        { originCountry: 'US', destinationCountry: 'IN' }
      );

      const result = service['generateUserMessage'](error);
      expect(result).toBe('Unable to fetch shipping costs. Using estimated rates. (Route: US → IN)');
    });

    test('should handle missing route information', () => {
      const error = service.createError(
        QuoteCalculationErrorCode.SHIPPING_COST_API_ERROR,
        'Shipping API error',
        undefined,
        { originCountry: 'US' }
      );

      const result = service['generateUserMessage'](error);
      expect(result).toBe('Unable to fetch shipping costs. Using estimated rates. (Route: US → ?)');
    });

    test('should fallback to unknown error message for invalid codes', () => {
      const error = service.createError(
        'INVALID_CODE' as QuoteCalculationErrorCode,
        'Invalid error code'
      );

      const result = service['generateUserMessage'](error);
      expect(result).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('Error Logging', () => {
    test('should log errors with appropriate console level', () => {
      // Critical error
      service.createError(QuoteCalculationErrorCode.SYSTEM_ERROR, 'Critical');
      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[QuoteCalculationCRITICAL]',
        expect.any(Object)
      );

      // High error
      service.createError(QuoteCalculationErrorCode.CALCULATION_FAILED, 'High');
      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[QuoteCalculationHIGH]',
        expect.any(Object)
      );

      // Medium error
      service.createError(QuoteCalculationErrorCode.NETWORK_ERROR, 'Medium');
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        '[QuoteCalculationMEDIUM]',
        expect.any(Object)
      );

      // Low error
      service.createError(QuoteCalculationErrorCode.MISSING_ITEMS, 'Low');
      expect(consoleSpy.info).toHaveBeenCalledWith(
        '[QuoteCalculationLOW]',
        expect.any(Object)
      );
    });

    test('should maintain error log with size limit', () => {
      // Add 105 errors to test size limit
      for (let i = 0; i < 105; i++) {
        service.createError(
          QuoteCalculationErrorCode.MISSING_ITEMS,
          `Error ${i}`
        );
      }

      const stats = service.getErrorStats();
      expect(stats.totalErrors).toBe(100); // Should be capped at 100
    });
  });

  describe('Retry Mechanism', () => {
    test('should successfully execute operation on first try', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      
      const result = await service.withRetry(mockOperation, 'test-op');
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    test('should retry failing operation up to maxRetries', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValue('success');

      const result = await service.withRetry(mockOperation, 'test-op');
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    test('should throw QuoteCalculationError after max retries', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Always fails'));
      
      await expect(
        service.withRetry(mockOperation, 'test-op')
      ).rejects.toMatchObject({
        code: QuoteCalculationErrorCode.CALCULATION_FAILED,
        message: expect.stringContaining('Operation failed after 3 attempts')
      });
      
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    test('should use exponential backoff for retries', async () => {
      service.updateConfig({ retryDelay: 100 }); // Shorter delay for testing
      
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      await service.withRetry(mockOperation, 'test-op');
      const endTime = Date.now();
      
      // Should have waited at least 100ms + 200ms = 300ms
      expect(endTime - startTime).toBeGreaterThanOrEqual(250);
    });

    test('should include context in retry error', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Always fails'));
      const context = { originCountry: 'US', destinationCountry: 'IN' };
      
      await expect(
        service.withRetry(mockOperation, 'test-op', context)
      ).rejects.toMatchObject({
        context,
        details: expect.objectContaining({
          attempts: 3
        })
      });
    });
  });

  describe('Error Statistics', () => {
    beforeEach(() => {
      // Clear any existing errors
      service.clearErrorLog();
    });

    test('should calculate error statistics correctly', () => {
      // Add various errors
      service.createError(QuoteCalculationErrorCode.MISSING_ITEMS, 'Error 1');
      service.createError(QuoteCalculationErrorCode.MISSING_ITEMS, 'Error 2');
      service.createError(QuoteCalculationErrorCode.SYSTEM_ERROR, 'Error 3');
      service.createError(QuoteCalculationErrorCode.NETWORK_ERROR, 'Error 4');

      const stats = service.getErrorStats();

      expect(stats.totalErrors).toBe(4);
      expect(stats.errorsByCode).toEqual({
        [QuoteCalculationErrorCode.MISSING_ITEMS]: 2,
        [QuoteCalculationErrorCode.SYSTEM_ERROR]: 1,
        [QuoteCalculationErrorCode.NETWORK_ERROR]: 1
      });
      expect(stats.errorsBySeverity).toEqual({
        low: 2,
        critical: 1,
        medium: 1
      });
    });

    test('should filter recent and daily errors correctly', () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      
      // Create error and manually set timestamp
      const oldError = service.createError(
        QuoteCalculationErrorCode.MISSING_ITEMS,
        'Old error'
      );
      oldError.timestamp = twoHoursAgo;
      
      // Force add to log (since createError already added it, we need to replace)
      service.clearErrorLog();
      service['errorLog'].push(oldError);
      
      // Add recent error
      service.createError(QuoteCalculationErrorCode.NETWORK_ERROR, 'Recent error');

      const stats = service.getErrorStats();
      
      expect(stats.totalErrors).toBe(2);
      expect(stats.recentErrors).toBe(1); // Only the recent one
      expect(stats.dailyErrors).toBe(2); // Both within 24 hours
    });

    test('should return last error in stats', () => {
      service.createError(QuoteCalculationErrorCode.MISSING_ITEMS, 'First error');
      service.createError(QuoteCalculationErrorCode.SYSTEM_ERROR, 'Last error');

      const stats = service.getErrorStats();
      
      expect(stats.lastError).toMatchObject({
        code: QuoteCalculationErrorCode.SYSTEM_ERROR,
        message: 'Last error'
      });
    });
  });

  describe('Configuration Management', () => {
    test('should update configuration partially', () => {
      const newConfig = {
        maxRetries: 5,
        enableFallbacks: false
      };

      service.updateConfig(newConfig);
      const config = service.getConfig();

      expect(config.maxRetries).toBe(5);
      expect(config.enableFallbacks).toBe(false);
      expect(config.retryDelay).toBe(1000); // Should remain unchanged
    });

    test('should return complete configuration', () => {
      const config = service.getConfig();

      expect(config).toEqual({
        maxRetries: 3,
        retryDelay: 1000,
        enableFallbacks: true,
        logErrors: true,
        showUserMessages: true,
        autoRecovery: true
      });
    });

    test('should not allow direct modification of config', () => {
      const config = service.getConfig();
      config.maxRetries = 999;

      const unchangedConfig = service.getConfig();
      expect(unchangedConfig.maxRetries).toBe(3);
    });
  });

  describe('Cache Management', () => {
    test('should clear error log and retry counters', () => {
      // Add errors
      service.createError(QuoteCalculationErrorCode.MISSING_ITEMS, 'Error 1');
      service.createError(QuoteCalculationErrorCode.SYSTEM_ERROR, 'Error 2');

      // Add retry counter (simulate failed retry)
      service['retryCounters'].set('test-operation', 2);

      expect(service.getErrorStats().totalErrors).toBe(2);
      expect(service['retryCounters'].size).toBe(1);

      service.clearErrorLog();

      expect(service.getErrorStats().totalErrors).toBe(0);
      expect(service['retryCounters'].size).toBe(0);
    });
  });

  describe('Helper Functions', () => {
    test('createValidationError should create proper validation error', () => {
      const error = createValidationError('price', 'Invalid price value', 'abc');

      expect(error).toMatchObject({
        code: QuoteCalculationErrorCode.INVALID_NUMERIC_VALUE,
        message: 'Invalid price value',
        field: 'price',
        details: {
          field: 'price',
          value: 'abc'
        }
      });
    });

    test('createCalculationError should create proper calculation error', () => {
      const details = { calculation: 'failed' };
      const context = { originCountry: 'US' };
      
      const error = createCalculationError('Calculation failed', details, context);

      expect(error).toMatchObject({
        code: QuoteCalculationErrorCode.CALCULATION_FAILED,
        message: 'Calculation failed',
        details,
        context
      });
    });

    test('createNetworkError should create proper network error', () => {
      const details = { timeout: 5000 };
      
      const error = createNetworkError('Network timeout', details);

      expect(error).toMatchObject({
        code: QuoteCalculationErrorCode.NETWORK_ERROR,
        message: 'Network timeout',
        details
      });
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    test('should handle null/undefined error messages', () => {
      const error = service.createError(
        QuoteCalculationErrorCode.UNKNOWN_ERROR,
        null as any
      );

      expect(error.message).toBe(null);
      expect(error.code).toBe(QuoteCalculationErrorCode.UNKNOWN_ERROR);
    });

    test('should handle empty context gracefully', () => {
      const error = service.createError(
        QuoteCalculationErrorCode.NETWORK_ERROR,
        'Network error',
        undefined,
        {}
      );

      expect(error.context).toEqual({});
      expect(error.recoveryActions).toHaveLength(1);
    });

    test('should handle recovery action without action function', async () => {
      const error = service.createError(
        QuoteCalculationErrorCode.SHIPPING_COST_API_ERROR,
        'Shipping error'
      );

      // Recovery action for shipping error doesn't have action function
      expect(error.recoveryActions?.[0].action).toBeUndefined();

      const result = await service.handleError(error);
      expect(result.handled).toBe(false);
    });

    test('should handle withRetry with sync operation', async () => {
      const syncOperation = () => Promise.resolve('sync-result');
      
      const result = await service.withRetry(syncOperation, 'sync-op');
      expect(result).toBe('sync-result');
    });

    test('should handle very long error messages', () => {
      const longMessage = 'x'.repeat(10000);
      const error = service.createError(
        QuoteCalculationErrorCode.UNKNOWN_ERROR,
        longMessage
      );

      expect(error.message).toBe(longMessage);
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    test('should handle recovery action that returns undefined', async () => {
      const mockAction = vi.fn().mockResolvedValue(undefined);
      const error = service.createError(
        QuoteCalculationErrorCode.NETWORK_ERROR,
        'Network error'
      );
      
      error.recoveryActions = [{
        type: 'retry',
        description: 'Test retry',
        automatic: true,
        action: mockAction
      }];

      const result = await service.handleError(error);
      expect(result.handled).toBe(true);
      expect(mockAction).toHaveBeenCalled();
    });
  });

  describe('Performance and Memory Management', () => {
    test('should limit error log memory usage', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Add many errors
      for (let i = 0; i < 1000; i++) {
        service.createError(
          QuoteCalculationErrorCode.MISSING_ITEMS,
          `Error ${i}`,
          { largeData: 'x'.repeat(1000) }
        );
      }

      const stats = service.getErrorStats();
      expect(stats.totalErrors).toBe(100); // Should be limited to 100

      const finalMemory = process.memoryUsage().heapUsed;
      // Memory shouldn't grow unboundedly
      expect(finalMemory - initialMemory).toBeLessThan(50 * 1024 * 1024); // 50MB limit
    });

    test('should handle rapid error creation efficiently', () => {
      const start = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        service.createError(
          QuoteCalculationErrorCode.MISSING_ITEMS,
          `Rapid error ${i}`
        );
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});