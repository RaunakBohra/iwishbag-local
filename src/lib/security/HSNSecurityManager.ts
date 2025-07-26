/**
 * HSN Security Manager
 * Handles API key management, permissions, and security for HSN tax system
 */

import { HSNSystemError, HSNErrorType, HSNErrorSeverity } from '../error-handling/HSNSystemError';

export enum HSNPermission {
  // HSN Code Management
  READ_HSN_CODES = 'hsn:read',
  WRITE_HSN_CODES = 'hsn:write',
  DELETE_HSN_CODES = 'hsn:delete',

  // Tax Configuration
  READ_TAX_CONFIG = 'tax:read',
  WRITE_TAX_CONFIG = 'tax:write',
  DELETE_TAX_CONFIG = 'tax:delete',

  // Admin Overrides
  CREATE_OVERRIDES = 'override:create',
  READ_OVERRIDES = 'override:read',
  UPDATE_OVERRIDES = 'override:update',
  DELETE_OVERRIDES = 'override:delete',

  // API Management
  MANAGE_API_KEYS = 'api:manage',
  USE_GOVERNMENT_APIS = 'api:government',

  // System Administration
  ADMIN_SYSTEM = 'system:admin',
  MONITOR_SYSTEM = 'system:monitor',

  // Quote Management
  CALCULATE_TAXES = 'quote:calculate',
  OVERRIDE_CALCULATIONS = 'quote:override',
}

export enum UserRole {
  CUSTOMER = 'customer',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  SYSTEM = 'system',
}

export interface APIKeyConfig {
  name: string;
  key: string;
  provider: string;
  encrypted: boolean;
  environment: 'development' | 'production';
  rateLimits: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  expiresAt?: Date;
  isActive: boolean;
}

