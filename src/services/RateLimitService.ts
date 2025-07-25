/**
 * RateLimitService - Lightweight rate limiting for quote share operations
 *
 * Features:
 * - 10 share links per hour per user (configurable)
 * - Memory-based storage with automatic cleanup
 * - User-friendly error messages
 * - Admin bypass capability
 *
 * System Impact: Minimal - just counters in memory
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  userId: string;
}

interface RateLimitConfig {
  maxSharesPerHour: number;
  maxSharesPerDay: number;
  windowSizeHours: number;
  adminBypass: boolean;
}

class RateLimitService {
  private static instance: RateLimitService;
  private rateLimitData: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private config: RateLimitConfig = {
    maxSharesPerHour: 10,
    maxSharesPerDay: 50,
    windowSizeHours: 1,
    adminBypass: true,
  };

  private constructor() {
    // Clean up expired entries every 5 minutes
    this.startCleanupTimer();
  }

  public static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService();
    }
    return RateLimitService.instance;
  }

  /**
   * Check if user can generate a share link
   */
  public canGenerateShareLink(
    userId: string,
    isAdmin: boolean = false,
  ): {
    allowed: boolean;
    remainingCount: number;
    resetTime: number;
    message?: string;
  } {
    // Admin bypass if enabled
    if (isAdmin && this.config.adminBypass) {
      return {
        allowed: true,
        remainingCount: this.config.maxSharesPerHour,
        resetTime: Date.now() + this.config.windowSizeHours * 60 * 60 * 1000,
      };
    }

    const now = Date.now();
    const windowStart = now - this.config.windowSizeHours * 60 * 60 * 1000;
    const key = `${userId}:${Math.floor(now / (60 * 60 * 1000))}`;

    const entry = this.rateLimitData.get(key);

    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired one
      const newEntry: RateLimitEntry = {
        count: 0,
        resetTime: now + this.config.windowSizeHours * 60 * 60 * 1000,
        userId,
      };
      this.rateLimitData.set(key, newEntry);

      return {
        allowed: true,
        remainingCount: this.config.maxSharesPerHour - 1,
        resetTime: newEntry.resetTime,
      };
    }

    // Check if limit exceeded
    if (entry.count >= this.config.maxSharesPerHour) {
      const minutesUntilReset = Math.ceil((entry.resetTime - now) / (60 * 1000));

      return {
        allowed: false,
        remainingCount: 0,
        resetTime: entry.resetTime,
        message: `Share link limit exceeded. You can generate ${this.config.maxSharesPerHour} links per hour. Try again in ${minutesUntilReset} minutes.`,
      };
    }

    return {
      allowed: true,
      remainingCount: this.config.maxSharesPerHour - entry.count - 1,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Record a share link generation
   */
  public recordShareLinkGeneration(userId: string): void {
    const now = Date.now();
    const key = `${userId}:${Math.floor(now / (60 * 60 * 1000))}`;

    const entry = this.rateLimitData.get(key);

    if (entry && entry.resetTime > now) {
      entry.count += 1;
    } else {
      // Create new entry
      this.rateLimitData.set(key, {
        count: 1,
        resetTime: now + this.config.windowSizeHours * 60 * 60 * 1000,
        userId,
      });
    }
  }

  /**
   * Get current usage for a user
   */
  public getCurrentUsage(userId: string): {
    currentCount: number;
    maxAllowed: number;
    resetTime: number;
    remainingTime: number;
  } {
    const now = Date.now();
    const key = `${userId}:${Math.floor(now / (60 * 60 * 1000))}`;
    const entry = this.rateLimitData.get(key);

    if (!entry || entry.resetTime < now) {
      return {
        currentCount: 0,
        maxAllowed: this.config.maxSharesPerHour,
        resetTime: now + this.config.windowSizeHours * 60 * 60 * 1000,
        remainingTime: this.config.windowSizeHours * 60 * 60 * 1000,
      };
    }

    return {
      currentCount: entry.count,
      maxAllowed: this.config.maxSharesPerHour,
      resetTime: entry.resetTime,
      remainingTime: entry.resetTime - now,
    };
  }

  /**
   * Admin function to reset limits for a user
   */
  public resetUserLimits(userId: string): void {
    const now = Date.now();
    const currentHourKey = `${userId}:${Math.floor(now / (60 * 60 * 1000))}`;
    this.rateLimitData.delete(currentHourKey);
  }

  /**
   * Admin function to update rate limit configuration
   */
  public updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  public getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  /**
   * Get statistics for admin dashboard
   */
  public getStatistics(): {
    totalActiveUsers: number;
    averageUsagePerUser: number;
    highUsageUsers: Array<{ userId: string; count: number; resetTime: number }>;
  } {
    const now = Date.now();
    const activeEntries = Array.from(this.rateLimitData.values()).filter(
      (entry) => entry.resetTime > now,
    );

    const totalCount = activeEntries.reduce((sum, entry) => sum + entry.count, 0);
    const averageUsage = activeEntries.length > 0 ? totalCount / activeEntries.length : 0;

    const highUsageUsers = activeEntries
      .filter((entry) => entry.count >= this.config.maxSharesPerHour * 0.8) // 80% of limit
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalActiveUsers: activeEntries.length,
      averageUsagePerUser: Math.round(averageUsage * 100) / 100,
      highUsageUsers,
    };
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000,
    ); // Every 5 minutes
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.rateLimitData.entries()) {
      if (entry.resetTime < now) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => {
      this.rateLimitData.delete(key);
    });

    // Log cleanup if there were expired entries
    if (expiredKeys.length > 0) {
      console.log(`[RateLimitService] Cleaned up ${expiredKeys.length} expired rate limit entries`);
    }
  }

  /**
   * Destroy the service and cleanup resources
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.rateLimitData.clear();
  }
}

// Export singleton instance
export const rateLimitService = RateLimitService.getInstance();

// Export types for use in other modules
export type { RateLimitConfig };
