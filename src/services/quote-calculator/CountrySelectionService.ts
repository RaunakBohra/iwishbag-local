/**
 * Country Selection Service
 * Handles country/region selection logic, currency management, and geographic data
 * Decomposed from QuoteCalculatorV2 for better separation of concerns
 */

import { logger } from '@/utils/logger';
import { currencyService } from '@/services/CurrencyService';
import { usePurchaseCountries } from '@/hooks/usePurchaseCountries';
import { useCountryUnit } from '@/hooks/useCountryUnits';
import { formatCountryDisplay, sortCountriesByPopularity } from '@/utils/countryUtils';

export interface CountryInfo {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  weightUnit: 'kg' | 'lbs';
  popular: boolean;
}

export interface StateRegion {
  code: string;
  name: string;
  type: 'state' | 'province' | 'region';
}

export interface AddressRequirements {
  requiresPincode: boolean;
  requiresState: boolean;
  requiresDistrict: boolean;
  pincodePattern?: RegExp;
  pincodeLength?: number;
  additionalFields?: string[];
}

export interface CurrencyConversion {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  lastUpdated: Date;
}

export interface GeographicContext {
  originCountry: string;
  destinationCountry: string;
  shippingDistance: 'domestic' | 'regional' | 'international';
  timeZoneDifference: number;
  tradingRelationship: 'high' | 'medium' | 'low';
}

export class CountrySelectionService {
  private cache = new Map<string, any>();
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour
  
  // Country mapping with enhanced information
  private readonly COUNTRY_DATA: Record<string, {
    name: string;
    currency: string;
    currencySymbol: string;
    weightUnit: 'kg' | 'lbs';
    popular: boolean;
    addressRequirements: AddressRequirements;
    timeZone: string;
    regions?: StateRegion[];
  }> = {
    'US': {
      name: 'United States',
      currency: 'USD',
      currencySymbol: '$',
      weightUnit: 'lbs',
      popular: true,
      timeZone: 'America/New_York',
      addressRequirements: {
        requiresPincode: true,
        requiresState: true,
        requiresDistrict: false,
        pincodePattern: /^\d{5}(-\d{4})?$/,
        pincodeLength: 5
      },
      regions: [
        { code: 'AL', name: 'Alabama', type: 'state' },
        { code: 'CA', name: 'California', type: 'state' },
        { code: 'NY', name: 'New York', type: 'state' },
        { code: 'TX', name: 'Texas', type: 'state' },
        // Add more as needed
      ]
    },
    'IN': {
      name: 'India',
      currency: 'INR',
      currencySymbol: '₹',
      weightUnit: 'kg',
      popular: true,
      timeZone: 'Asia/Kolkata',
      addressRequirements: {
        requiresPincode: true,
        requiresState: true,
        requiresDistrict: false,
        pincodePattern: /^\d{6}$/,
        pincodeLength: 6
      },
      regions: [
        { code: 'DL', name: 'Delhi', type: 'state' },
        { code: 'MH', name: 'Maharashtra', type: 'state' },
        { code: 'KA', name: 'Karnataka', type: 'state' },
        { code: 'TN', name: 'Tamil Nadu', type: 'state' },
        // Add more as needed
      ]
    },
    'NP': {
      name: 'Nepal',
      currency: 'NPR',
      currencySymbol: 'Rs',
      weightUnit: 'kg',
      popular: true,
      timeZone: 'Asia/Kathmandu',
      addressRequirements: {
        requiresPincode: false,
        requiresState: true,
        requiresDistrict: true,
        additionalFields: ['ward', 'municipality']
      },
      regions: [
        { code: 'P1', name: 'Province 1', type: 'province' },
        { code: 'P2', name: 'Madhesh Province', type: 'province' },
        { code: 'P3', name: 'Bagmati Province', type: 'province' },
        // Add more as needed
      ]
    },
    'GB': {
      name: 'United Kingdom',
      currency: 'GBP',
      currencySymbol: '£',
      weightUnit: 'kg',
      popular: true,
      timeZone: 'Europe/London',
      addressRequirements: {
        requiresPincode: true,
        requiresState: false,
        requiresDistrict: false,
        pincodePattern: /^[A-Z]{1,2}[0-9]{1,2}[A-Z]?\s?[0-9][A-Z]{2}$/,
      }
    },
    'CA': {
      name: 'Canada',
      currency: 'CAD',
      currencySymbol: 'C$',
      weightUnit: 'kg',
      popular: true,
      timeZone: 'America/Toronto',
      addressRequirements: {
        requiresPincode: true,
        requiresState: true,
        requiresDistrict: false,
        pincodePattern: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/,
      }
    },
    'AU': {
      name: 'Australia',
      currency: 'AUD',
      currencySymbol: 'A$',
      weightUnit: 'kg',
      popular: true,
      timeZone: 'Australia/Sydney',
      addressRequirements: {
        requiresPincode: true,
        requiresState: true,
        requiresDistrict: false,
        pincodePattern: /^\d{4}$/,
        pincodeLength: 4
      }
    },
    'CN': {
      name: 'China',
      currency: 'CNY',
      currencySymbol: '¥',
      weightUnit: 'kg',
      popular: true,
      timeZone: 'Asia/Shanghai',
      addressRequirements: {
        requiresPincode: true,
        requiresState: true,
        requiresDistrict: true,
        pincodePattern: /^\d{6}$/,
        pincodeLength: 6
      }
    },
    'BD': {
      name: 'Bangladesh',
      currency: 'BDT',
      currencySymbol: '৳',
      weightUnit: 'kg',
      popular: true,
      timeZone: 'Asia/Dhaka',
      addressRequirements: {
        requiresPincode: true,
        requiresState: true,
        requiresDistrict: true,
        pincodePattern: /^\d{4}$/,
        pincodeLength: 4
      }
    },
    // Add more countries as needed
  };

