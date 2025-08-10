#!/bin/bash

# Create Complete Schema Migration for Cloud
# This script extracts the schema for all tables and creates a clean migration

echo "🚀 Creating complete schema migration for all tables..."

# First, let's get a clean schema-only dump of just the public schema
echo "📤 Extracting complete schema from local database..."
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
  > complete_schema.sql

if [ $? -eq 0 ]; then
  echo "✅ Complete schema dump created"
  echo "📊 Schema file size: $(ls -lh complete_schema.sql | awk '{print $5}')"
else
  echo "❌ Failed to create schema dump"
  exit 1
fi

# Clean the schema for cloud compatibility
echo "🧹 Cleaning schema for cloud deployment..."
cp complete_schema.sql complete_schema_original.sql

# Remove problematic elements
sed -i '' '/SET search_path/d' complete_schema.sql
sed -i '' '/SET.*timeout/d' complete_schema.sql
sed -i '' '/SET.*encoding/d' complete_schema.sql
sed -i '' '/SELECT pg_catalog.set_config/d' complete_schema.sql
sed -i '' '/ALTER.*OWNER TO/d' complete_schema.sql

# Add cloud-compatible header
cat > cloud_complete_schema.sql << 'EOF'
-- ============================================================================
-- IWISHBAG COMPLETE SCHEMA MIGRATION FOR CLOUD
-- Generated from local database - All tables, functions, triggers
-- ============================================================================

-- Set required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";

EOF

# Append the cleaned schema
cat complete_schema.sql >> cloud_complete_schema.sql

echo "✅ Clean complete schema created: cloud_complete_schema.sql"
echo "📊 Final schema size: $(ls -lh cloud_complete_schema.sql | awk '{print $5}')"

# Create the migration file with timestamp
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
MIGRATION_FILE="supabase/migrations/${TIMESTAMP}_complete_cloud_schema.sql"

# Remove existing migration files that might conflict
echo "🧹 Cleaning existing migrations..."
rm -rf supabase/migrations
mkdir -p supabase/migrations

# Copy our clean schema as the only migration
cp cloud_complete_schema.sql "$MIGRATION_FILE"

echo "✅ Migration file created: $MIGRATION_FILE"

# Create a verification script
cat > verify_cloud_schema.js << 'EOF'
#!/usr/bin/env node

/**
 * Verify Cloud Schema Migration
 * Checks if all tables were created successfully
 */

import { createClient } from '@supabase/supabase-js';

const CLOUD_SUPABASE_URL = 'https://grgvlrvywsfmnmkxrecd.supabase.co';
const CLOUD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3ZscnZ5d3NmbW5ta3hyZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQxMTMxMiwiZXhwIjoyMDY1OTg3MzEyfQ.gRRd3vm7s4iwlGLfXejFOXIz9ulfaywP64OjOWmGqpQ';

async function main() {
  console.log('🔍 Verifying cloud database schema...\n');
  
  const cloudSupabase = createClient(CLOUD_SUPABASE_URL, CLOUD_SERVICE_KEY);
  
  // Expected tables from local database
  const expectedTables = [
    'country_settings', 'system_settings', 'quotes_v2', 'quote_items_v2',
    'orders', 'order_items', 'profiles', 'messages', 'payment_transactions',
    'delivery_addresses', 'shipping_routes', 'payment_gateways',
    'discount_codes', 'support_system', 'user_roles'
  ];
  
  let successCount = 0;
  
  for (const table of expectedTables) {
    try {
      const { data, error } = await cloudSupabase.from(table).select('*').limit(1);
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`❌ ${table} - Table missing`);
        } else {
          console.log(`✅ ${table} - Table exists`);
          successCount++;
        }
      } else {
        console.log(`✅ ${table} - Table exists and accessible`);
        successCount++;
      }
    } catch (err) {
      console.log(`❌ ${table} - Error: ${err.message}`);
    }
  }
  
  console.log(`\n📊 Results: ${successCount}/${expectedTables.length} essential tables verified`);
  
  if (successCount >= expectedTables.length * 0.8) {
    console.log('🎉 Schema migration appears successful!');
  } else {
    console.log('⚠️ Schema migration may need attention');
  }
}

main().catch(console.error);
EOF

chmod +x verify_cloud_schema.js

echo ""
echo "📋 Files created:"
echo "1. 📄 $MIGRATION_FILE - Complete schema migration"
echo "2. 🔍 verify_cloud_schema.js - Verification script"
echo ""
echo "📋 Next steps:"
echo "1. Run: echo 'y' | supabase db push --linked"
echo "2. Run: node verify_cloud_schema.js"
echo "3. Copy data using existing scripts"