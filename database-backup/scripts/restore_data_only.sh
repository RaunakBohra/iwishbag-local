#!/bin/bash

# Data-Only Restoration Script for iwishBag Project
# This script restores only the database data (assumes schema already exists)

set -e

echo "🔄 Data-Only Restoration Script for iwishBag Project"
echo "===================================================="

# Configuration
BACKUP_DIR="$(dirname "$0")/.."
DATA_FILE="$BACKUP_DIR/data/complete_data.sql"

# Check if required files exist
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
echo "⚠️  WARNING: This script will restore data to existing tables."
echo "   Make sure the database schema is already in place!"
echo ""
read -p "Do you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Restoration cancelled."
    exit 1
fi

echo ""
echo "🚀 Starting data restoration process..."

# Restore data only
echo "📦 Restoring database data..."
if command -v psql &> /dev/null; then
    # Note: The data dump contains circular foreign key constraints
    # We need to disable triggers during restoration
    echo "🔧 Disabling triggers during data restoration..."
    psql "$DB_URL" -c "SET session_replication_role = replica;"
    psql "$DB_URL" -f "$DATA_FILE"
    psql "$DB_URL" -c "SET session_replication_role = DEFAULT;"
else
    echo "❌ Error: psql is not available. Please install PostgreSQL client tools."
    exit 1
fi

echo "✅ Data restoration completed successfully!"
echo ""
echo "📊 Next steps:"
echo "   1. Verify the restored data in your database"
echo "   2. Check data integrity and relationships"
echo "   3. Test application functionality"
echo "   4. Restore storage buckets if needed (see storage/ folder)"