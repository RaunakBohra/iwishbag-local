/**
 * Smart Management Service
 * 
 * Provides comprehensive CRUD operations for managing smart product intelligence
 * system including HSN codes, country settings, and system configurations.
 */

import { supabase } from '@/integrations/supabase/client';
import { ProductClassification, CountryConfig } from './ProductIntelligenceService';

export interface SmartSystemStats {
  totalCountries: number;
  countriesWithData: number;
  totalClassifications: number;
  classificationsByCountry: Record<string, number>;
  recentActivity: {
    date: string;
    action: string;
    details: string;
  }[];
}

export interface ProductClassificationForm {
  classification_code: string;
  country_code: string;
  product_name: string;
  category: string;
  subcategory?: string;
  description?: string;
  typical_weight_kg?: number;
  customs_rate?: number;
  minimum_valuation_usd?: number;
  confidence_score: number;
  search_keywords?: string[];
  country_data?: Record<string, any>;
}

export interface CountryConfigForm {
  country_code: string;
  country_name: string;
  classification_system: 'HSN' | 'HS' | 'HTS';
  classification_digits: number;
  default_customs_rate: number;
  default_local_tax_rate: number;
  local_tax_name: string;
  enable_weight_estimation: boolean;
  enable_category_suggestions: boolean;
  enable_customs_valuation_override: boolean;
}

export interface BulkImportResult {
  success: boolean;
  imported: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  skipped: number;
}

class SmartManagementService {
  /**
   * Get system overview statistics
   */
  async getSystemStats(): Promise<SmartSystemStats> {
    try {
      // Get country statistics
      const { data: countryStats, error: countryError } = await supabase
        .rpc('get_smart_system_stats');
      
      if (countryError) throw countryError;

      // Get recent activity (simplified for now)
      const recentActivity = [
        {
          date: new Date().toISOString(),
          action: 'System Check',
          details: 'Smart intelligence system operational'
        }
      ];

      return {
        totalCountries: countryStats?.total_countries || 0,
        countriesWithData: countryStats?.countries_with_data || 0,
        totalClassifications: countryStats?.total_classifications || 0,
        classificationsByCountry: countryStats?.by_country || {},
        recentActivity
      };
    } catch (error) {
      console.error('Error fetching system stats:', error);
      throw error;
    }
  }

  /**
   * Get all product classifications with filtering
   */
  async getProductClassifications(filters?: {
    country_code?: string;
    category?: string;
    search?: string;
    min_confidence?: number;
  }): Promise<ProductClassification[]> {
    try {
      let query = supabase
        .from('product_classifications')
        .select('*')
        .eq('is_active', true)
        .order('country_code')
        .order('classification_code');

      if (filters?.country_code) {
        query = query.eq('country_code', filters.country_code);
      }

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.search) {
        query = query.or(`product_name.ilike.%${filters.search}%,classification_code.ilike.%${filters.search}%`);
      }

      if (filters?.min_confidence) {
        query = query.gte('confidence_score', filters.min_confidence);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching product classifications:', error);
      throw error;
    }
  }

  /**
   * Create new product classification
   */
  async createProductClassification(classification: ProductClassificationForm): Promise<ProductClassification> {
    try {
      const { data, error } = await supabase
        .from('product_classifications')
        .insert({
          ...classification,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating product classification:', error);
      throw error;
    }
  }

  /**
   * Update existing product classification
   */
  async updateProductClassification(id: string, updates: Partial<ProductClassificationForm>): Promise<ProductClassification> {
    try {
      const { data, error } = await supabase
        .from('product_classifications')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating product classification:', error);
      throw error;
    }
  }

  /**
   * Delete product classification (soft delete)
   */
  async deleteProductClassification(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('product_classifications')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting product classification:', error);
      throw error;
    }
  }

  /**
   * Bulk delete product classifications
   */
  async bulkDeleteClassifications(ids: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('product_classifications')
        .update({ is_active: false })
        .in('id', ids);

      if (error) throw error;
    } catch (error) {
      console.error('Error bulk deleting classifications:', error);
      throw error;
    }
  }

  /**
   * Get all country configurations
   */
  async getCountryConfigs(): Promise<CountryConfig[]> {
    try {
      const { data, error } = await supabase
        .from('country_configs')
        .select('*')
        .order('country_code');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching country configs:', error);
      throw error;
    }
  }

  /**
   * Update country configuration
   */
  async updateCountryConfig(countryCode: string, updates: Partial<CountryConfigForm>): Promise<CountryConfig> {
    try {
      const { data, error } = await supabase
        .from('country_configs')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('country_code', countryCode)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating country config:', error);
      throw error;
    }
  }

