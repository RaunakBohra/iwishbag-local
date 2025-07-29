import { DeliveryProvider, ProviderConfig } from './types';
import { NCMProvider } from './providers/NCMProvider';
// Import other providers as you add them
// import { DelhiveryProvider } from './providers/DelhiveryProvider';
// import { FedExProvider } from './providers/FedExProvider';
// import { DHLProvider } from './providers/DHLProvider';

export class DeliveryProviderRegistry {
  private static instance: DeliveryProviderRegistry;
  private providers: Map<string, DeliveryProvider> = new Map();
  private providerConstructors: Map<string, new (config: any) => DeliveryProvider> = new Map();

  private constructor() {
    // Register all available providers
    this.registerProviderType('NCM', NCMProvider);
    // this.registerProviderType('DELHIVERY', DelhiveryProvider);
    // this.registerProviderType('FEDEX', FedExProvider);
    // this.registerProviderType('DHL', DHLProvider);
  }

  static getInstance(): DeliveryProviderRegistry {
    if (!DeliveryProviderRegistry.instance) {
      DeliveryProviderRegistry.instance = new DeliveryProviderRegistry();
    }
    return DeliveryProviderRegistry.instance;
  }

  registerProviderType(code: string, providerClass: new (config: any) => DeliveryProvider) {
    this.providerConstructors.set(code, providerClass);
  }

  async initializeProvider(config: ProviderConfig): Promise<void> {
    const ProviderClass = this.providerConstructors.get(config.code);
    if (!ProviderClass) {
      throw new Error(`Unknown provider type: ${config.code}`);
    }

    if (!config.settings.enabled) {
      this.providers.delete(config.code);
      return;
    }

    const provider = new ProviderClass(config);
    this.providers.set(config.code, provider);
  }

  getProvider(code: string): DeliveryProvider | undefined {
    return this.providers.get(code);
  }

  getProvidersForCountry(countryCode: string): DeliveryProvider[] {
    return Array.from(this.providers.values()).filter(provider =>
      provider.supportedCountries.includes(countryCode)
    );
  }

  getAllProviders(): DeliveryProvider[] {
    return Array.from(this.providers.values());
  }

  // Get best provider based on criteria
  async getBestProvider(
    from: any,
    to: any,
    criteria: {
      preferredProvider?: string;
      maxCost?: number;
      maxDays?: number;
      requiresCOD?: boolean;
      requiresTracking?: boolean;
    } = {}
  ): Promise<DeliveryProvider | null> {
    const countryProviders = this.getProvidersForCountry(to.country);
    
    if (countryProviders.length === 0) return null;

    // If preferred provider is specified and available, use it
    if (criteria.preferredProvider) {
      const preferred = countryProviders.find(p => p.code === criteria.preferredProvider);
      if (preferred) {
        const serviceable = await preferred.checkServiceability(from, to);
        if (serviceable) return preferred;
      }
    }

    // Filter by capabilities
    let eligibleProviders = countryProviders;

    if (criteria.requiresCOD) {
      eligibleProviders = eligibleProviders.filter(p => p.capabilities.cashOnDelivery);
    }

    if (criteria.requiresTracking) {
      eligibleProviders = eligibleProviders.filter(p => p.capabilities.realTimeTracking);
    }

    // Check serviceability for remaining providers
    const serviceabilityChecks = await Promise.allSettled(
      eligibleProviders.map(async provider => ({
        provider,
        serviceable: await provider.checkServiceability(from, to)
      }))
    );

    const serviceableProviders = serviceabilityChecks
      .filter(result => result.status === 'fulfilled' && result.value.serviceable)
      .map(result => (result as PromiseFulfilledResult<any>).value.provider);

    if (serviceableProviders.length === 0) return null;

    // If we need to compare rates
    if (criteria.maxCost !== undefined || criteria.maxDays !== undefined) {
      const ratePromises = serviceableProviders.map(async provider => ({
        provider,
        rates: await provider.calculateRates(from, to, 1) // Default 1kg
      }));

      const rateResults = await Promise.allSettled(ratePromises);
      const successfulRates = rateResults
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value);

      // Filter by criteria and sort by cost
      const validOptions = successfulRates
        .filter(({ rates }) => {
          const lowestRate = rates[0]; // Assuming rates are sorted
          if (criteria.maxCost && lowestRate.amount > criteria.maxCost) return false;
          if (criteria.maxDays && lowestRate.estimatedDays > criteria.maxDays) return false;
          return true;
        })
        .sort((a, b) => a.rates[0].amount - b.rates[0].amount);

      return validOptions[0]?.provider || null;
    }

    // Return first serviceable provider
    return serviceableProviders[0];
  }
}