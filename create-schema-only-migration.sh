#!/bin/bash

# Create Schema-Only Migration Script
# Extracts only schema (tables, functions, triggers) without data

echo "🚀 Creating clean schema-only migration..."

# Create schema-only dump using Docker to avoid version mismatch
echo "📤 Extracting schema from local database..."
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
  --exclude-schema=information_schema \
  --exclude-schema=pg_catalog \
  --exclude-schema=pg_toast \
  --exclude-schema=pgbouncer \
  --exclude-schema=supabase_migrations \
  > schema_only.sql

if [ $? -eq 0 ]; then
  echo "✅ Schema dump created successfully"
  echo "📊 Schema file size: $(ls -lh schema_only.sql | awk '{print $5}')"
else
  echo "❌ Failed to create schema dump"
  exit 1
fi

# Clean up the schema file for Supabase compatibility
echo "🧹 Cleaning schema for Supabase compatibility..."
cp schema_only.sql schema_original.sql

# Remove problematic elements
sed -i '' '/CREATE SCHEMA supabase_migrations/d' schema_only.sql
sed -i '' '/CREATE SCHEMA _realtime/d' schema_only.sql
sed -i '' '/CREATE SCHEMA pgbouncer/d' schema_only.sql
sed -i '' '/CREATE EXTENSION.*uuid-ossp/d' schema_only.sql
sed -i '' '/CREATE EXTENSION.*ltree/d' schema_only.sql
sed -i '' '/ALTER SCHEMA.*OWNER TO/d' schema_only.sql
sed -i '' '/SET search_path/d' schema_only.sql
sed -i '' '/SET.*timeout/d' schema_only.sql
sed -i '' '/SET.*encoding/d' schema_only.sql
sed -i '' '/SELECT pg_catalog.set_config/d' schema_only.sql

# Add compatibility header
cat > clean_schema.sql << 'EOF'
-- ============================================================================
-- IWISHBAG SCHEMA MIGRATION - CLOUD COMPATIBLE
-- Generated automatically from local database
-- Contains: Tables, Functions, Triggers, Indexes, Constraints
-- ============================================================================

-- Set required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";

EOF

# Append cleaned schema
cat schema_only.sql >> clean_schema.sql

echo "✅ Clean schema file created: clean_schema.sql"
echo "📊 Clean schema size: $(ls -lh clean_schema.sql | awk '{print $5}')"

# Create essential data migration script
echo "📋 Creating essential data migration script..."
cat > migrate_essential_data.js << 'EOF'
#!/usr/bin/env node

/**
 * Essential Data Migration Script
 * Copies critical data after schema is applied
 */

import { createClient } from '@supabase/supabase-js';

const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
const LOCAL_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const CLOUD_SUPABASE_URL = 'https://grgvlrvywsfmnmkxrecd.supabase.co';
const CLOUD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3ZscnZ5d3NmbW5ta3hyZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQxMTMxMiwiZXhwIjoyMDY1OTg3MzEyfQ.gRRd3vm7s4iwlGLfXejFOXIz9ulfaywP64OjOWmGqpQ';

async function copyTable(tableName, localSupabase, cloudSupabase) {
  console.log(`📄 Copying ${tableName}...`);
  
  try {
    const { data: localData, error: fetchError } = await localSupabase
      .from(tableName)
      .select('*');
      
    if (fetchError) {
      console.log(`   ❌ Error: ${fetchError.message}`);
      return false;
    }
    
    if (!localData || localData.length === 0) {
      console.log(`   ⏭️ No data to copy`);
      return true;
    }
    
    console.log(`   📋 Found ${localData.length} records`);
    
    // Clear existing data
    await cloudSupabase.from(tableName).delete().neq('id', '');
    
    // Insert in batches of 50
    const batchSize = 50;
    let successCount = 0;
    
    for (let i = 0; i < localData.length; i += batchSize) {
      const batch = localData.slice(i, i + batchSize);
      const { error } = await cloudSupabase.from(tableName).insert(batch);
      
      if (!error) {
        successCount += batch.length;
      } else {
        console.log(`   ⚠️ Batch error: ${error.message}`);
      }
    }
    
    console.log(`   ✅ ${successCount}/${localData.length} records copied`);
    return true;
    
  } catch (error) {
    console.log(`   💥 Failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting essential data migration...\n');
  
  const localSupabase = createClient(LOCAL_SUPABASE_URL, LOCAL_SERVICE_KEY);
  const cloudSupabase = createClient(CLOUD_SUPABASE_URL, CLOUD_SERVICE_KEY);
  
  // Essential tables in dependency order
  const tables = [
    'country_settings',
    'system_settings',
    'email_templates',
    'delivery_providers'
  ];
  
  let successCount = 0;
  for (const table of tables) {
    if (await copyTable(table, localSupabase, cloudSupabase)) {
      successCount++;
    }
    console.log('');
  }
  
  console.log(`🎯 Results: ${successCount}/${tables.length} tables copied`);
  
  if (successCount > 0) {
    console.log('🎉 Essential data migration completed!');
  }
}

main().catch(console.error);
EOF

chmod +x migrate_essential_data.js

echo "📋 Migration files created:"
echo "1. 📄 clean_schema.sql - Apply this via Supabase SQL Editor"
echo "2. 🔄 migrate_essential_data.js - Run this after schema is applied"
echo ""
echo "📋 Next steps:"
echo "1. Copy clean_schema.sql to Supabase SQL Editor and run it"
echo "2. Run: node migrate_essential_data.js"
echo "3. Verify your data in the cloud database"