  /**
   * Create new country configuration
   */
  async createCountryConfig(config: CountryConfigForm): Promise<CountryConfig> {
    try {
      const { data, error } = await supabase
        .from('country_configs')
        .insert({
          ...config,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating country config:', error);
      throw error;
    }
  }

  /**
   * Validate HSN/HS/HTS code format by country
   */
  validateClassificationCode(code: string, countryCode: string, digits: number): { valid: boolean; message?: string } {
    if (!code) {
      return { valid: false, message: 'Classification code is required' };
    }

    // Remove spaces and validate format
    const cleanCode = code.replace(/\s/g, '');
    
    if (!/^\d+$/.test(cleanCode)) {
      return { valid: false, message: 'Classification code must contain only digits' };
    }

    if (cleanCode.length !== digits) {
      return { valid: false, message: `${countryCode} requires ${digits}-digit codes` };
    }

    return { valid: true };
  }

  /**
   * Import classifications from CSV data
   */
  async importClassificationsFromCSV(csvData: any[], countryCode: string): Promise<BulkImportResult> {
    const result: BulkImportResult = {
      success: false,
      imported: 0,
      errors: [],
      skipped: 0
    };

    try {
      // Get country config for validation
      const { data: countryConfig } = await supabase
        .from('country_configs')
        .select('*')
        .eq('country_code', countryCode)
        .single();

      if (!countryConfig) {
        throw new Error(`Country ${countryCode} not configured`);
      }

      const validRows: ProductClassificationForm[] = [];

      // Validate each row
      csvData.forEach((row, index) => {
        const validation = this.validateClassificationCode(
          row.classification_code, 
          countryCode, 
          countryConfig.classification_digits
        );

        if (!validation.valid) {
          result.errors.push({
            row: index + 1,
            field: 'classification_code',
            message: validation.message || 'Invalid code'
          });
          return;
        }

        if (!row.product_name || !row.category) {
          result.errors.push({
            row: index + 1,
            field: 'required_fields',
            message: 'Product name and category are required'
          });
          return;
        }

        validRows.push({
          classification_code: row.classification_code,
          country_code: countryCode,
          product_name: row.product_name,
          category: row.category,
          subcategory: row.subcategory,
          description: row.description,
          typical_weight_kg: parseFloat(row.typical_weight_kg) || undefined,
          customs_rate: parseFloat(row.customs_rate) || countryConfig.default_customs_rate,
          minimum_valuation_usd: parseFloat(row.minimum_valuation_usd) || undefined,
          confidence_score: parseFloat(row.confidence_score) || 0.8,
          search_keywords: row.search_keywords ? row.search_keywords.split(',').map((k: string) => k.trim()) : []
        });
      });

      // Insert valid rows
      if (validRows.length > 0) {
        const { data, error } = await supabase
          .from('product_classifications')
          .insert(validRows.map(row => ({
            ...row,
            created_by: supabase.auth.getUser().then(u => u.data.user?.id)
          })))
          .select();

        if (error) throw error;
        result.imported = data?.length || 0;
      }

      result.skipped = csvData.length - validRows.length - result.errors.length;
      result.success = result.errors.length === 0;

      return result;
    } catch (error) {
      console.error('Error importing CSV:', error);
      throw error;
    }
  }

  /**
   * Export classifications to CSV format
   */
  async exportClassifications(countryCode?: string): Promise<string> {
    try {
      const classifications = await this.getProductClassifications(
        countryCode ? { country_code: countryCode } : undefined
      );

      // Convert to CSV format
      const headers = [
        'classification_code',
        'country_code', 
        'product_name',
        'category',
        'subcategory',
        'description',
        'typical_weight_kg',
        'customs_rate',
        'minimum_valuation_usd',
        'confidence_score',
        'search_keywords'
      ];

      const csvRows = [
        headers.join(','),
        ...classifications.map(item => [
          item.classification_code,
          item.country_code,
          `"${item.product_name}"`,
          item.category,
          item.subcategory || '',
          `"${item.description || ''}"`,
          item.typical_weight_kg || '',
          item.customs_rate || '',
          item.minimum_valuation_usd || '',
          item.confidence_score,
          `"${item.search_keywords?.join(', ') || ''}"`
        ].join(','))
      ];

      return csvRows.join('\n');
    } catch (error) {
      console.error('Error exporting classifications:', error);
      throw error;
    }
  }

  /**
   * Get available categories across all classifications
   */
  async getAvailableCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('product_classifications')
        .select('category')
        .eq('is_active', true);

      if (error) throw error;
      
      const categories = [...new Set(data?.map(item => item.category) || [])];
      return categories.sort();
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }
}

export const smartManagementService = new SmartManagementService();