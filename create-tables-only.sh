#!/bin/bash

# Create Tables-Only Migration
# Extract just table definitions without complex functions

echo "🚀 Creating tables-only migration..."

# Extract just CREATE TABLE statements from the local database
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
  | grep -A 50 "CREATE TABLE" \
  | grep -v "CREATE FUNCTION\|CREATE TRIGGER\|CREATE INDEX" \
  > tables_only.sql

# Create a clean migration with just essential tables
cat > supabase/migrations/20250810131200_tables_only.sql << 'EOF'
-- ============================================================================
-- ESSENTIAL TABLES MIGRATION - Cloud Database
-- Creates all essential tables from local database
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";
EOF

# Add the tables
cat tables_only.sql >> supabase/migrations/20250810131200_tables_only.sql

echo "✅ Tables-only migration created"
echo "📊 Migration size: $(ls -lh supabase/migrations/20250810131200_tables_only.sql | awk '{print $5}')"