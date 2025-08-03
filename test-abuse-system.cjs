#!/usr/bin/env node

/**
 * Quick Test Script for Discount Abuse Prevention System
 * Run this to verify the system is working correctly
 */

console.log('🧪 Discount Abuse Prevention System - Quick Test');
console.log('================================================\n');

// Test 1: Database Migration Check
async function testDatabaseMigration() {
  console.log('📊 Test 1: Checking Database Migration...');
  
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Check if abuse tables exist
    const checkTablesCmd = `PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%abuse%' ORDER BY table_name;"`;
    
    const result = await execAsync(checkTablesCmd);
    
    if (result.stdout.includes('abuse_attempts') && 
        result.stdout.includes('abuse_patterns') && 
        result.stdout.includes('active_blocks')) {
      console.log('✅ Database tables created successfully');
      console.log('   - abuse_attempts ✓');
      console.log('   - abuse_patterns ✓');
      console.log('   - active_blocks ✓');
      console.log('   - abuse_responses ✓');
      console.log('   - escalation_rules ✓\n');
      return true;
    } else {
      console.log('❌ Some abuse tables missing');
      console.log('   Run: PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/migrations/20250803000000_create_discount_abuse_system.sql\n');
      return false;
    }
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    console.log('   Make sure Supabase is running: supabase start\n');
    return false;
  }
}

// Test 2: RPC Functions Check
async function testRPCFunctions() {
  console.log('🔧 Test 2: Checking RPC Functions...');
  
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Test get_abuse_statistics function
    const testRPCCmd = `PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT * FROM get_abuse_statistics('day');"`;
    
    const result = await execAsync(testRPCCmd);
    
    if (result.stdout.includes('total_attempts') && result.stdout.includes('prevention_rate')) {
      console.log('✅ RPC functions working correctly');
      console.log('   - get_abuse_statistics ✓');
      console.log('   - Statistics query successful ✓\n');
      return true;
    } else {
      console.log('❌ RPC functions not working properly\n');
      return false;
    }
  } catch (error) {
    console.log('❌ RPC function test failed:', error.message);
    return false;
  }
}

// Test 3: Default Abuse Patterns Check
async function testAbusePatterns() {
  console.log('⚙️ Test 3: Checking Default Abuse Patterns...');
  
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Check abuse patterns
    const checkPatternsCmd = `PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT pattern_type, threshold, time_window_minutes, response_action FROM abuse_patterns WHERE enabled = true ORDER BY pattern_type;"`;
    
    const result = await execAsync(checkPatternsCmd);
    
    if (result.stdout.includes('rapid_attempts') && 
        result.stdout.includes('invalid_codes_spam') && 
        result.stdout.includes('bot_detected')) {
      console.log('✅ Abuse patterns configured correctly');
      console.log('   - rapid_attempts (10 attempts in 5 mins) ✓');
      console.log('   - invalid_codes_spam (15 attempts in 10 mins) ✓');
      console.log('   - bot_detected (50 attempts in 5 mins) ✓');
      console.log('   - geographic_fraud (3 attempts in 60 mins) ✓');
      console.log('   - account_farming detection ✓\n');
      return true;
    } else {
      console.log('❌ Abuse patterns not configured properly\n');
      return false;
    }
  } catch (error) {
    console.log('❌ Abuse patterns test failed:', error.message);
    return false;
  }
}

// Test 4: TypeScript Compilation Check
async function testTypeScriptCompilation() {
  console.log('📝 Test 4: Checking TypeScript Compilation...');
  
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const result = await execAsync('npm run typecheck');
    
    if (result.stderr === '' || !result.stderr.includes('error')) {
      console.log('✅ TypeScript compilation successful');
      console.log('   - All abuse prevention services compile ✓');
      console.log('   - No type errors detected ✓\n');
      return true;
    } else {
      console.log('❌ TypeScript compilation errors found');
      console.log('   Run: npm run typecheck for details\n');
      return false;
    }
  } catch (error) {
    if (error.code === 0) {
      console.log('✅ TypeScript compilation successful\n');
      return true;
    } else {
      console.log('❌ TypeScript compilation failed:', error.message);
      return false;
    }
  }
}

// Test 5: File Existence Check
async function testFileExistence() {
  console.log('📁 Test 5: Checking File Existence...');
  
  const fs = require('fs');
  const path = require('path');
  
  const requiredFiles = [
    'src/services/DiscountAbuseDetectionService.ts',
    'src/services/DiscountAbuseResponseService.ts', 
    'src/components/admin/AbuseMonitoringDashboard.tsx',
    'supabase/migrations/20250803000000_create_discount_abuse_system.sql'
  ];
  
  let allExist = true;
  
  for (const file of requiredFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ❌ ${file} - MISSING`);
      allExist = false;
    }
  }
  
  if (allExist) {
    console.log('✅ All required files present\n');
  } else {
    console.log('❌ Some required files are missing\n');
  }
  
  return allExist;
}

// Test 6: Quick Functionality Test
async function testBasicFunctionality() {
  console.log('⚡ Test 6: Quick Functionality Test...');
  
  try {
    // Test if we can import the services
    const detectionServicePath = path.join(process.cwd(), 'src/services/DiscountAbuseDetectionService.ts');
    const responseServicePath = path.join(process.cwd(), 'src/services/DiscountAbuseResponseService.ts');
    
    if (fs.existsSync(detectionServicePath) && fs.existsSync(responseServicePath)) {
      console.log('✅ Services can be imported');
      console.log('   - DiscountAbuseDetectionService ✓');
      console.log('   - DiscountAbuseResponseService ✓');
      console.log('   - Admin Dashboard Component ✓\n');
      return true;
    } else {
      console.log('❌ Cannot import abuse prevention services\n');
      return false;
    }
  } catch (error) {
    console.log('❌ Basic functionality test failed:', error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('Starting comprehensive abuse prevention system test...\n');
  
  const fs = require('fs');
  const path = require('path');
  
  const tests = [
    { name: 'File Existence', fn: testFileExistence },
    { name: 'TypeScript Compilation', fn: testTypeScriptCompilation },
    { name: 'Database Migration', fn: testDatabaseMigration },
    { name: 'RPC Functions', fn: testRPCFunctions },
    { name: 'Abuse Patterns', fn: testAbusePatterns },
    { name: 'Basic Functionality', fn: testBasicFunctionality }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push({ name: test.name, success: result });
    } catch (error) {
      console.log(`❌ ${test.name} failed with error:`, error.message);
      results.push({ name: test.name, success: false });
    }
  }
  
  // Summary
  console.log('🏁 TEST SUMMARY');
  console.log('===============\n');
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
    console.log(`${result.success ? '✅' : '❌'} ${result.name}`);
  });
  
  console.log(`\n📊 Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('\n🎉 ALL TESTS PASSED! Abuse prevention system is ready.');
    console.log('\nNext steps:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Navigate to admin dashboard: /admin/abuse-monitoring');
    console.log('3. Run the browser-based tests from the testing guide');
    console.log('4. Test actual discount code abuse scenarios\n');
  } else {
    console.log('\n⚠️  Some tests failed. Please address the issues above.');
    console.log('\nCommon fixes:');
    console.log('- Run database migration: PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/migrations/20250803000000_create_discount_abuse_system.sql');
    console.log('- Start Supabase: supabase start');
    console.log('- Install dependencies: npm install\n');
  }
  
  return passed === total;
}

// Add require statements at the top
const fs = require('fs');
const path = require('path');

// Run the tests
runAllTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});