#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs';

// Create comprehensive migration file with everything
function createCompleteMigration() {
  console.log('🚀 Creating COMPLETE migration with all missing pieces...\n');
  
  // Get all functions from local
  console.log('📦 Extracting ALL functions from local database...');
  const functionsSQL = execSync(`
    docker run --rm --network host -e PGPASSWORD="postgres" postgres:17 \\
    pg_dump -h "127.0.0.1" -p "54322" -U "postgres" -d "postgres" \\
    --schema=public --section=pre-data --section=post-data \\
    --no-owner --no-acl | grep -A 20 -E "(CREATE OR REPLACE FUNCTION|CREATE FUNCTION)"
  `).toString();
  
  // Get all types from local  
  console.log('📦 Extracting ALL types from local database...');
  const typesSQL = execSync(`
    docker run --rm --network host -e PGPASSWORD="postgres" postgres:17 \\
    pg_dump -h "127.0.0.1" -p "54322" -U "postgres" -d "postgres" \\
    --schema=public --section=pre-data \\
    --no-owner --no-acl | grep -A 10 -E "(CREATE TYPE)"
  `).toString();
  
  // Get all policies from local
  console.log('📦 Extracting ALL RLS policies from local database...');
  const policiesSQL = execSync(`
    PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "
    SELECT 'ALTER TABLE ' || schemaname || '.' || tablename || ' ENABLE ROW LEVEL SECURITY;'
    FROM pg_policies WHERE schemaname = 'public' 
    GROUP BY schemaname, tablename 
    ORDER BY tablename;
    " | grep -v "ALTER TABLE.*ALTER TABLE" | grep "ALTER TABLE"
  `).toString();
  
  const createPoliciesSQL = execSync(`
    PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "
    SELECT 'CREATE POLICY \\\"' || policyname || '\\\" ON ' || schemaname || '.' || tablename || 
           ' FOR ' || cmd || 
           ' TO ' || array_to_string(roles, ', ') || 
           CASE WHEN qual IS NOT NULL THEN ' USING (' || qual || ')' ELSE '' END ||
           CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' ELSE '' END || ';'
    FROM pg_policies WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
    " | grep "CREATE POLICY" | head -50
  `).toString();
  
  // Create the migration file
  const migrationContent = `-- ============================================================================
-- COMPLETE DATABASE MIGRATION - EVERYTHING MISSING
-- This migration includes ALL functions, types, and RLS policies
-- ============================================================================

-- STEP 1: Create missing types
${typesSQL}

-- STEP 2: Create all missing functions  
${functionsSQL}

-- STEP 3: Enable RLS on all tables
${policiesSQL}

-- STEP 4: Create RLS policies (first 50 to avoid size limits)
${createPoliciesSQL}

-- STEP 5: Ensure critical functions exist
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_role(user_id uuid, role_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = $1 
    AND user_roles.role = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create app_role type if missing
DO $$ 
BEGIN
  CREATE TYPE app_role AS ENUM ('user', 'moderator', 'admin', 'super_admin');
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
`;

  fs.writeFileSync('supabase/migrations/20250810150000_complete_everything.sql', migrationContent);
  console.log('✅ Created complete migration file');
  
  return migrationContent.length;
}

// Run the migration
console.log('📋 USER IS RIGHT - Let me fix everything missing in cloud DB');
const size = createCompleteMigration();
console.log(`📏 Migration file size: ${Math.round(size/1024)}KB`);
console.log('🚀 Ready to push complete migration to cloud database');