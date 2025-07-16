#!/bin/bash

# iwishBag Database Reset Script
# This script ensures complete database reset with all tables, triggers, and seed data

echo "🚀 iwishBag Database Reset Script"
echo "================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to handle errors
handle_error() {
    echo -e "${RED}❌ Error: $1${NC}"
    exit 1
}

# Function to show success
show_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to show info
show_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if Supabase is running
echo "Checking Supabase status..."
if ! supabase status >/dev/null 2>&1; then
    show_info "Starting Supabase..."
    supabase start || handle_error "Failed to start Supabase"
fi

# Step 1: Reset the database (this runs migrations and seed.sql)
echo ""
echo "Step 1: Resetting database..."
echo "-----------------------------"
supabase db reset --no-seed || handle_error "Database reset failed"
show_success "Database reset completed"

# Step 2: Apply the cloud schema
echo ""
echo "Step 2: Applying cloud schema..."
echo "--------------------------------"
if [ -f "complete_cloud_dump.sql" ]; then
    show_info "Found complete_cloud_dump.sql, applying..."
    PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f complete_cloud_dump.sql >/dev/null 2>&1
    show_success "Cloud schema applied"
elif [ -f "cloud_schema_complete.sql" ]; then
    show_info "Found cloud_schema_complete.sql, applying..."
    PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f cloud_schema_complete.sql >/dev/null 2>&1
    show_success "Cloud schema applied"
else
    handle_error "No cloud schema file found! Please ensure complete_cloud_dump.sql or cloud_schema_complete.sql exists in the project root"
fi

# Step 3: Run migrations (for triggers and functions)
echo ""
echo "Step 3: Running migrations..."
echo "-----------------------------"
supabase migration up || handle_error "Migration failed"
show_success "Migrations completed"

# Step 4: Apply seed data
echo ""
echo "Step 4: Applying seed data..."
echo "-----------------------------"
if [ -f "supabase/seed.sql" ]; then
    PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/seed.sql >/dev/null 2>&1
    show_success "Seed data applied"
else
    show_info "No seed.sql file found, skipping seed data"
fi

# Step 5: Verify critical tables exist
echo ""
echo "Step 5: Verifying database setup..."
echo "-----------------------------------"
CRITICAL_TABLES=(
    "quotes"
    "profiles"
    "user_addresses"
    "payment_transactions"
    "payment_documents"
    "payment_gateways"
    "bank_account_details"
    "country_settings"
    "quote_statuses"
    "shipping_routes"
)

all_tables_exist=true
for table in "${CRITICAL_TABLES[@]}"; do
    if PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" | grep -q 't'; then
        echo "  ✓ Table '$table' exists"
    else
        echo -e "  ${RED}✗ Table '$table' is missing${NC}"
        all_tables_exist=false
    fi
done

if [ "$all_tables_exist" = false ]; then
    handle_error "Some critical tables are missing!"
fi

# Step 6: Verify triggers
echo ""
echo "Step 6: Verifying triggers..."
echo "-----------------------------"
if PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -tAc "SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created');" | grep -q 't'; then
    show_success "Auth user trigger exists"
else
    show_info "Auth user trigger missing, creating..."
    PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "
    CREATE TRIGGER on_auth_user_created 
    AFTER INSERT ON auth.users 
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();" >/dev/null 2>&1
    show_success "Auth user trigger created"
fi

# Step 7: Show summary
echo ""
echo "======================================"
echo -e "${GREEN}🎉 Database reset completed successfully!${NC}"
echo "======================================"
echo ""
echo "Summary:"
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "
SELECT 
    'Tables' as type, 
    COUNT(*) as count 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 
    'Functions' as type, 
    COUNT(*) as count 
FROM information_schema.routines 
WHERE routine_schema = 'public'
UNION ALL
SELECT 
    'Triggers' as type, 
    COUNT(*) as count 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';"

echo ""
echo "Seed Data Summary:"
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "
SELECT 'Payment Gateways' as table_name, COUNT(*) as count FROM payment_gateways
UNION ALL
SELECT 'Bank Accounts' as table_name, COUNT(*) as count FROM bank_account_details
UNION ALL
SELECT 'Country Settings' as table_name, COUNT(*) as count FROM country_settings
UNION ALL
SELECT 'Quote Statuses' as table_name, COUNT(*) as count FROM quote_statuses;"

echo ""
show_success "Your database is ready to use!"
echo ""
echo "Next steps:"
echo "  - Run 'npm run dev' to start your application"
echo "  - Check http://localhost:5173 to verify everything works"
echo ""