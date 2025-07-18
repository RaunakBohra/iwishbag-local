#!/bin/bash

# Database Restoration Script for iwishBag Project
# This script restores the complete database backup to a Supabase instance

set -e

echo "🔄 Database Restoration Script for iwishBag Project"
echo "=================================================="

# Configuration
BACKUP_DIR="$(dirname "$0")/.."
SCHEMA_FILE="$BACKUP_DIR/complete_backup.sql"
DATA_FILE="$BACKUP_DIR/data/complete_data.sql"

# Check if required files exist
if [ ! -f "$SCHEMA_FILE" ]; then
    echo "❌ Error: Schema backup file not found at $SCHEMA_FILE"
    exit 1
fi

if [ ! -f "$DATA_FILE" ]; then
    echo "❌ Error: Data backup file not found at $DATA_FILE"
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
echo "🚀 Starting database restoration process..."

# Step 1: Restore schema and data from complete backup
echo "📦 Step 1: Restoring complete database (schema + data)..."
if command -v supabase &> /dev/null; then
    echo "Using Supabase CLI..."
    supabase db push --db-url "$DB_URL" --include-all
else
    echo "Using psql..."
    psql "$DB_URL" -f "$SCHEMA_FILE"
fi

echo "✅ Database restoration completed successfully!"
echo ""
echo "📊 Next steps:"
echo "   1. Verify the restored data in your database"
echo "   2. Check that all tables, functions, and triggers are working"
echo "   3. Test RLS policies and authentication"
echo "   4. Restore storage buckets if needed (see storage/ folder)"
echo ""
echo "💡 Storage restoration:"
echo "   - Check storage/ folder for bucket configurations"
echo "   - Manually recreate storage buckets in Supabase dashboard"
echo "   - Upload files from storage/ folder as needed"