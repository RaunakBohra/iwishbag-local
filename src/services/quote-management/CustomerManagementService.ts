/**
 * Customer Management Service
 * Handles customer data operations, address management, and validation
 * Extracted from QuoteCalculatorV2 for clean customer data handling
 * 
 * RESPONSIBILITIES:
 * - Customer profile management
 * - Address validation and formatting
 * - Phone number normalization
 * - Email validation and management
 * - Customer data persistence
 * - Address autocomplete and geocoding
 * - Customer communication preferences
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerData {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  country: string;
  created_at?: string;
  updated_at?: string;
}

export interface DeliveryAddress {
  id?: string;
  customer_id?: string;
  recipient_name?: string;
  phone?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  landmark?: string;
  instructions?: string;
  address_type?: 'home' | 'office' | 'other';
  is_default?: boolean;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  validation_status?: 'pending' | 'validated' | 'failed';
  formatted_address?: string;
}

export interface CustomerValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: {
    correctedEmail?: string;
    normalizedPhone?: string;
    addressSuggestions?: DeliveryAddress[];
  };
}

export interface CustomerLookupResult {
  customer?: CustomerData;
  addresses: DeliveryAddress[];
  recentQuotes: number;
  totalValue: number;
  preferredCurrency: string;
}

export class CustomerManagementService {
  private static instance: CustomerManagementService;
  private customerCache = new Map<string, { data: CustomerData; timestamp: number }>();
  private addressCache = new Map<string, { addresses: DeliveryAddress[]; timestamp: number }>();
  private readonly cacheTTL = 15 * 60 * 1000; // 15 minutes

  constructor() {
    logger.info('CustomerManagementService initialized');
  }

  static getInstance(): CustomerManagementService {
    if (!CustomerManagementService.instance) {
      CustomerManagementService.instance = new CustomerManagementService();
    }
    return CustomerManagementService.instance;
  }

  /**
   * Validate customer data comprehensively
   */
  validateCustomerData(customerData: Partial<CustomerData>, deliveryAddress?: Partial<DeliveryAddress>): CustomerValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: any = {};

    // Validate required fields
    if (!customerData.name?.trim()) {
      errors.push('Customer name is required');
    } else if (customerData.name.trim().length < 2) {
      errors.push('Customer name must be at least 2 characters');
    }

    if (!customerData.email?.trim()) {
      errors.push('Customer email is required');
    } else {
      const emailValidation = this.validateEmail(customerData.email);
      if (!emailValidation.isValid) {
        errors.push(emailValidation.error!);
      } else if (emailValidation.suggestion) {
        suggestions.correctedEmail = emailValidation.suggestion;
        warnings.push(`Did you mean: ${emailValidation.suggestion}?`);
      }
    }

    if (!customerData.country?.trim()) {
      errors.push('Customer country is required');
    }

    // Validate phone number if provided
    if (customerData.phone?.trim()) {
      const phoneValidation = this.validatePhone(customerData.phone, customerData.country || 'US');
      if (!phoneValidation.isValid) {
        warnings.push(phoneValidation.error!);
      } else if (phoneValidation.normalized) {
        suggestions.normalizedPhone = phoneValidation.normalized;
      }
    }

    // Validate delivery address if provided
    if (deliveryAddress) {
      const addressValidation = this.validateAddress(deliveryAddress);
      if (!addressValidation.isValid) {
        errors.push(...addressValidation.errors.map(err => `Address: ${err}`));
      }
      if (addressValidation.warnings.length > 0) {
        warnings.push(...addressValidation.warnings.map(warn => `Address: ${warn}`));
      }
      if (addressValidation.suggestions?.addressSuggestions) {
        suggestions.addressSuggestions = addressValidation.suggestions.addressSuggestions;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions: Object.keys(suggestions).length > 0 ? suggestions : undefined
    };
  }

  /**
   * Lookup or create customer with comprehensive data
   */
  async lookupOrCreateCustomer(
    email: string, 
    customerData?: Partial<CustomerData>
  ): Promise<CustomerLookupResult> {
    try {
      // Check cache first
      const cacheKey = email.toLowerCase().trim();
      const cached = this.customerCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        const addresses = await this.getCustomerAddresses(cached.data.id!);
        return {
          customer: cached.data,
          addresses,
          recentQuotes: 0, // Would be calculated
          totalValue: 0, // Would be calculated
          preferredCurrency: 'USD' // Would be from customer preferences
        };
      }

      // Lookup existing customer
      const { data: existingCustomer } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      let customer: CustomerData;

      if (existingCustomer) {
        // Update existing customer if new data provided
        if (customerData) {
          const updateData = this.prepareCustomerUpdate(customerData);
          const { data: updatedCustomer } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', existingCustomer.id)
            .select()
            .single();

          customer = this.mapProfileToCustomer(updatedCustomer || existingCustomer);
        } else {
          customer = this.mapProfileToCustomer(existingCustomer);
        }
      } else {
        // Create new customer
        if (!customerData?.name) {
          throw new Error('Customer name is required for new customers');
        }

        const newCustomerData = {
          email: email.toLowerCase().trim(),
          full_name: customerData.name,
          phone: customerData.phone,
          country: customerData.country || 'US',
          created_at: new Date().toISOString()
        };

        const { data: newCustomer, error } = await supabase
          .from('profiles')
          .insert(newCustomerData)
          .select()
          .single();

        if (error) throw error;
        customer = this.mapProfileToCustomer(newCustomer);
      }

      // Cache the customer data
      this.customerCache.set(cacheKey, {
        data: customer,
        timestamp: Date.now()
      });

      // Get customer addresses
      const addresses = await this.getCustomerAddresses(customer.id!);

      // Get customer statistics (simplified for now)
      const stats = await this.getCustomerStatistics(customer.id!);

      return {
        customer,
        addresses,
        recentQuotes: stats.recentQuotes,
        totalValue: stats.totalValue,
        preferredCurrency: stats.preferredCurrency
      };

    } catch (error) {
      logger.error('Customer lookup/creation failed:', error);
      throw error;
    }
  }

  /**
   * Save or update delivery address with validation
   */
  async saveDeliveryAddress(
    customerId: string,
    addressData: Partial<DeliveryAddress>,
    setAsDefault: boolean = false
  ): Promise<DeliveryAddress> {
    try {
      // Validate address data
      const validation = this.validateAddress(addressData);
      if (!validation.isValid) {
        throw new Error(`Invalid address: ${validation.errors.join(', ')}`);
      }

      // Prepare address data for saving
      const addressToSave = {
        customer_id: customerId,
        recipient_name: addressData.recipient_name?.trim(),
        phone: addressData.phone?.trim(),
        address_line_1: addressData.address_line_1?.trim(),
        address_line_2: addressData.address_line_2?.trim() || null,
        city: addressData.city?.trim(),
        state: addressData.state?.trim() || null,
        postal_code: addressData.postal_code?.trim(),
        country: addressData.country?.trim(),
        landmark: addressData.landmark?.trim() || null,
        instructions: addressData.instructions?.trim() || null,
        address_type: addressData.address_type || 'home',
        is_default: setAsDefault,
        validation_status: 'validated' as const
      };

      // If setting as default, unset other defaults first
      if (setAsDefault) {
        await supabase
          .from('delivery_addresses')
          .update({ is_default: false })
          .eq('customer_id', customerId);
      }

      let savedAddress;

      if (addressData.id) {
        // Update existing address
        const { data, error } = await supabase
          .from('delivery_addresses')
          .update(addressToSave)
          .eq('id', addressData.id)
          .eq('customer_id', customerId)
          .select()
          .single();

        if (error) throw error;
        savedAddress = data;
      } else {
        // Create new address
        const { data, error } = await supabase
          .from('delivery_addresses')
          .insert(addressToSave)
          .select()
          .single();

        if (error) throw error;
        savedAddress = data;
      }

      // Clear address cache for this customer
      this.addressCache.delete(customerId);

      // Try to geocode the address for better delivery estimation
      try {
        const coordinates = await this.geocodeAddress(savedAddress);
        if (coordinates) {
          await supabase
            .from('delivery_addresses')
            .update({ 
              coordinates: JSON.stringify(coordinates),
              formatted_address: this.formatAddressDisplay(savedAddress)
            })
            .eq('id', savedAddress.id);
            
          savedAddress.coordinates = coordinates;
          savedAddress.formatted_address = this.formatAddressDisplay(savedAddress);
        }
      } catch (geocodeError) {
        logger.warn('Geocoding failed for address:', geocodeError);
      }

      logger.info(`Delivery address ${addressData.id ? 'updated' : 'created'} for customer ${customerId}`);
      return savedAddress;

    } catch (error) {
      logger.error('Failed to save delivery address:', error);
      throw error;
    }
  }

  /**
   * Get customer addresses with caching
   */
  async getCustomerAddresses(customerId: string): Promise<DeliveryAddress[]> {
    try {
      // Check cache first
      const cached = this.addressCache.get(customerId);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.addresses;
      }

      const { data: addresses, error } = await supabase
        .from('delivery_addresses')
        .select('*')
        .eq('customer_id', customerId)
        .order('is_default', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const processedAddresses = (addresses || []).map(addr => ({
        ...addr,
        coordinates: addr.coordinates ? JSON.parse(addr.coordinates) : undefined
      }));

      // Cache the addresses
      this.addressCache.set(customerId, {
        addresses: processedAddresses,
        timestamp: Date.now()
      });

      return processedAddresses;

    } catch (error) {
      logger.error('Failed to get customer addresses:', error);
      return [];
    }
  }

  /**
   * Format customer name for display
   */
  formatCustomerName(customer: CustomerData): string {
    if (!customer.name) return 'Unknown Customer';
    
    return customer.name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Format address for display
   */
  formatAddressDisplay(address: DeliveryAddress, compact: boolean = false): string {
    if (!address) return 'No address provided';

    const parts = [];
    
    if (address.recipient_name && !compact) {
      parts.push(address.recipient_name);
    }
    
    parts.push(address.address_line_1);
    
    if (address.address_line_2) {
      parts.push(address.address_line_2);
    }
    
    const cityLine = [
      address.city,
      address.state,
      address.postal_code
    ].filter(Boolean).join(', ');
    
    if (cityLine) {
      parts.push(cityLine);
    }
    
    if (address.country && !compact) {
      parts.push(this.getCountryName(address.country));
    }

    return compact ? parts.slice(0, 2).join(', ') : parts.join('\n');
  }

  /**
   * Private helper methods
   */
  private validateEmail(email: string): { isValid: boolean; error?: string; suggestion?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = email.trim().toLowerCase();

    if (!emailRegex.test(trimmedEmail)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }

    // Check for common typos
    const commonDomainTypos: Record<string, string> = {
      'gmai.com': 'gmail.com',
      'gmial.com': 'gmail.com',
      'yahooo.com': 'yahoo.com',
      'hotmial.com': 'hotmail.com',
      'outlok.com': 'outlook.com'
    };

    const domain = trimmedEmail.split('@')[1];
    if (commonDomainTypos[domain]) {
      const suggestion = trimmedEmail.replace(domain, commonDomainTypos[domain]);
      return { isValid: true, suggestion };
    }

    return { isValid: true };
  }

  private validatePhone(phone: string, country: string): { isValid: boolean; error?: string; normalized?: string } {
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Basic validation by country
    const countryPatterns: Record<string, { pattern: RegExp; format: (phone: string) => string }> = {
      'US': {
        pattern: /^\+?1?[2-9]\d{2}[2-9]\d{2}\d{4}$/,
        format: (phone: string) => {
          const digits = phone.replace(/\D/g, '');
          const number = digits.startsWith('1') ? digits.slice(1) : digits;
          return `+1 (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
        }
      },
      'IN': {
        pattern: /^\+?91?[6-9]\d{9}$/,
        format: (phone: string) => {
          const digits = phone.replace(/\D/g, '');
          const number = digits.startsWith('91') ? digits.slice(2) : digits;
          return `+91 ${number.slice(0, 5)}-${number.slice(5)}`;
        }
      }
    };

    const pattern = countryPatterns[country];
    if (!pattern) {
      // Generic validation for other countries
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        return { isValid: false, error: 'Phone number should be 10-15 digits' };
      }
      return { isValid: true, normalized: `+${cleanPhone}` };
    }

    if (!pattern.pattern.test(cleanPhone)) {
      return { isValid: false, error: `Invalid phone number format for ${country}` };
    }

    return {
      isValid: true,
      normalized: pattern.format(cleanPhone)
    };
  }

  private validateAddress(address: Partial<DeliveryAddress>): CustomerValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!address.address_line_1?.trim()) {
      errors.push('Address line 1 is required');
    }

    if (!address.city?.trim()) {
      errors.push('City is required');
    }

    if (!address.postal_code?.trim()) {
      errors.push('Postal code is required');
    } else {
      // Basic postal code validation by country
      const postalValidation = this.validatePostalCode(address.postal_code, address.country || 'US');
      if (!postalValidation.isValid) {
        warnings.push(postalValidation.error!);
      }
    }

    if (!address.country?.trim()) {
      errors.push('Country is required');
    }

    // Optional recipient validation
    if (address.recipient_name && address.recipient_name.trim().length < 2) {
      warnings.push('Recipient name seems too short');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validatePostalCode(postalCode: string, country: string): { isValid: boolean; error?: string } {
    const patterns: Record<string, RegExp> = {
      'US': /^\d{5}(-\d{4})?$/,
      'IN': /^\d{6}$/,
      'GB': /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
      'CA': /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i
    };

    const pattern = patterns[country];
    if (pattern && !pattern.test(postalCode.trim())) {
      return {
        isValid: false,
        error: `Invalid postal code format for ${country}`
      };
    }

    return { isValid: true };
  }

  private async geocodeAddress(address: DeliveryAddress): Promise<{ latitude: number; longitude: number } | null> {
    // This would integrate with a geocoding service
    // For now, return null to indicate geocoding is not available
    return null;
  }

  private async getCustomerStatistics(customerId: string): Promise<{
    recentQuotes: number;
    totalValue: number;
    preferredCurrency: string;
  }> {
    try {
      // This would query quotes and orders for statistics
      // Simplified implementation for now
      const { data: quotes } = await supabase
        .from('quotes_v2')
        .select('total_quote_origincurrency, customer_currency')
        .eq('customer_id', customerId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      return {
        recentQuotes: quotes?.length || 0,
        totalValue: quotes?.reduce((sum, q) => sum + (q.total_quote_origincurrency || 0), 0) || 0,
        preferredCurrency: quotes?.[0]?.customer_currency || 'USD'
      };
    } catch (error) {
      logger.error('Failed to get customer statistics:', error);
      return {
        recentQuotes: 0,
        totalValue: 0,
        preferredCurrency: 'USD'
      };
    }
  }

  private mapProfileToCustomer(profile: any): CustomerData {
    return {
      id: profile.id,
      name: profile.full_name || profile.name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      country: profile.country || 'US',
      created_at: profile.created_at,
      updated_at: profile.updated_at
    };
  }

  private prepareCustomerUpdate(customerData: Partial<CustomerData>): any {
    const updateData: any = {};

    if (customerData.name) updateData.full_name = customerData.name.trim();
    if (customerData.phone) updateData.phone = customerData.phone.trim();
    if (customerData.country) updateData.country = customerData.country.trim();

    updateData.updated_at = new Date().toISOString();
    return updateData;
  }

  private getCountryName(countryCode: string): string {
    const countryNames: Record<string, string> = {
      'US': 'United States',
      'IN': 'India',
      'NP': 'Nepal',
      'BD': 'Bangladesh',
      'LK': 'Sri Lanka',
      'PK': 'Pakistan',
      'CN': 'China',
      'GB': 'United Kingdom',
      'CA': 'Canada',
      'AU': 'Australia',
      'DE': 'Germany',
      'FR': 'France',
      'JP': 'Japan',
      'KR': 'South Korea',
      'SG': 'Singapore',
      'TH': 'Thailand',
      'MY': 'Malaysia',
      'ID': 'Indonesia',
      'PH': 'Philippines',
      'VN': 'Vietnam'
    };
    
    return countryNames[countryCode] || countryCode;
  }

  /**
   * Public utility methods
   */
  clearCustomerCache(): void {
    this.customerCache.clear();
    this.addressCache.clear();
    logger.info('Customer cache cleared');
  }

  getCacheStats(): { customerCacheSize: number; addressCacheSize: number } {
    return {
      customerCacheSize: this.customerCache.size,
      addressCacheSize: this.addressCache.size
    };
  }

  dispose(): void {
    this.customerCache.clear();
    this.addressCache.clear();
    logger.info('CustomerManagementService disposed');
  }
}

export default CustomerManagementService;