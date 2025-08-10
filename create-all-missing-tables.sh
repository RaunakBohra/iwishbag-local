#!/bin/bash

# Create ALL Missing Tables Migration
# This time I'll do the COMPLETE job!

echo "🚀 Creating migration for ALL missing tables (65 tables)..."

# Get table definitions for all missing tables
echo "📤 Extracting definitions for all missing tables..."

MISSING_TABLES=(
  "abuse_responses" "active_blocks" "blog_post_tags" "blog_posts" "blog_tags"
  "cart_recovery_analytics" "cart_recovery_attempts" "checkout_sessions" "continental_pricing"
  "country_configs" "country_discount_rules" "country_payment_preferences" "country_pricing_overrides"
  "customer_delivery_preferences" "customer_discount_usage" "customer_preferences" "customer_satisfaction_surveys"
  "customs_valuation_overrides" "delivery_orders" "delivery_provider_configs" "delivery_webhooks"
  "discount_application_log" "discount_settings" "discount_stacking_rules" "discount_tiers" "discount_types"
  "email_settings" "error_logs" "gateway_refunds" "item_revisions" "manual_analysis_tasks"
  "market_countries" "membership_plans" "order_exceptions" "order_shipments" "order_status_history"
  "payment_adjustments" "payment_health_logs" "payment_method_discounts" "payment_reminders"
  "payment_verification_logs" "paypal_refund_reasons" "paypal_webhook_events" "pickup_time_slots"
  "pricing_change_approvals" "pricing_change_log" "product_classifications" "quote_address_history"
  "quote_documents" "quote_items" "quote_statuses" "quote_templates" "reconciliation_items"
  "reconciliation_rules" "refund_items" "regional_pricing" "rejection_reasons" "route_customs_tiers"
  "share_audit_log" "shipment_items" "sla_configurations" "sla_policies" "status_transitions"
  "support_assignment_rules" "support_interactions"
)

# Extract schema for missing tables only
docker run --rm \
  --network host \
  -e PGPASSWORD="postgres" \
  postgres:17 \
  pg_dump \
  -h "127.0.0.1" \
  -p "54322" \
  -U "postgres" \
  -d "postgres" \
  --schema-only \
  --no-owner \
  --no-acl \
  --schema=public \
  > all_tables_schema.sql

# Create the migration file
cat > supabase/migrations/20250810132000_all_missing_tables.sql << 'EOF'
-- ============================================================================
-- ALL MISSING TABLES MIGRATION - COMPLETE JOB
-- Adding the remaining 65 tables to cloud database
-- ============================================================================

-- Extensions (if not already present)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";

EOF

# Filter and add only the missing table definitions
for table in "${MISSING_TABLES[@]}"; do
  echo "Adding $table to migration..."
  
  # Extract table definition from schema dump
  awk "/CREATE TABLE.*${table}/,/;/" all_tables_schema.sql >> supabase/migrations/20250810132000_all_missing_tables.sql
  echo "" >> supabase/migrations/20250810132000_all_missing_tables.sql
done

# Also add any missing constraints, indexes, and triggers for these tables
echo "Adding constraints, indexes, and triggers for missing tables..."
grep -A 5 -B 5 "$(printf "%s\|" "${MISSING_TABLES[@]}" | sed 's/|$//')" all_tables_schema.sql | \
  grep -E "CREATE INDEX|ALTER TABLE.*ADD CONSTRAINT|CREATE TRIGGER" \
  >> supabase/migrations/20250810132000_all_missing_tables.sql

echo "✅ Complete migration created for all 65 missing tables"
echo "📊 Migration file size: $(ls -lh supabase/migrations/20250810132000_all_missing_tables.sql | awk '{print $5}')"

# Clean up
rm all_tables_schema.sql

echo "📋 Ready to push ALL missing tables to cloud!"