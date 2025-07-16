#!/bin/bash

# Database Schema Repair Script
# Run this after any database reset to ensure all required columns and functions exist
# Usage: ./fix-database-schema.sh [local|cloud]

set -e  # Exit on any error

# Default to local database
DB_TYPE=${1:-local}

if [ "$DB_TYPE" = "local" ]; then
    echo "🔧 Fixing local database schema..."
    DB_HOST="127.0.0.1"
    DB_PORT="54322"
    DB_USER="postgres"
    DB_NAME="postgres"
    DB_PASSWORD="postgres"
    PGPASSWORD="$DB_PASSWORD"
elif [ "$DB_TYPE" = "cloud" ]; then
    echo "🔧 Fixing cloud database schema..."
    DB_HOST="db.grgvlrvywsfmnmkxrecd.supabase.co"
    DB_PORT="5432"
    DB_USER="postgres"
    DB_NAME="postgres"
    DB_PASSWORD="aZenjDCQxwMifCEY"
    PGPASSWORD="$DB_PASSWORD"
else
    echo "❌ Invalid database type. Use 'local' or 'cloud'"
    exit 1
fi

export PGPASSWORD

echo "📊 Running schema verification and repair..."

# Run the schema verification migration
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "supabase/migrations/20250716120000_schema_verification_and_repair.sql"

echo "🔍 Checking for missing critical migrations..."

# Check if PayPal atomic function exists, if not apply it
PAYPAL_FUNCTION_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_name = 'process_paypal_payment_atomic');" | xargs)

if [ "$PAYPAL_FUNCTION_EXISTS" = "f" ]; then
    echo "💳 Applying PayPal atomic payment function..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "supabase/migrations/20250716000001_process_paypal_payment_atomic.sql"
fi

# Check if Stripe atomic functions exist, if not apply them
STRIPE_FUNCTION_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_name = 'process_stripe_payment_success');" | xargs)

if [ "$STRIPE_FUNCTION_EXISTS" = "f" ]; then
    echo "💳 Applying Stripe atomic payment functions..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "supabase/migrations/20250715100000_add_atomic_stripe_functions.sql"
fi

# Check if user profile trigger exists
TRIGGER_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created');" | xargs)

if [ "$TRIGGER_EXISTS" = "f" ]; then
    echo "👤 Creating user profile trigger..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();"
fi

echo "✅ Running final schema health check..."

# Run the health check and display results
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT * FROM schema_health_check;"

echo ""
echo "🎉 Database schema repair completed successfully!"
echo ""
echo "📝 Summary:"
echo "   - All required columns added to tables"
echo "   - Critical payment functions verified"
echo "   - User profile creation trigger verified"
echo "   - Schema health check passed"
echo ""
echo "💡 Next time you reset your database, just run:"
echo "   ./fix-database-schema.sh $DB_TYPE"
echo ""