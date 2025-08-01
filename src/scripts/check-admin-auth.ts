#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAuth() {
  console.log('🔍 Checking Authentication Status\n');
  
  // Check current auth status
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    console.log('❌ Not authenticated');
    console.log('\nTo access admin pages:');
    console.log('1. Go to http://localhost:8082/auth');
    console.log('2. Login with your admin account');
    console.log('3. Then navigate to /admin/quotes/[id]');
    return;
  }
  
  console.log('✅ Authenticated as:', user.email);
  console.log('User ID:', user.id);
  
  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
    
  if (profileError) {
    console.log('❌ Error fetching profile:', profileError.message);
    return;
  }
    
  console.log('User role:', profile?.role || 'Not set');
  
  if (profile?.role !== 'admin') {
    console.log('\n⚠️  User is not an admin');
    console.log('Admin access required for /admin routes');
    console.log('\nTo grant admin access:');
    console.log(`UPDATE profiles SET role = 'admin' WHERE id = '${user.id}';`);
  } else {
    console.log('\n✅ User has admin access');
    console.log('You can now access: http://localhost:8082/admin/quotes/ad179ca1-0f3e-4e5d-a0eb-9d80b0b26345');
  }
}

checkAuth().catch(console.error);