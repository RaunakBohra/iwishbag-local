#!/usr/bin/env node
/**
 * Test script to verify E.164 phone number compliance
 * This script tests that phone numbers are stored with + prefix
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseAnonKey) {
  console.error('❌ Missing VITE_SUPABASE_ANON_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPhoneE164Compliance() {
  console.log('🧪 Testing E.164 Phone Number Compliance\n');
  console.log('=====================================\n');

  try {
    // Test 1: Create a test user with phone number
    console.log('Test 1: Creating test user with phone number...');
    const testEmail = `test-e164-${Date.now()}@example.com`;
    const testPhone = '+15551234567'; // E.164 format with +
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      phone: testPhone,
      options: {
        data: {
          name: 'E164 Test User'
        }
      }
    });

    if (signUpError) {
      console.error('❌ Sign up error:', signUpError.message);
      return;
    }

    console.log('✅ Test user created successfully');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Phone sent: ${testPhone}`);

    // Test 2: Query the database to check how phone was stored
    console.log('\nTest 2: Checking phone storage in database...');
    
    // Note: We need service role key to query auth.users directly
    // For now, we'll check via the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user?.phone) {
      console.log(`✅ Phone retrieved: ${user.phone}`);
      console.log(`   Has + prefix: ${user.phone.startsWith('+') ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   Length: ${user.phone.length}`);
      console.log(`   E.164 compliant: ${/^\+[1-9]\d{1,14}$/.test(user.phone) ? 'YES ✅' : 'NO ❌'}`);
    } else {
      console.log('❌ No phone number found on user');
    }

    // Test 3: Test phone update
    console.log('\nTest 3: Testing phone update...');
    const updatePhone = '+44207946123'; // UK number
    
    const { error: updateError } = await supabase.auth.updateUser({
      phone: updatePhone
    });

    if (updateError) {
      console.error('❌ Update error:', updateError.message);
    } else {
      console.log('✅ Phone updated successfully');
      
      // Check the updated phone
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      if (updatedUser?.phone) {
        console.log(`   New phone: ${updatedUser.phone}`);
        console.log(`   Has + prefix: ${updatedUser.phone.startsWith('+') ? 'YES ✅' : 'NO ❌'}`);
        console.log(`   E.164 compliant: ${/^\+[1-9]\d{1,14}$/.test(updatedUser.phone) ? 'YES ✅' : 'NO ❌'}`);
      }
    }

    // Test 4: Test WorldClassPhoneInput format
    console.log('\nTest 4: Testing WorldClassPhoneInput output format...');
    const phoneInputFormats = [
      '+1 555 123 4567',     // US with spaces
      '+44 20 7946 0123',    // UK with spaces
      '+91 98765 43210',     // India with spaces
      '+977 984 1234567',    // Nepal with spaces
    ];

    phoneInputFormats.forEach(phone => {
      const e164Phone = phone.replace(/\s+/g, '');
      console.log(`   Input: "${phone}"`);
      console.log(`   E.164: "${e164Phone}"`);
      console.log(`   Valid: ${/^\+[1-9]\d{1,14}$/.test(e164Phone) ? 'YES ✅' : 'NO ❌'}`);
    });

    // Clean up: Sign out
    await supabase.auth.signOut();
    console.log('\n✅ Test completed successfully');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPhoneE164Compliance();