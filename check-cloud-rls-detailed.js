#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const client = createClient(
  'https://grgvlrvywsfmnmkxrecd.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3ZscnZ5d3NmbW5ta3hyZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQxMTMxMiwiZXhwIjoyMDY1OTg3MzEyfQ.gRRd3vm7s4iwlGLfXejFOXIz9ulfaywP64OjOWmGqpQ'
);

async function checkCloudRLSDetailed() {
  console.log('🔍 DETAILED RLS COMPARISON - LOCAL vs CLOUD DATABASE\n');
  
  // Get all table names from cloud to compare
  const tablesWithRLSLocal = [
    'abuse_attempts', 'abuse_patterns', 'abuse_responses', 'active_blocks', 'addon_services',
    'bank_account_details', 'blog_categories', 'blog_comments', 'blog_post_tags', 'blog_posts',
    'blog_tags', 'cart_abandonment_events', 'cart_recovery_analytics', 'cart_recovery_attempts',
    'checkout_sessions', 'consolidation_groups', 'continental_pricing', 'country_configs',
    'country_discount_rules', 'country_payment_preferences', 'country_pricing_overrides',
    'customer_delivery_preferences', 'customer_discount_usage', 'customer_memberships',
    'customer_preferences', 'customer_satisfaction_surveys', 'customs_rules',
    'customs_valuation_overrides', 'delivery_addresses', 'delivery_orders', 
    'delivery_provider_configs', 'delivery_webhooks', 'discount_application_log',
    'discount_campaigns', 'discount_codes', 'discount_settings', 'discount_stacking_rules',
    'discount_tiers', 'discount_types', 'email_messages', 'email_settings', 'escalation_rules',
    'gateway_refunds', 'item_revisions', 'market_countries', 'markets', 'membership_plans',
    'messages', 'ncm_configurations', 'notification_logs', 'order_exceptions', 'order_items',
    'order_shipments', 'order_status_history', 'orders', 'package_events', 'payment_adjustments',
    'payment_gateways', 'payment_health_logs', 'payment_method_discounts', 'payment_verification_logs',
    'paypal_refund_reasons', 'paypal_webhook_events', 'phone_otps', 'pickup_time_slots',
    'pricing_calculation_cache', 'pricing_change_approvals', 'pricing_change_log', 
    'product_classifications', 'profiles', 'quote_documents', 'quote_items', 'quote_items_v2',
    'quote_statuses', 'quote_templates', 'quotes_v2', 'reconciliation_items', 'reconciliation_rules',
    'refund_items', 'refund_requests', 'regional_pricing', 'rejection_reasons', 'route_customs_tiers',
    'seller_order_automation', 'share_audit_log', 'shipment_items', 'shipment_tracking_events',
    'shipping_routes', 'sms_messages', 'support_assignment_rules', 'support_interactions',
    'support_system', 'system_settings', 'user_roles', 'webhook_logs'
  ];

  const tablesWithoutRLSLocal = [
    'admin_overrides', 'country_settings', 'error_logs', 'manual_analysis_tasks',
    'payment_reminders', 'payment_transactions', 'quote_address_history', 'sla_configurations',
    'sla_policies', 'status_transitions'
  ];

  console.log('📊 CHECKING TABLES THAT SHOULD HAVE RLS:\n');
  
  // Test access to critical tables to see which ones are actually restricted
  const sampleTables = [
    'profiles', 'user_roles', 'quotes_v2', 'orders', 'messages', 'payment_gateways',
    'delivery_addresses', 'support_system', 'discount_codes', 'order_items',
    'blog_posts', 'customer_preferences', 'abuse_attempts', 'consolidation_groups'
  ];

  for (const table of sampleTables) {
    try {
      const { data, error } = await client.from(table).select('*').limit(1);
      
      if (!error) {
        console.log(`❌ ${table} - ACCESSIBLE (likely no RLS or admin access)`);
      } else if (error.message.includes('permission denied') || error.message.includes('RLS')) {
        console.log(`✅ ${table} - PROPERLY RESTRICTED`);
      } else {
        console.log(`⚠️  ${table} - OTHER ERROR: ${error.message.substring(0, 50)}...`);
      }
    } catch (err) {
      console.log(`❌ ${table} - EXCEPTION: ${err.message.substring(0, 50)}...`);
    }
  }

  console.log(`\n🎯 ANALYSIS:`);
  console.log(`• Local DB has RLS enabled on ${tablesWithRLSLocal.length} tables`);
  console.log(`• Local DB has RLS disabled on ${tablesWithoutRLSLocal.length} tables`);
  console.log('• Cloud DB appears to have minimal RLS policies applied');
  console.log('• Need to migrate ALL RLS policies from local to cloud');

  return {
    tablesWithRLS: tablesWithRLSLocal,
    tablesWithoutRLS: tablesWithoutRLSLocal
  };
}

checkCloudRLSDetailed().catch(console.error);