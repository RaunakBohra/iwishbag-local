/**
 * Environment Configuration Service
 * 
 * Centralized service for checking critical environment variables and configuration
 * that are required for different features to function properly.
 */

export interface EnvironmentCheck {
  key: string;
  name: string;
  description: string;
  required: boolean;
  category: 'payment' | 'email' | 'storage' | 'api' | 'security' | 'database';
  present: boolean;
  hasValue: boolean;
}

export interface ConfigurationStatus {
  overall: 'healthy' | 'partial' | 'critical';
  checks: EnvironmentCheck[];
  missingRequired: EnvironmentCheck[];
  missingOptional: EnvironmentCheck[];
  categories: Record<string, { healthy: number; total: number; status: 'healthy' | 'partial' | 'critical' }>;
}

class EnvironmentConfigurationService {
  private static instance: EnvironmentConfigurationService;
  
  // Define all critical environment variables
  private readonly environmentChecks: Omit<EnvironmentCheck, 'present' | 'hasValue'>[] = [
    // Database & Core
    {
      key: 'VITE_SUPABASE_URL',
      name: 'Supabase URL',
      description: 'Database connection URL - Critical for all functionality',
      required: true,
      category: 'database'
    },
    {
      key: 'VITE_SUPABASE_ANON_KEY',
      name: 'Supabase Anonymous Key',
      description: 'Database authentication key - Critical for all functionality',
      required: true,
      category: 'database'
    },

    // Payment Gateways
    {
      key: 'VITE_STRIPE_PUBLISHABLE_KEY',
      name: 'Stripe Publishable Key',
      description: 'Required for international credit card payments via Stripe',
      required: false,
      category: 'payment'
    },
    {
      key: 'VITE_PAYU_MERCHANT_KEY',
      name: 'PayU Merchant Key',
      description: 'Required for payments in India via PayU',
      required: false,
      category: 'payment'
    },
    {
      key: 'VITE_PAYU_SALT',
      name: 'PayU Salt',
      description: 'Security salt for PayU payment hash generation',
      required: false,
      category: 'payment'
    },

    // Email Services
    {
      key: 'VITE_EMAILJS_SERVICE_ID',
      name: 'EmailJS Service ID',
      description: 'Required for sending customer notifications and support emails',
      required: false,
      category: 'email'
    },
    {
      key: 'VITE_EMAILJS_TEMPLATE_ID',
      name: 'EmailJS Template ID',
      description: 'Email template configuration for customer communications',
      required: false,
      category: 'email'
    },
    {
      key: 'VITE_EMAILJS_USER_ID',
      name: 'EmailJS User ID',
      description: 'EmailJS account identifier for email service',
      required: false,
      category: 'email'
    },

    // Storage & CDN
    {
      key: 'VITE_CLOUDINARY_CLOUD_NAME',
      name: 'Cloudinary Cloud Name',
      description: 'Required for image upload and storage functionality',
      required: false,
      category: 'storage'
    },
    {
      key: 'VITE_CLOUDINARY_UPLOAD_PRESET',
      name: 'Cloudinary Upload Preset',
      description: 'Configuration for image upload settings',
      required: false,
      category: 'storage'
    },

    // Security
    {
      key: 'VITE_TURNSTILE_SITE_KEY',
      name: 'Turnstile Site Key',
      description: 'Cloudflare Turnstile for bot protection and security',
      required: false,
      category: 'security'
    },

    // API Keys
    {
      key: 'VITE_EXCHANGE_RATE_API_KEY',
      name: 'Exchange Rate API Key',
      description: 'Required for automatic currency conversion rates',
      required: false,
      category: 'api'
    }
  ];

  public static getInstance(): EnvironmentConfigurationService {
    if (!EnvironmentConfigurationService.instance) {
      EnvironmentConfigurationService.instance = new EnvironmentConfigurationService();
    }
    return EnvironmentConfigurationService.instance;
  }

