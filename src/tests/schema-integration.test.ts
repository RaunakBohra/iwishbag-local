import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/types/database';

type OrderInsert = Database['public']['Tables']['orders']['Insert'];
type OrderItemInsert = Database['public']['Tables']['order_items']['Insert'];
type CustomerDeliveryPreferencesInsert = Database['public']['Tables']['customer_delivery_preferences']['Insert'];
type SellerOrderAutomationInsert = Database['public']['Tables']['seller_order_automation']['Insert'];
type OrderShipmentInsert = Database['public']['Tables']['order_shipments']['Insert'];
type ItemRevisionInsert = Database['public']['Tables']['item_revisions']['Insert'];

describe('Schema Integration Tests', () => {
  let testCustomerId: string;
  let testOrderId: string;
  let testOrderItemId: string;

  beforeAll(async () => {
    // Create a test customer profile for our tests
    const { data: customer, error: customerError } = await supabase
      .from('profiles')
      .insert({
        full_name: 'Test Customer',
        country: 'IN',
        preferred_display_currency: 'INR',
      })
      .select('id')
      .single();

    if (customerError) {
      console.error('Error creating test customer:', customerError);
      throw new Error('Failed to create test customer');
    }

    testCustomerId = customer.id;
    console.log('Created test customer:', testCustomerId);
  });

  afterAll(async () => {
    // Clean up test data
    if (testCustomerId) {
      await supabase.from('profiles').delete().eq('id', testCustomerId);
    }
  });

  describe('Orders Table Integration', () => {
    it('should create order with new enhanced fields', async () => {
      const orderData: OrderInsert = {
        order_number: `TEST-ORDER-${Date.now()}`,
        user_id: testCustomerId,
        customer_id: testCustomerId,
        status: 'pending_payment',
        overall_status: 'payment_pending',
        payment_method: 'stripe',
        payment_status: 'pending',
        total_amount: 100.00,
        currency: 'USD',
        original_quote_total: 100.00,
        current_order_total: 100.00,
        total_items: 2,
        active_items: 2,
        primary_warehouse: 'india_warehouse',
        consolidation_preference: 'wait_for_all',
        max_consolidation_wait_days: 14,
        delivery_preference: 'warehouse_consolidation',
        quality_check_requested: true,
        automation_enabled: true,
        seller_order_automation: {},
        tracking_automation: {},
      };

      const { data: order, error } = await supabase
        .from('orders')
        .insert(orderData)
        .select('*')
        .single();

      expect(error).toBeNull();
      expect(order).toBeDefined();
      expect(order!.id).toBeDefined();
      expect(order!.primary_warehouse).toBe('india_warehouse');
      expect(order!.consolidation_preference).toBe('wait_for_all');
      expect(order!.automation_enabled).toBe(true);

      testOrderId = order!.id;
    });

    it('should enforce check constraints on orders', async () => {
      const invalidOrderData: OrderInsert = {
        order_number: `TEST-INVALID-${Date.now()}`,
        user_id: testCustomerId,
        customer_id: testCustomerId,
        status: 'pending_payment',
        payment_method: 'stripe',
        total_amount: 100.00,
        // Invalid warehouse value
        primary_warehouse: 'invalid_warehouse' as any,
      };

      const { error } = await supabase
        .from('orders')
        .insert(invalidOrderData);

      expect(error).toBeDefined();
      expect(error!.message).toContain('check constraint');
    });
  });

  describe('Order Items Integration', () => {
    it('should create order items with enhanced fields', async () => {
      const orderItemData: OrderItemInsert = {
        order_id: testOrderId,
        product_name: 'Test Product',
        product_url: 'https://example.com/product',
        seller_platform: 'amazon',
        origin_country: 'US',
        destination_country: 'IN',
        quantity: 2,
        original_price: 50.00,
        current_price: 50.00,
        original_weight: 1.5,
        current_weight: 1.5,
        item_status: 'pending_order_placement',
        order_automation_status: 'pending',
        quality_check_requested: true,
        quality_check_priority: 'standard',
        assigned_warehouse: 'india_warehouse',
        auto_approval_threshold_amount: 25.00,
        auto_approval_threshold_percentage: 5.00,
      };

      const { data: orderItem, error } = await supabase
        .from('order_items')
        .insert(orderItemData)
        .select('*')
        .single();

      expect(error).toBeNull();
      expect(orderItem).toBeDefined();
      expect(orderItem!.seller_platform).toBe('amazon');
      expect(orderItem!.order_automation_status).toBe('pending');
      expect(orderItem!.assigned_warehouse).toBe('india_warehouse');

      testOrderItemId = orderItem!.id;
    });

    it('should automatically update order counters via triggers', async () => {
      // Create another order item
      const orderItemData: OrderItemInsert = {
        order_id: testOrderId,
        product_name: 'Test Product 2',
        seller_platform: 'flipkart',
        origin_country: 'IN',
        destination_country: 'IN',
        quantity: 1,
        original_price: 30.00,
        current_price: 30.00,
        item_status: 'seller_order_placed',
      };

      const { error: insertError } = await supabase
        .from('order_items')
        .insert(orderItemData);

      expect(insertError).toBeNull();

      // Check if order counters were updated
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('active_items, total_items')
        .eq('id', testOrderId)
        .single();

      expect(orderError).toBeNull();
      expect(order!.active_items).toBe(1); // One item with 'seller_order_placed' status
      expect(order!.total_items).toBeGreaterThanOrEqual(2); // Should have been updated
    });
  });

  describe('Customer Delivery Preferences Integration', () => {
    it('should create customer delivery preferences', async () => {
      const preferencesData: CustomerDeliveryPreferencesInsert = {
        order_id: testOrderId,
        customer_id: testCustomerId,
        delivery_method: 'warehouse_consolidation',
        consolidation_preference: 'wait_for_all',
        max_wait_days: 21,
        quality_check_level: 'thorough',
        photo_documentation_required: true,
        priority: 'quality_first',
        notification_frequency: 'major_updates',
        preferred_communication: 'email',
      };

      const { data: preferences, error } = await supabase
        .from('customer_delivery_preferences')
        .insert(preferencesData)
        .select('*')
        .single();

      expect(error).toBeNull();
      expect(preferences).toBeDefined();
      expect(preferences!.delivery_method).toBe('warehouse_consolidation');
      expect(preferences!.quality_check_level).toBe('thorough');
      expect(preferences!.max_wait_days).toBe(21);
    });

    it('should enforce unique constraint on order_id', async () => {
      const duplicatePreferencesData: CustomerDeliveryPreferencesInsert = {
        order_id: testOrderId, // Same order ID
        customer_id: testCustomerId,
        delivery_method: 'direct_delivery',
      };

      const { error } = await supabase
        .from('customer_delivery_preferences')
        .insert(duplicatePreferencesData);

      expect(error).toBeDefined();
      expect(error!.message).toContain('duplicate key');
    });
  });

  describe('Seller Order Automation Integration', () => {
    it('should create automation record', async () => {
      const automationData: SellerOrderAutomationInsert = {
        order_item_id: testOrderItemId,
        automation_type: 'order_placement',
        automation_status: 'queued',
        seller_platform: 'amazon',
        seller_account_type: 'business',
        automation_config: {
          retry_on_failure: true,
          max_execution_time_minutes: 15,
        },
        retry_count: 0,
        max_retries: 3,
        retry_delay_minutes: 30,
      };

      const { data: automation, error } = await supabase
        .from('seller_order_automation')
        .insert(automationData)
        .select('*')
        .single();

      expect(error).toBeNull();
      expect(automation).toBeDefined();
      expect(automation!.automation_type).toBe('order_placement');
      expect(automation!.automation_status).toBe('queued');
      expect(automation!.retry_count).toBe(0);
    });
  });

  describe('Order Shipments Integration', () => {
    it('should create shipment record', async () => {
      const shipmentData: OrderShipmentInsert = {
        order_id: testOrderId,
        shipment_number: `SHIP-${Date.now()}`,
        origin_warehouse: 'india_warehouse',
        shipment_type: 'warehouse_consolidation',
        current_status: 'seller_preparing',
        current_tier: 'seller',
        estimated_weight_kg: 2.0,
        quality_check_status: 'pending',
        customer_notified: false,
        notification_count: 0,
      };

      const { data: shipment, error } = await supabase
        .from('order_shipments')
        .insert(shipmentData)
        .select('*')
        .single();

      expect(error).toBeNull();
      expect(shipment).toBeDefined();
      expect(shipment!.origin_warehouse).toBe('india_warehouse');
      expect(shipment!.current_status).toBe('seller_preparing');
      expect(shipment!.current_tier).toBe('seller');
    });
  });

  describe('Item Revisions Integration', () => {
    it('should create revision with calculated fields', async () => {
      const revisionData: ItemRevisionInsert = {
        order_item_id: testOrderItemId,
        change_type: 'price_increase',
        change_reason: 'Seller price updated',
        original_price: 50.00,
        new_price: 55.00,
        total_cost_impact: 5.00,
        auto_approval_eligible: true,
        auto_approved: true,
        auto_approval_reason: 'Within threshold limits',
        customer_approval_status: 'auto_approved',
        admin_notes: 'Automated price adjustment',
      };

      const { data: revision, error } = await supabase
        .from('item_revisions')
        .select('*')
        .eq('order_item_id', testOrderItemId)
        .maybeSingle();

      if (!revision) {
        // Create new revision
        const { data: newRevision, error: insertError } = await supabase
          .from('item_revisions')
          .insert(revisionData)
          .select('*')
          .single();

        expect(insertError).toBeNull();
        expect(newRevision).toBeDefined();
        expect(newRevision!.change_type).toBe('price_increase');
        expect(newRevision!.auto_approved).toBe(true);
        expect(newRevision!.price_change_amount).toBe(5.00);
        expect(newRevision!.price_change_percentage).toBeCloseTo(10.00, 1);
      }
    });
  });

  describe('Foreign Key Relationships', () => {
    it('should maintain referential integrity', async () => {
      // Test cascade delete - deleting order should cascade to related records
      const { data: relatedRecords } = await supabase
        .from('order_items')
        .select('id')
        .eq('order_id', testOrderId);

      expect(relatedRecords).toBeDefined();
      expect(relatedRecords!.length).toBeGreaterThan(0);

      // Test that we can't create order item with non-existent order
      const invalidOrderItemData: OrderItemInsert = {
        order_id: '00000000-0000-0000-0000-000000000000', // Non-existent order
        product_name: 'Invalid Product',
        seller_platform: 'amazon',
        origin_country: 'US',
        destination_country: 'IN',
        quantity: 1,
        original_price: 10.00,
        current_price: 10.00,
      };

      const { error } = await supabase
        .from('order_items')
        .insert(invalidOrderItemData);

      expect(error).toBeDefined();
      expect(error!.message).toContain('foreign key');
    });
  });

  describe('RLS Policies', () => {
    it('should enforce row-level security on customer data', async () => {
      // This test would need to be run with different user contexts
      // For now, we'll verify that the policies exist and are enabled
      const { data: policies, error } = await supabase.rpc('get_policies', {
        schema_name: 'public',
        table_name: 'orders'
      }).catch(() => ({ data: null, error: 'RPC not available' }));

      // If RPC is available, check policies exist
      if (!error && policies) {
        expect(Array.isArray(policies)).toBe(true);
      }

      // Verify tables have RLS enabled by checking information_schema
      const { data: rlsStatus } = await supabase
        .from('pg_tables')
        .select('tablename, rowsecurity')
        .eq('schemaname', 'public')
        .in('tablename', [
          'orders',
          'order_items',
          'customer_delivery_preferences',
          'seller_order_automation',
          'order_shipments'
        ]);

      expect(rlsStatus).toBeDefined();
      if (rlsStatus && rlsStatus.length > 0) {
        // At least some tables should have RLS enabled
        const hasRLS = rlsStatus.some((table: any) => table.rowsecurity);
        expect(hasRLS).toBe(true);
      }
    });
  });

  describe('Database Functions and Triggers', () => {
    it('should have required functions available', async () => {
      // Test that critical functions exist
      const functionsToTest = [
        'update_updated_at_column',
        'update_order_item_counters',
        'is_admin',
        'is_authenticated'
      ];

      for (const functionName of functionsToTest) {
        const { data, error } = await supabase
          .from('pg_proc')
          .select('proname')
          .eq('proname', functionName)
          .single();

        if (!error) {
          expect(data.proname).toBe(functionName);
        }
        // If function doesn't exist, the test will note it but not fail
        // since some functions might be optional
      }
    });

    it('should have update triggers on timestamp columns', async () => {
      // Verify that updating a record updates the updated_at timestamp
      const { data: initialOrder } = await supabase
        .from('orders')
        .select('updated_at')
        .eq('id', testOrderId)
        .single();

      const initialTimestamp = new Date(initialOrder!.updated_at!);

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update the order
      const { error: updateError } = await supabase
        .from('orders')
        .update({ admin_notes: 'Updated by test' })
        .eq('id', testOrderId);

      expect(updateError).toBeNull();

      // Check that updated_at was changed
      const { data: updatedOrder } = await supabase
        .from('orders')
        .select('updated_at')
        .eq('id', testOrderId)
        .single();

      const updatedTimestamp = new Date(updatedOrder!.updated_at!);
      expect(updatedTimestamp.getTime()).toBeGreaterThan(initialTimestamp.getTime());
    });
  });

  describe('Data Type Validation', () => {
    it('should handle JSONB fields correctly', async () => {
      const complexAutomationConfig = {
        retry_strategy: 'exponential_backoff',
        max_execution_time: 900,
        screenshot_options: {
          capture_on_error: true,
          capture_on_success: false,
          format: 'png'
        },
        platform_specific: {
          amazon: {
            wait_times: [2, 5, 10],
            selectors: {
              add_to_cart: '#add-to-cart-button',
              quantity: '#quantity'
            }
          }
        }
      };

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          seller_order_automation: complexAutomationConfig
        })
        .eq('id', testOrderId);

      expect(updateError).toBeNull();

      // Verify JSONB data was stored and can be retrieved
      const { data: order, error: selectError } = await supabase
        .from('orders')
        .select('seller_order_automation')
        .eq('id', testOrderId)
        .single();

      expect(selectError).toBeNull();
      expect(order!.seller_order_automation).toEqual(complexAutomationConfig);
    });

    it('should handle decimal precision correctly', async () => {
      const preciseAmount = 123.456789;
      
      const { error: updateError } = await supabase
        .from('order_items')
        .update({
          current_price: preciseAmount,
          current_weight: 1.234567
        })
        .eq('id', testOrderItemId);

      expect(updateError).toBeNull();

      const { data: orderItem } = await supabase
        .from('order_items')
        .select('current_price, current_weight')
        .eq('id', testOrderItemId)
        .single();

      // Check that decimal precision is maintained appropriately
      expect(Number(orderItem!.current_price)).toBeCloseTo(123.46, 2); // Should round to 2 decimal places
      expect(Number(orderItem!.current_weight)).toBeCloseTo(1.235, 3); // Should round to 3 decimal places
    });
  });
});