  // Popular country ordering for better UX
  private readonly POPULAR_COUNTRIES = ['US', 'IN', 'NP', 'BD', 'CN', 'GB', 'CA', 'AU'];

  constructor() {
    logger.info('CountrySelectionService initialized');
  }

  /**
   * Get all available countries sorted by popularity
   */
  async getAvailableCountries(): Promise<CountryInfo[]> {
    const cacheKey = 'available_countries';
    const cached = this.getFromCache<CountryInfo[]>(cacheKey);
    if (cached) return cached;

    try {
      const countries: CountryInfo[] = [];
      
      // First add popular countries in order
      for (const code of this.POPULAR_COUNTRIES) {
        const countryData = this.COUNTRY_DATA[code];
        if (countryData) {
          countries.push({
            code,
            name: countryData.name,
            currency: countryData.currency,
            currencySymbol: countryData.currencySymbol,
            weightUnit: countryData.weightUnit,
            popular: true
          });
        }
      }

      // Add remaining countries
      for (const [code, data] of Object.entries(this.COUNTRY_DATA)) {
        if (!this.POPULAR_COUNTRIES.includes(code)) {
          countries.push({
            code,
            name: data.name,
            currency: data.currency,
            currencySymbol: data.currencySymbol,
            weightUnit: data.weightUnit,
            popular: false
          });
        }
      }

      this.setCache(cacheKey, countries);
      return countries;

    } catch (error) {
      logger.error('Failed to get available countries:', error);
      return this.getDefaultCountries();
    }
  }

  /**
   * Get country information by code
   */
  getCountryInfo(countryCode: string): CountryInfo | null {
    const countryData = this.COUNTRY_DATA[countryCode];
    if (!countryData) return null;

    return {
      code: countryCode,
      name: countryData.name,
      currency: countryData.currency,
      currencySymbol: countryData.currencySymbol,
      weightUnit: countryData.weightUnit,
      popular: countryData.popular
    };
  }

  /**
   * Get address requirements for a country
   */
  getAddressRequirements(countryCode: string): AddressRequirements {
    const countryData = this.COUNTRY_DATA[countryCode];
    return countryData?.addressRequirements || {
      requiresPincode: false,
      requiresState: false,
      requiresDistrict: false
    };
  }

  /**
   * Get states/regions for a country
   */
  getCountryRegions(countryCode: string): StateRegion[] {
    const countryData = this.COUNTRY_DATA[countryCode];
    return countryData?.regions || [];
  }

