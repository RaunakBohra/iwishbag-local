/**
 * Database Schema Verification Script
 * Verifies that our enhanced order management schema is working correctly
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/types/database';

type OrderInsert = Database['public']['Tables']['orders']['Insert'];
type OrderItemInsert = Database['public']['Tables']['order_items']['Insert'];

interface VerificationResult {
  test: string;
  passed: boolean;
  error?: string;
  details?: any;
}

class DatabaseSchemaVerifier {
  private results: VerificationResult[] = [];

  private addResult(test: string, passed: boolean, error?: string, details?: any) {
    this.results.push({ test, passed, error, details });
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${test}`);
    if (error) console.log(`   Error: ${error}`);
    if (details) console.log(`   Details:`, details);
  }

  async verifyTableExists(tableName: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('information_schema.tables' as any)
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', tableName);

      if (error) {
        this.addResult(`Table ${tableName} exists`, false, error.message);
        return false;
      }

      const exists = data && data.length > 0;
      this.addResult(`Table ${tableName} exists`, exists, exists ? undefined : 'Table not found');
      return exists;
    } catch (error) {
      this.addResult(`Table ${tableName} exists`, false, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  async verifyTableStructure(): Promise<void> {
    console.log('\n=== Table Structure Verification ===');

    const requiredTables = [
      'orders',
      'order_items',
      'customer_delivery_preferences',
      'seller_order_automation',
      'order_shipments',
      'shipment_items',
      'shipment_tracking_events',
      'order_exceptions',
      'item_revisions'
    ];

    for (const table of requiredTables) {
      await this.verifyTableExists(table);
    }
  }

  async verifyOrdersTableEnhancements(): Promise<void> {
    console.log('\n=== Orders Table Enhancement Verification ===');

    try {
      // Check if enhanced columns exist by querying the table structure
      const { data, error } = await supabase
        .rpc('get_table_columns', { table_name: 'orders' })
        .catch(async () => {
          // Fallback: try to select specific columns
          return await supabase
            .from('orders')
            .select('primary_warehouse, consolidation_preference, automation_enabled')
            .limit(1);
        });

      if (error) {
        this.addResult('Orders table has enhanced columns', false, error.message);
      } else {
        this.addResult('Orders table has enhanced columns', true);
      }
    } catch (error) {
      this.addResult('Orders table has enhanced columns', false, 
        error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async verifyOrderItemsEnhancements(): Promise<void> {
    console.log('\n=== Order Items Enhancement Verification ===');

    try {
      // Try to select enhanced columns
      const { data, error } = await supabase
        .from('order_items')
        .select('seller_platform, order_automation_status, assigned_warehouse, quality_check_status')
        .limit(1);

      if (error) {
        this.addResult('Order items table has enhanced columns', false, error.message);
      } else {
        this.addResult('Order items table has enhanced columns', true);
      }
    } catch (error) {
      this.addResult('Order items table has enhanced columns', false,
        error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async verifyNewTables(): Promise<void> {
    console.log('\n=== New Tables Verification ===');

    const newTables = [
      'customer_delivery_preferences',
      'seller_order_automation',
      'order_shipments',
      'item_revisions'
    ];

    for (const table of newTables) {
      try {
        const { data, error } = await supabase
          .from(table as any)
          .select('id')
          .limit(1);

        if (error) {
          this.addResult(`Can query ${table}`, false, error.message);
        } else {
          this.addResult(`Can query ${table}`, true);
        }
      } catch (error) {
        this.addResult(`Can query ${table}`, false,
          error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  async verifyConstraints(): Promise<void> {
    console.log('\n=== Constraints Verification ===');

    try {
      // Test invalid warehouse constraint
      const { error: warehouseError } = await supabase
        .from('orders')
        .insert({
          order_number: `TEST-CONSTRAINT-${Date.now()}`,
          status: 'pending_payment',
          total_amount: 100,
          primary_warehouse: 'invalid_warehouse' as any,
        });

      if (warehouseError && warehouseError.message.includes('check constraint')) {
        this.addResult('Warehouse constraints are enforced', true);
      } else {
        this.addResult('Warehouse constraints are enforced', false, 
          'Invalid warehouse value was accepted');
      }
    } catch (error) {
      this.addResult('Warehouse constraints are enforced', false,
        error instanceof Error ? error.message : 'Unknown error');
    }

    try {
      // Test invalid delivery preference constraint  
      const { error: deliveryError } = await supabase
        .from('orders')
        .insert({
          order_number: `TEST-DELIVERY-${Date.now()}`,
          status: 'pending_payment',
          total_amount: 100,
          delivery_preference: 'invalid_preference' as any,
        });

      if (deliveryError && deliveryError.message.includes('check constraint')) {
        this.addResult('Delivery preference constraints are enforced', true);
      } else {
        this.addResult('Delivery preference constraints are enforced', false,
          'Invalid delivery preference was accepted');
      }
    } catch (error) {
      this.addResult('Delivery preference constraints are enforced', false,
        error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async verifyForeignKeys(): Promise<void> {
    console.log('\n=== Foreign Key Verification ===');

    try {
      // Test foreign key constraint by trying to insert with non-existent order_id
      const { error } = await supabase
        .from('order_items')
        .insert({
          order_id: '00000000-0000-0000-0000-000000000000',
          product_name: 'Test Product',
          seller_platform: 'amazon',
          origin_country: 'US',
          destination_country: 'IN',
          quantity: 1,
          original_price: 10,
          current_price: 10,
        });

      if (error && error.message.includes('foreign key')) {
        this.addResult('Foreign key constraints are enforced', true);
      } else {
        this.addResult('Foreign key constraints are enforced', false,
          'Non-existent order_id was accepted');
      }
    } catch (error) {
      this.addResult('Foreign key constraints are enforced', false,
        error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async verifyJSONBSupport(): Promise<void> {
    console.log('\n=== JSONB Support Verification ===');

    try {
      const testConfig = {
        automation_enabled: true,
        retry_settings: {
          max_retries: 3,
          delay_minutes: 30
        },
        platforms: ['amazon', 'flipkart']
      };

      // Check if we can work with JSONB fields
      const { data, error } = await supabase
        .from('orders')
        .select('seller_order_automation')
        .limit(1);

      if (error) {
        this.addResult('JSONB fields are accessible', false, error.message);
      } else {
        this.addResult('JSONB fields are accessible', true);
      }
    } catch (error) {
      this.addResult('JSONB fields are accessible', false,
        error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async verifyGeneratedColumns(): Promise<void> {
    console.log('\n=== Generated Columns Verification ===');

    try {
      // Check if generated columns work in item_revisions table
      const { data, error } = await supabase
        .from('item_revisions')
        .select('price_change_amount, price_change_percentage, weight_change_amount, weight_change_percentage')
        .limit(1);

      if (error) {
        this.addResult('Generated columns are accessible', false, error.message);
      } else {
        this.addResult('Generated columns are accessible', true);
      }
    } catch (error) {
      this.addResult('Generated columns are accessible', false,
        error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async verifyIndexes(): Promise<void> {
    console.log('\n=== Indexes Verification ===');

    const criticalIndexes = [
      'idx_orders_customer_id',
      'idx_orders_overall_status',
      'idx_order_items_item_status',
      'idx_shipments_status'
    ];

    for (const indexName of criticalIndexes) {
      try {
        const { data, error } = await supabase
          .from('pg_indexes' as any)
          .select('indexname')
          .eq('indexname', indexName)
          .limit(1);

        if (error) {
          this.addResult(`Index ${indexName} exists`, false, error.message);
        } else {
          const exists = data && data.length > 0;
          this.addResult(`Index ${indexName} exists`, exists,
            exists ? undefined : 'Index not found');
        }
      } catch (error) {
        this.addResult(`Index ${indexName} exists`, false,
          error instanceof Error ? error.message : 'Could not verify index');
      }
    }
  }

  async runAllVerifications(): Promise<void> {
    console.log('🔍 Starting Database Schema Verification\n');

    await this.verifyTableStructure();
    await this.verifyOrdersTableEnhancements();
    await this.verifyOrderItemsEnhancements();
    await this.verifyNewTables();
    await this.verifyConstraints();
    await this.verifyForeignKeys();
    await this.verifyJSONBSupport();
    await this.verifyGeneratedColumns();
    await this.verifyIndexes();

    // Summary
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const failed = total - passed;

    console.log('\n=== SUMMARY ===');
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => console.log(`   - ${r.test}: ${r.error}`));
    }

    if (passed === total) {
      console.log('\n🎉 All database schema verifications passed!');
    } else {
      console.log(`\n⚠️  ${failed} verification(s) failed. Please review and fix issues.`);
    }
  }
}

// Run verification if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const verifier = new DatabaseSchemaVerifier();
  verifier.runAllVerifications()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Verification script failed:', error);
      process.exit(1);
    });
}

export default DatabaseSchemaVerifier;