export interface SecurityContext {
  userId?: string;
  userRole: UserRole;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export class HSNSecurityManager {
  private static instance: HSNSecurityManager;
  private apiKeys: Map<string, APIKeyConfig> = new Map();
  private rolePermissions: Map<UserRole, Set<HSNPermission>> = new Map();
  private encryptionKey: string;

  private constructor() {
    this.encryptionKey = import.meta.env.VITE_HSN_ENCRYPTION_KEY || 'default-dev-key';
    this.initializeRolePermissions();
    this.initializeAPIKeys();
  }

  public static getInstance(): HSNSecurityManager {
    if (!HSNSecurityManager.instance) {
      HSNSecurityManager.instance = new HSNSecurityManager();
    }
    return HSNSecurityManager.instance;
  }

  private initializeRolePermissions(): void {
    // Customer permissions
    this.rolePermissions.set(
      UserRole.CUSTOMER,
      new Set([HSNPermission.READ_HSN_CODES, HSNPermission.CALCULATE_TAXES]),
    );

    // Moderator permissions
    this.rolePermissions.set(
      UserRole.MODERATOR,
      new Set([
        HSNPermission.READ_HSN_CODES,
        HSNPermission.WRITE_HSN_CODES,
        HSNPermission.READ_TAX_CONFIG,
        HSNPermission.WRITE_TAX_CONFIG,
        HSNPermission.CREATE_OVERRIDES,
        HSNPermission.READ_OVERRIDES,
        HSNPermission.UPDATE_OVERRIDES,
        HSNPermission.CALCULATE_TAXES,
        HSNPermission.OVERRIDE_CALCULATIONS,
        HSNPermission.USE_GOVERNMENT_APIS,
      ]),
    );

    // Admin permissions (all permissions)
    this.rolePermissions.set(UserRole.ADMIN, new Set(Object.values(HSNPermission)));

    // System permissions (for automated processes)
    this.rolePermissions.set(
      UserRole.SYSTEM,
      new Set([
        HSNPermission.READ_HSN_CODES,
        HSNPermission.WRITE_HSN_CODES,
        HSNPermission.READ_TAX_CONFIG,
        HSNPermission.CALCULATE_TAXES,
        HSNPermission.USE_GOVERNMENT_APIS,
        HSNPermission.MONITOR_SYSTEM,
      ]),
    );
  }

  private initializeAPIKeys(): void {
    // Initialize API keys from environment variables
    const apiConfigs = [
      {
        name: 'india_gst',
        envKey: 'INDIA_GST_API_KEY',
        provider: 'Government of India',
        rateLimits: { requestsPerMinute: 100, requestsPerDay: 1000 },
      },
      {
        name: 'taxjar_us',
        envKey: 'TAXJAR_API_KEY',
        provider: 'TaxJar',
        rateLimits: { requestsPerMinute: 10, requestsPerDay: 200 },
      },
      {
        name: 'scraper_api',
        envKey: 'SCRAPER_API_KEY',
        provider: 'ScraperAPI',
        rateLimits: { requestsPerMinute: 60, requestsPerDay: 1000 },
      },
    ];

    for (const config of apiConfigs) {
      const apiKey = import.meta.env[`VITE_${config.envKey}`];
      if (apiKey) {
        this.apiKeys.set(config.name, {
          name: config.name,
          key: this.encryptAPIKey(apiKey),
          provider: config.provider,
          encrypted: true,
          environment:
            import.meta.env.VITE_NODE_ENV === 'production' ? 'production' : 'development',
          rateLimits: config.rateLimits,
          isActive: true,
        });
      }
    }
  }

  // Permission Management
  public hasPermission(userRole: UserRole, permission: HSNPermission): boolean {
    const rolePermissions = this.rolePermissions.get(userRole);
    return rolePermissions?.has(permission) || false;
  }

  public checkPermission(context: SecurityContext, permission: HSNPermission): void {
    if (!this.hasPermission(context.userRole, permission)) {
      throw new HSNSystemError(
        HSNErrorType.UNAUTHORIZED_ACCESS,
        `User role '${context.userRole}' does not have permission '${permission}'`,
        HSNErrorSeverity.HIGH,
        {
          userId: context.userId,
          sessionId: context.sessionId,
          timestamp: context.timestamp,
        },
        {
          canRecover: false,
          requiresManualReview: true,
          suggestedActions: [
            'Check user role assignment',
            'Request permission from administrator',
            'Use appropriate user account',
          ],
        },
      );
    }
  }

  public async validateUserRole(userId: string): Promise<UserRole> {
    try {
      // In production, this would query the database
      // For now, using environment or default logic
      if (userId === 'system') return UserRole.SYSTEM;

      // Query user role from database
      // const userRole = await this.getUserRoleFromDB(userId);
      // return userRole;

      // Default role for development
      return UserRole.CUSTOMER;
    } catch (error) {
      throw new HSNSystemError(
        HSNErrorType.UNAUTHORIZED_ACCESS,
        'Failed to validate user role',
        HSNErrorSeverity.HIGH,
        { userId, timestamp: new Date() },
        { canRecover: false, requiresManualReview: true },
        error as Error,
      );
    }
  }

  // API Key Management
  public getAPIKey(keyName: string): string {
    const apiKeyConfig = this.apiKeys.get(keyName);

    if (!apiKeyConfig) {
      throw new HSNSystemError(
        HSNErrorType.API_KEY_INVALID,
        `API key '${keyName}' not found`,
        HSNErrorSeverity.HIGH,
        { timestamp: new Date() },
        {
          canRecover: false,
          requiresManualReview: true,
          suggestedActions: [
            'Check API key configuration',
            'Verify environment variables',
            'Contact system administrator',
          ],
        },
      );
    }

    if (!apiKeyConfig.isActive) {
      throw new HSNSystemError(
        HSNErrorType.API_KEY_INVALID,
        `API key '${keyName}' is not active`,
        HSNErrorSeverity.HIGH,
        { timestamp: new Date() },
        {
          canRecover: false,
          requiresManualReview: true,
          suggestedActions: [
            'Activate API key',
            'Check key expiration',
            'Renew API key if expired',
          ],
        },
      );
    }

    if (apiKeyConfig.expiresAt && apiKeyConfig.expiresAt < new Date()) {
      throw new HSNSystemError(
        HSNErrorType.API_KEY_INVALID,
        `API key '${keyName}' has expired`,
        HSNErrorSeverity.HIGH,
        { timestamp: new Date() },
        {
          canRecover: false,
          requiresManualReview: true,
          suggestedActions: [
            'Renew expired API key',
            'Update key configuration',
            'Contact API provider',
          ],
        },
      );
    }

    return this.decryptAPIKey(apiKeyConfig.key);
  }

  public setAPIKey(keyName: string, config: Partial<APIKeyConfig>): void {
    const existingConfig = this.apiKeys.get(keyName);
    const newConfig: APIKeyConfig = {
      name: keyName,
      key: config.key ? this.encryptAPIKey(config.key) : existingConfig?.key || '',
      provider: config.provider || existingConfig?.provider || 'Unknown',
      encrypted: true,
      environment: config.environment || 'development',
      rateLimits: config.rateLimits || { requestsPerMinute: 60, requestsPerDay: 1000 },
      expiresAt: config.expiresAt,
      isActive: config.isActive !== undefined ? config.isActive : true,
    };

    this.apiKeys.set(keyName, newConfig);
  }

  public listAPIKeys(): { name: string; provider: string; isActive: boolean; expiresAt?: Date }[] {
    return Array.from(this.apiKeys.entries()).map(([name, config]) => ({
      name,
      provider: config.provider,
      isActive: config.isActive,
      expiresAt: config.expiresAt,
    }));
  }

  // Rate Limiting
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();

  public checkRateLimit(keyName: string, limitType: 'minute' | 'day' = 'minute'): boolean {
    const config = this.apiKeys.get(keyName);
    if (!config) return false;

    const now = Date.now();
    const resetInterval = limitType === 'minute' ? 60 * 1000 : 24 * 60 * 60 * 1000;
    const limit =
      limitType === 'minute'
        ? config.rateLimits.requestsPerMinute
        : config.rateLimits.requestsPerDay;

    const rateLimitKey = `${keyName}_${limitType}`;
    const currentLimit = this.rateLimitMap.get(rateLimitKey);

    if (!currentLimit || now > currentLimit.resetTime) {
      // Reset or initialize counter
      this.rateLimitMap.set(rateLimitKey, {
        count: 1,
        resetTime: now + resetInterval,
      });
      return true;
    }

    if (currentLimit.count >= limit) {
      throw new HSNSystemError(
        HSNErrorType.API_RATE_LIMIT_EXCEEDED,
        `Rate limit exceeded for ${keyName} (${limit}/${limitType})`,
        HSNErrorSeverity.MEDIUM,
        { timestamp: new Date() },
        {
          canRecover: true,
          requiresManualReview: false,
          suggestedActions: [
            'Wait for rate limit reset',
            'Use alternative API if available',
            'Implement request queuing',
          ],
        },
      );
    }

    // Increment counter
    currentLimit.count++;
    return true;
  }

  // Encryption helpers (simple implementation for development)
  private encryptAPIKey(key: string): string {
    // In production, use proper encryption (AES-256, etc.)
    // Using browser-compatible base64 encoding
    return btoa(key);
  }

  private decryptAPIKey(encryptedKey: string): string {
    // In production, use proper decryption
    // Using browser-compatible base64 decoding
    return atob(encryptedKey);
  }

  // Security Context Creation
  public createSecurityContext(
    userId?: string,
    userRole?: UserRole,
    sessionId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): SecurityContext {
    return {
      userId,
      userRole: userRole || UserRole.CUSTOMER,
      sessionId,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    };
  }

  // Audit Logging
  public async logSecurityEvent(
    event: string,
    context: SecurityContext,
    metadata?: any,
  ): Promise<void> {
    const logEntry = {
      event,
      context,
      metadata,
      timestamp: new Date().toISOString(),
      severity: 'INFO',
    };

    console.log('[HSN Security Audit]', logEntry);

    // In production, send to audit log service
    // await sendToAuditService(logEntry);
  }
}

// Export singleton instance
export const hsnSecurity = HSNSecurityManager.getInstance();

// Utility functions
export const withPermissionCheck = (permission: HSNPermission) => {
  return function (_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context = (this as any).securityContext || hsnSecurity.createSecurityContext();
      hsnSecurity.checkPermission(context, permission);
      return method.apply(this, args);
    };
  };
};

export const requireRole = (requiredRole: UserRole) => {
  return function (_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context = (this as any).securityContext || hsnSecurity.createSecurityContext();

      if (context.userRole !== requiredRole && requiredRole !== UserRole.CUSTOMER) {
        throw new HSNSystemError(
          HSNErrorType.UNAUTHORIZED_ACCESS,
          `Method requires role '${requiredRole}' but user has role '${context.userRole}'`,
          HSNErrorSeverity.HIGH,
          context,
        );
      }

      return method.apply(this, args);
    };
  };
};