  /**
   * Validate address format for country
   */
  validateAddress(countryCode: string, address: {
    line1: string;
    city: string;
    state?: string;
    pincode?: string;
    district?: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const requirements = this.getAddressRequirements(countryCode);

    // Basic validations
    if (!address.line1?.trim()) {
      errors.push('Address line 1 is required');
    }

    if (!address.city?.trim()) {
      errors.push('City is required');
    }

    // State validation
    if (requirements.requiresState && !address.state?.trim()) {
      errors.push('State/Province is required');
    }

    // Pincode validation
    if (requirements.requiresPincode) {
      if (!address.pincode?.trim()) {
        errors.push('Postal/PIN code is required');
      } else if (requirements.pincodePattern && !requirements.pincodePattern.test(address.pincode)) {
        errors.push('Invalid postal/PIN code format');
      } else if (requirements.pincodeLength && address.pincode.length !== requirements.pincodeLength) {
        errors.push(`Postal/PIN code must be ${requirements.pincodeLength} digits`);
      }
    }

    // District validation
    if (requirements.requiresDistrict && !address.district?.trim()) {
      errors.push('District is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get customer currency for country
   */
  async getCustomerCurrency(countryCode: string): Promise<string> {
    const cacheKey = `currency_${countryCode}`;
    const cached = this.getFromCache<string>(cacheKey);
    if (cached) return cached;

    try {
      // First try our static data
      const countryData = this.COUNTRY_DATA[countryCode];
      if (countryData) {
        this.setCache(cacheKey, countryData.currency);
        return countryData.currency;
      }

      // Fallback to currency service
      const currency = await currencyService.getCurrency(countryCode);
      this.setCache(cacheKey, currency);
      return currency;

    } catch (error) {
      logger.error('Failed to get customer currency:', error);
      return 'USD'; // Ultimate fallback
    }
  }

  /**
   * Get currency symbol for country
   */
  getCurrencySymbol(countryCode: string): string {
    const countryData = this.COUNTRY_DATA[countryCode];
    if (countryData) {
      return countryData.currencySymbol;
    }
    
    // Fallback to currency service
    return currencyService.getCurrencySymbolSync(this.getCountryInfo(countryCode)?.currency || 'USD');
  }

  /**
   * Get weight unit for country
   */
  getWeightUnit(countryCode: string): 'kg' | 'lbs' {
    const countryData = this.COUNTRY_DATA[countryCode];
    return countryData?.weightUnit || 'kg';
  }

  /**
   * Get geographic context between origin and destination
   */
  getGeographicContext(originCountry: string, destinationCountry: string): GeographicContext {
    // Determine shipping distance
    let shippingDistance: 'domestic' | 'regional' | 'international' = 'international';
    
    if (originCountry === destinationCountry) {
      shippingDistance = 'domestic';
    } else {
      // Define regional groupings
      const regions = {
        northAmerica: ['US', 'CA', 'MX'],
        southAsia: ['IN', 'NP', 'BD', 'LK', 'PK'],
        europe: ['GB', 'DE', 'FR', 'IT', 'ES'],
        eastAsia: ['CN', 'JP', 'KR'],
        oceania: ['AU', 'NZ']
      };

      for (const regionCountries of Object.values(regions)) {
        if (regionCountries.includes(originCountry) && regionCountries.includes(destinationCountry)) {
          shippingDistance = 'regional';
          break;
        }
      }
    }

    // Determine trading relationship strength
    let tradingRelationship: 'high' | 'medium' | 'low' = 'medium';
    
    const strongTradingPairs = [
      ['US', 'CA'], ['US', 'MX'], ['US', 'CN'], ['US', 'GB'],
      ['IN', 'NP'], ['IN', 'BD'], ['CN', 'HK'], ['GB', 'IE']
    ];
    
    if (strongTradingPairs.some(pair => 
      (pair.includes(originCountry) && pair.includes(destinationCountry))
    )) {
      tradingRelationship = 'high';
    }

    return {
      originCountry,
      destinationCountry,
      shippingDistance,
      timeZoneDifference: this.calculateTimeZoneDifference(originCountry, destinationCountry),
      tradingRelationship
    };
  }

  /**
   * Get currency conversion rate
   */
  async getCurrencyConversion(fromCurrency: string, toCurrency: string): Promise<CurrencyConversion | null> {
    if (fromCurrency === toCurrency) {
      return {
        fromCurrency,
        toCurrency,
        rate: 1,
        lastUpdated: new Date()
      };
    }

    const cacheKey = `conversion_${fromCurrency}_${toCurrency}`;
    const cached = this.getFromCache<CurrencyConversion>(cacheKey);
    if (cached) return cached;

    try {
      const rate = await currencyService.getExchangeRateByCurrency(fromCurrency, toCurrency);
      const conversion: CurrencyConversion = {
        fromCurrency,
        toCurrency,
        rate,
        lastUpdated: new Date()
      };

      this.setCache(cacheKey, conversion, 5 * 60 * 1000); // Cache for 5 minutes
      return conversion;

    } catch (error) {
      logger.error('Failed to get currency conversion:', error);
      return null;
    }
  }

  /**
   * Format currency amount with proper symbol and locale
   */
  formatCurrency(amount: number, countryCode: string, currencyCode?: string): string {
    const currency = currencyCode || this.getCountryInfo(countryCode)?.currency || 'USD';
    const symbol = this.getCurrencySymbol(countryCode);
    
    try {
      // Use Intl.NumberFormat for proper localization
      const locale = this.getCountryLocale(countryCode);
      const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      
      return formatter.format(amount);
      
    } catch (error) {
      // Fallback to simple formatting
      return `${symbol}${amount.toFixed(2)}`;
    }
  }

  /**
   * Get country name from code
   */
  getCountryName(countryCode: string): string {
    const countryData = this.COUNTRY_DATA[countryCode];
    return countryData?.name || countryCode;
  }

  /**
   * Check if country supports specific shipping method
   */
  supportsShippingMethod(countryCode: string, method: string): boolean {
    const supportMatrix: Record<string, string[]> = {
      'IN': ['delhivery', 'standard', 'express'],
      'NP': ['ncm', 'standard'],
      'US': ['usps', 'fedex', 'ups', 'standard', 'express'],
      'GB': ['royal_mail', 'dpd', 'standard', 'express'],
      'CA': ['canada_post', 'standard', 'express'],
      'AU': ['australia_post', 'standard', 'express']
    };

    return supportMatrix[countryCode]?.includes(method) || false;
  }

  /**
   * Get recommended shipping methods for country pair
   */
  getRecommendedShippingMethods(originCountry: string, destinationCountry: string): string[] {
    const context = this.getGeographicContext(originCountry, destinationCountry);
    
    if (context.shippingDistance === 'domestic') {
      return ['standard', 'express', 'same_day'];
    } else if (context.shippingDistance === 'regional') {
      return ['standard', 'express'];
    } else {
      return ['standard', 'express', 'economy'];
    }
  }

  /**
   * Private helper methods
   */
  private getDefaultCountries(): CountryInfo[] {
    return [
      { code: 'US', name: 'United States', currency: 'USD', currencySymbol: '$', weightUnit: 'lbs', popular: true },
      { code: 'IN', name: 'India', currency: 'INR', currencySymbol: '₹', weightUnit: 'kg', popular: true },
      { code: 'NP', name: 'Nepal', currency: 'NPR', currencySymbol: 'Rs', weightUnit: 'kg', popular: true }
    ];
  }

  private calculateTimeZoneDifference(originCountry: string, destinationCountry: string): number {
    const originTz = this.COUNTRY_DATA[originCountry]?.timeZone || 'UTC';
    const destTz = this.COUNTRY_DATA[destinationCountry]?.timeZone || 'UTC';
    
    try {
      const now = new Date();
      const originDate = new Date(now.toLocaleString('en-US', { timeZone: originTz }));
      const destDate = new Date(now.toLocaleString('en-US', { timeZone: destTz }));
      
      return Math.round((destDate.getTime() - originDate.getTime()) / (1000 * 60 * 60));
    } catch (error) {
      return 0;
    }
  }

  private getCountryLocale(countryCode: string): string {
    const localeMap: Record<string, string> = {
      'US': 'en-US',
      'IN': 'en-IN',
      'NP': 'ne-NP',
      'GB': 'en-GB',
      'CA': 'en-CA',
      'AU': 'en-AU',
      'CN': 'zh-CN',
      'BD': 'bn-BD'
    };
    
    return localeMap[countryCode] || 'en-US';
  }

  /**
   * Cache management
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache<T>(key: string, data: T, duration?: number): void {
    this.cache.set(key, { 
      data, 
      timestamp: Date.now(),
      duration: duration || this.CACHE_DURATION
    });
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.cache.clear();
    logger.info('CountrySelectionService disposed');
  }
}

export default CountrySelectionService;