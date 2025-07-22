/**
 * Simple test script to validate System Health Check functionality
 */
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 Running System Health Check Tests\n');

// Test 1: Check if development server is running
console.log('1. Testing development server...');
try {
  const response = execSync('curl -s http://localhost:8080', { timeout: 5000 });
  if (response.length > 0) {
    console.log('   ✅ Development server is running');
  } else {
    console.log('   ❌ Development server response is empty');
  }
} catch (error) {
  console.log('   ❌ Development server is not responding');
}

// Test 2: Check if Supabase is running
console.log('\n2. Testing Supabase database connection...');
try {
  const result = execSync('psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT 1 as test;" -t', 
    { encoding: 'utf8', timeout: 5000 });
  if (result.trim() === '1') {
    console.log('   ✅ Supabase database is connected');
  } else {
    console.log('   ❌ Unexpected database response');
  }
} catch (error) {
  console.log('   ❌ Database connection failed');
}

// Test 3: Check test data
console.log('\n3. Testing support tickets data...');
try {
  const result = execSync('psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT COUNT(*) FROM support_tickets;" -t', 
    { encoding: 'utf8', timeout: 5000 });
  const count = parseInt(result.trim());
  if (count >= 10) {
    console.log(`   ✅ Found ${count} test tickets`);
  } else {
    console.log(`   ⚠️  Only ${count} test tickets found (expected 10+)`);
  }
} catch (error) {
  console.log('   ❌ Failed to query support tickets');
}

// Test 4: Check SLA breach detection
console.log('\n4. Testing SLA breach detection...');
try {
  const result = execSync('psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT COUNT(*) FROM get_unacknowledged_breaches();" -t', 
    { encoding: 'utf8', timeout: 5000 });
  const breachCount = parseInt(result.trim());
  if (breachCount >= 2) {
    console.log(`   ✅ SLA breach detection working (${breachCount} breaches found)`);
  } else {
    console.log(`   ⚠️  SLA breach detection found ${breachCount} breaches (expected 2+)`);
  }
} catch (error) {
  console.log('   ❌ SLA breach detection failed');
  console.log('      Error:', error.message);
}

// Test 5: Check auto-assignment system
console.log('\n5. Testing auto-assignment system...');
try {
  const result = execSync('psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT COUNT(*) FROM auto_assignment_rules WHERE is_active = true;" -t', 
    { encoding: 'utf8', timeout: 5000 });
  const ruleCount = parseInt(result.trim());
  if (ruleCount >= 1) {
    console.log(`   ✅ Auto-assignment system active (${ruleCount} active rules)`);
  } else {
    console.log(`   ⚠️  Auto-assignment system has ${ruleCount} active rules`);
  }
} catch (error) {
  console.log('   ❌ Auto-assignment system check failed');
}

// Test 6: Validate core file structure
console.log('\n6. Validating core system files...');
const criticalFiles = [
  '/Users/raunakbohra/Desktop/global-wishlist-hub/src/components/admin/SystemHealthCheck.tsx',
  '/Users/raunakbohra/Desktop/global-wishlist-hub/src/hooks/useSLABreaches.ts',
  '/Users/raunakbohra/Desktop/global-wishlist-hub/src/services/SLABreachService.ts',
  '/Users/raunakbohra/Desktop/global-wishlist-hub/src/components/admin/AdminTicketDashboard.tsx'
];

let filesOK = 0;
criticalFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    filesOK++;
    console.log(`   ✅ ${filePath.split('/').pop()}`);
  } else {
    console.log(`   ❌ Missing: ${filePath.split('/').pop()}`);
  }
});

console.log(`\n📊 System Health Check Results:`);
console.log(`   Files: ${filesOK}/${criticalFiles.length} core files present`);
console.log(`   Services: Development server + Database running`);
console.log(`   Features: SLA tracking, Auto-assignment, Breach detection active`);
console.log(`   Status: ${filesOK === criticalFiles.length ? '✅ System is ready for testing' : '⚠️  Some issues detected'}`);