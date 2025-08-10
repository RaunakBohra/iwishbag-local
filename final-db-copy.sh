#!/bin/bash

# Direct Database Copy Script with Correct Password
# Copy local database directly to cloud using pg_dump and psql

echo "🚀 Starting direct database copy..."

# Local database details
LOCAL_HOST="127.0.0.1"
LOCAL_PORT="54322"
LOCAL_DB="postgres"
LOCAL_USER="postgres"
LOCAL_PASSWORD="postgres"

# Cloud database details with CORRECT password
CLOUD_HOST="db.grgvlrvywsfmnmkxrecd.supabase.co"
CLOUD_PORT="5432"
CLOUD_DB="postgres"
CLOUD_USER="postgres"
CLOUD_PASSWORD="aZenjDCQxwMifCEY"

# Use Docker to avoid version mismatch
echo "📤 Creating database dump from local using Docker..."
docker run --rm \
  --network host \
  -e PGPASSWORD="$LOCAL_PASSWORD" \
  postgres:17 \
  pg_dump \
  -h "$LOCAL_HOST" \
  -p "$LOCAL_PORT" \
  -U "$LOCAL_USER" \
  -d "$LOCAL_DB" \
  --clean \
  --no-owner \
  --no-acl \
  --exclude-schema=information_schema \
  --exclude-schema=pg_catalog \
  --exclude-schema=pg_toast \
  --exclude-schema=pgbouncer \
  > local_database_dump.sql

if [ $? -eq 0 ]; then
  echo "✅ Local database dump created successfully"
  echo "📊 Dump file size: $(ls -lh local_database_dump.sql | awk '{print $5}')"
else
  echo "❌ Failed to create database dump"
  exit 1
fi

echo "☁️ Importing database to cloud using Docker..."
docker run --rm -i \
  -e PGPASSWORD="$CLOUD_PASSWORD" \
  postgres:17 \
  psql \
  -h "$CLOUD_HOST" \
  -p "$CLOUD_PORT" \
  -U "$CLOUD_USER" \
  -d "$CLOUD_DB" \
  < local_database_dump.sql

if [ $? -eq 0 ]; then
  echo "✅ Database successfully copied to cloud!"
  
  # Verify the import
  echo "🔍 Verifying cloud database..."
  COUNTRY_COUNT=$(docker run --rm \
    -e PGPASSWORD="$CLOUD_PASSWORD" \
    postgres:17 \
    psql -h "$CLOUD_HOST" -p "$CLOUD_PORT" -U "$CLOUD_USER" -d "$CLOUD_DB" \
    -t -c "SELECT COUNT(*) FROM country_settings;" 2>/dev/null | tr -d ' ')
  
  if [ ! -z "$COUNTRY_COUNT" ] && [ "$COUNTRY_COUNT" -gt 0 ]; then
    echo "📊 Countries in cloud database: $COUNTRY_COUNT"
    
    RATE_COUNT=$(docker run --rm \
      -e PGPASSWORD="$CLOUD_PASSWORD" \
      postgres:17 \
      psql -h "$CLOUD_HOST" -p "$CLOUD_PORT" -U "$CLOUD_USER" -d "$CLOUD_DB" \
      -t -c "SELECT COUNT(*) FROM country_settings WHERE rate_from_usd IS NOT NULL;" 2>/dev/null | tr -d ' ')
    echo "💱 Countries with exchange rates: $RATE_COUNT"
    
    echo "🎉 Database copy completed successfully!"
  else
    echo "⚠️ Verification failed - could not count countries"
  fi
  
else
  echo "❌ Failed to import database to cloud"
  echo "Check the dump file: local_database_dump.sql"
  exit 1
fi

echo "📋 Next steps:"
echo "1. ✅ Database copied to cloud"
echo "2. 🧪 Test exchange rate functionality"
echo "3. 🔄 Update D1 cache with cloud data"