  /**
   * Check all environment variables and return comprehensive status
   */
  public checkConfiguration(): ConfigurationStatus {
    const checks: EnvironmentCheck[] = this.environmentChecks.map(check => {
      const value = import.meta.env[check.key];
      return {
        ...check,
        present: value !== undefined,
        hasValue: value !== undefined && value !== null && value !== ''
      };
    });

    const missingRequired = checks.filter(check => check.required && !check.hasValue);
    const missingOptional = checks.filter(check => !check.required && !check.hasValue);

    // Calculate category status
    const categories: Record<string, { healthy: number; total: number; status: 'healthy' | 'partial' | 'critical' }> = {};
    
    for (const category of ['payment', 'email', 'storage', 'api', 'security', 'database']) {
      const categoryChecks = checks.filter(check => check.category === category);
      const healthyCount = categoryChecks.filter(check => check.hasValue).length;
      const requiredMissing = categoryChecks.filter(check => check.required && !check.hasValue).length;
      
      let status: 'healthy' | 'partial' | 'critical' = 'healthy';
      if (requiredMissing > 0) {
        status = 'critical';
      } else if (healthyCount < categoryChecks.length) {
        status = 'partial';
      }

      categories[category] = {
        healthy: healthyCount,
        total: categoryChecks.length,
        status
      };
    }

    // Overall status
    let overall: 'healthy' | 'partial' | 'critical' = 'healthy';
    if (missingRequired.length > 0) {
      overall = 'critical';
    } else if (missingOptional.length > 0) {
      overall = 'partial';
    }

    return {
      overall,
      checks,
      missingRequired,
      missingOptional,
      categories
    };
  }

  /**
   * Check if a specific feature is properly configured
   */
  public isFeatureConfigured(feature: 'payments' | 'email' | 'storage' | 'security'): boolean {
    const status = this.checkConfiguration();
    
    switch (feature) {
      case 'payments':
        // At least one payment gateway should be configured
        const paymentChecks = status.checks.filter(check => check.category === 'payment');
        return paymentChecks.some(check => check.hasValue);
      
      case 'email':
        // All EmailJS variables should be present
        const emailChecks = status.checks.filter(check => check.category === 'email');
        return emailChecks.every(check => check.hasValue);
      
      case 'storage':
        // Cloudinary should be configured for file uploads
        const storageChecks = status.checks.filter(check => check.category === 'storage');
        return storageChecks.every(check => check.hasValue);
      
      case 'security':
        // Security features are optional but should be configured in production
        const securityChecks = status.checks.filter(check => check.category === 'security');
        return securityChecks.some(check => check.hasValue);
      
      default:
        return false;
    }
  }

  /**
   * Get missing configuration for a specific category
   */
  public getMissingConfiguration(category?: string): EnvironmentCheck[] {
    const status = this.checkConfiguration();
    let missing = [...status.missingRequired, ...status.missingOptional];
    
    if (category) {
      missing = missing.filter(check => check.category === category);
    }
    
    return missing;
  }

  /**
   * Generate configuration instructions for missing environment variables
   */
  public generateConfigurationInstructions(missing: EnvironmentCheck[]): string {
    if (missing.length === 0) return 'All required configuration is present.';

    const instructions = missing.map(check => {
      return `${check.key}=${check.key.includes('KEY') || check.key.includes('SECRET') ? 'your-api-key-here' : 'your-value-here'}`;
    });

    return `Add these environment variables to your .env file:\n\n${instructions.join('\n')}`;
  }


  /**
   * Check if application is ready for production
   */
  public async isProductionReady(): Promise<{ ready: boolean; blockers: string[] }> {
    const status = this.checkConfiguration();
    const blockers: string[] = [];

    // Critical: Database must be configured
    if (status.missingRequired.length > 0) {
      blockers.push(`Missing required configuration: ${status.missingRequired.map(c => c.name).join(', ')}`);
    }

    // Critical: At least one payment method should be configured
    if (!this.isFeatureConfigured('payments')) {
      blockers.push('No payment gateways configured - customers cannot complete purchases');
    }

    // Warning: Email service should be configured for customer communication
    if (!this.isFeatureConfigured('email')) {
      blockers.push('Email service not configured - automated customer notifications disabled');
    }


    return {
      ready: blockers.length === 0,
      blockers
    };
  }
}

// Export singleton instance
export const environmentConfigService = EnvironmentConfigurationService.getInstance();