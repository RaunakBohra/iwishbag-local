import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAdminStatus() {
  console.log('🔍 Checking admin status...\n');
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('❌ No user logged in');
      console.log('Please login first at http://localhost:8083/auth');
      return;
    }
    
    console.log('✅ Logged in as:', user.email);
    console.log('User ID:', user.id);
    
    // Check user role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (roleError) {
      console.log('\n❌ Error checking role:', roleError.message);
      
      // Try to check if user_roles table exists
      const { data: tables } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'user_roles');
        
      if (!tables || tables.length === 0) {
        console.log('⚠️  user_roles table does not exist!');
      }
      return;
    }
    
    console.log('\n📋 User Role:', roleData?.role || 'No role found');
    
    if (roleData?.role === 'admin') {
      console.log('✅ You are an ADMIN!');
    } else {
      console.log('❌ You are NOT an admin');
      console.log('\nTo make yourself admin, run this SQL in Supabase:');
      console.log(`INSERT INTO user_roles (user_id, role) VALUES ('${user.id}', 'admin') ON CONFLICT (user_id) DO UPDATE SET role = 'admin';`);
    }
    
    // Also check using RPC function
    const { data: isAdminRPC, error: rpcError } = await supabase
      .rpc('is_admin');
    
    if (!rpcError) {
      console.log('\n🔧 RPC is_admin() result:', isAdminRPC);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkAdminStatus();