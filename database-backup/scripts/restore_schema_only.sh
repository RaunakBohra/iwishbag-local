#!/bin/bash

# Schema-Only Restoration Script for iwishBag Project
# This script restores only the database schema (tables, functions, triggers, RLS policies)

set -e

echo "🔄 Schema-Only Restoration Script for iwishBag Project"
echo "====================================================="

# Configuration
BACKUP_DIR="$(dirname "$0")/.."
SCHEMA_FILE="$BACKUP_DIR/schema/complete_schema.sql"

# Check if required files exist
if [ ! -f "$SCHEMA_FILE" ]; then
    echo "❌ Error: Schema backup file not found at $SCHEMA_FILE"
    exit 1
fi

# Prompt for database URL
echo "📝 Please provide the target database connection string:"
echo "   Format: postgresql://postgres:password@host:port/database"
read -p "Database URL: " DB_URL

if [ -z "$DB_URL" ]; then
    echo "❌ Error: Database URL is required"
    exit 1
fi

echo ""
echo "🚀 Starting schema restoration process..."

# Restore schema only
echo "📦 Restoring database schema..."
if command -v psql &> /dev/null; then
    psql "$DB_URL" -f "$SCHEMA_FILE"
else
    echo "❌ Error: psql is not available. Please install PostgreSQL client tools."
    exit 1
fi

echo "✅ Schema restoration completed successfully!"
echo ""
echo "📊 Next steps:"
echo "   1. Verify the restored schema in your database"
echo "   2. Check that all tables, functions, and triggers are created"
echo "   3. Test RLS policies"
echo "   4. Import data separately if needed using restore_data_only.sh"
echo "   5. Restore storage buckets if needed (see storage/ folder)"