/**
 * Environment Configuration Helper
 * Centralizes all environment variable access with validation
 */

interface EnvironmentConfig {
  // Supabase
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey?: string;
  
  // AWS
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion: string;
  
  // Cloudflare
  cloudflareApiToken?: string;
  cloudflareZoneId?: string;
  syncApiKey?: string;
  
  // Third-party APIs
  scraperApiKey?: string;
  brightDataApiKey?: string;
  proxyApiKey?: string;
  
  // Payment Gateways
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  payuMerchantKey?: string;
  payuSaltKey?: string;
  
  // Other
  resendApiKey?: string;
  khaltiSecretKey?: string;
  airwallexApiKey?: string;
}

class EnvironmentConfigService {
  private static instance: EnvironmentConfigService;
  private config: EnvironmentConfig;

  private constructor() {
    this.config = this.loadConfiguration();
    this.validateCriticalConfig();
  }

  static getInstance(): EnvironmentConfigService {
    if (!EnvironmentConfigService.instance) {
      EnvironmentConfigService.instance = new EnvironmentConfigService();
    }
    return EnvironmentConfigService.instance;
  }

  private loadConfiguration(): EnvironmentConfig {
    const isVite = typeof import.meta !== 'undefined' && import.meta.env;
    const env = isVite ? import.meta.env : process.env;

    return {
      // Supabase Configuration
      supabaseUrl: env.VITE_SUPABASE_URL || env.SUPABASE_URL || '',
      supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '',
      supabaseServiceKey: env.VITE_SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_KEY,
      
      // AWS Configuration
      awsAccessKeyId: env.AWS_ACCESS_KEY_ID,
      awsSecretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      awsRegion: env.AWS_REGION || 'us-east-1',
      
      // Cloudflare Configuration
      cloudflareApiToken: env.CLOUDFLARE_API_TOKEN,
      cloudflareZoneId: env.CF_ZONE_ID,
      syncApiKey: env.SYNC_API_KEY,
      
      // Third-party APIs
      scraperApiKey: env.VITE_SCRAPER_API_KEY || env.SCRAPER_API_KEY,
      brightDataApiKey: env.BRIGHTDATA_API_KEY,
      proxyApiKey: env.VITE_PROXY_API_KEY || env.PROXY_API_KEY,
      
      // Payment Gateways
      stripeSecretKey: env.STRIPE_SECRET_KEY,
      stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
      payuMerchantKey: env.PAYU_MERCHANT_KEY,
      payuSaltKey: env.PAYU_SALT_KEY,
      
      // Other Services
      resendApiKey: env.RESEND_API_KEY,
      khaltiSecretKey: env.KHALTI_SECRET_KEY,
      airwallexApiKey: env.AIRWALLEX_API_KEY,
    };
  }

  private validateCriticalConfig(): void {
    const errors: string[] = [];
    
    if (!this.config.supabaseUrl) {
      errors.push('SUPABASE_URL is required');
    }
    
    if (!this.config.supabaseAnonKey) {
      errors.push('SUPABASE_ANON_KEY is required');
    }

    if (errors.length > 0) {
      console.error('❌ Critical environment variables missing:', errors);
      
      if (typeof window !== 'undefined') {
        // Browser environment - show user-friendly error
        console.error('Please check your environment configuration');
      }
    }
  }

  // Getter methods for safe access
  get supabase() {
    return {
      url: this.config.supabaseUrl,
      anonKey: this.config.supabaseAnonKey,
      serviceKey: this.config.supabaseServiceKey,
    };
  }

  get aws() {
    return {
      accessKeyId: this.config.awsAccessKeyId,
      secretAccessKey: this.config.awsSecretAccessKey,
      region: this.config.awsRegion,
    };
  }

  get cloudflare() {
    return {
      apiToken: this.config.cloudflareApiToken,
      zoneId: this.config.cloudflareZoneId,
      syncApiKey: this.config.syncApiKey,
    };
  }

  get apis() {
    return {
      scraper: this.config.scraperApiKey,
      brightData: this.config.brightDataApiKey,
      proxy: this.config.proxyApiKey,
    };
  }

  get payments() {
    return {
      stripe: {
        secretKey: this.config.stripeSecretKey,
        webhookSecret: this.config.stripeWebhookSecret,
      },
      payu: {
        merchantKey: this.config.payuMerchantKey,
        saltKey: this.config.payuSaltKey,
      },
    };
  }

  // Utility methods
  isProduction(): boolean {
    return (import.meta.env?.MODE === 'production') || (process.env.NODE_ENV === 'production');
  }

  isDevelopment(): boolean {
    return !this.isProduction();
  }

  hasFeature(feature: keyof EnvironmentConfig): boolean {
    return !!this.config[feature];
  }

  // Debug helper (only in development)
  debug(): void {
    if (this.isDevelopment()) {
      const safeConfig = { ...this.config };
      
      // Mask sensitive values
      Object.keys(safeConfig).forEach(key => {
        const value = safeConfig[key as keyof EnvironmentConfig];
        if (typeof value === 'string' && value.length > 10) {
          safeConfig[key as keyof EnvironmentConfig] = `${value.slice(0, 4)}...${value.slice(-4)}` as any;
        }
      });
      
      console.log('🔧 Environment Configuration:', safeConfig);
    }
  }
}

export const envConfig = EnvironmentConfigService.getInstance();
export type { EnvironmentConfig };