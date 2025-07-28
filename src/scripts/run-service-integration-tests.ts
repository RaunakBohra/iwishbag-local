/**
 * Service Integration Test Runner
 * 
 * Execute this script in the browser console to run service integration tests
 * 
 * Usage:
 * 1. Open http://localhost:8084 in browser
 * 2. Open developer console (F12)
 * 3. Copy and paste this entire file
 * 4. Run: await runServiceIntegrationTests()
 */

console.log('🚀 Loading Service Integration Test Runner...');

// Import the test classes (assuming they're available globally)
const runServiceIntegrationTests = async () => {
  console.log('⚙️ Starting Service Integration Tests...\n');
  
  const startTime = Date.now();
  const results = [];
  
  // Test 1: Check service availability
  console.log('📋 TEST 1: Service Availability Check');
  try {
    // Check if services are available in global scope or can be imported
    const servicesAvailable = {
      integratedPackageForwardingService: typeof window.integratedPackageForwardingService !== 'undefined',
      smartCalculationEngineExtension: typeof window.smartCalculationEngineExtension !== 'undefined',
      integratedPaymentService: typeof window.integratedPaymentService !== 'undefined',
    };
    
    console.log('Services availability:', servicesAvailable);
    
    if (Object.values(servicesAvailable).some(available => !available)) {
      console.log('⚠️ Some services not available in global scope. Attempting dynamic import...');
      
      // Try to load services dynamically
      try {
        const { integratedPackageForwardingService } = await import('/src/services/IntegratedPackageForwardingService.ts');
        const { smartCalculationEnginePackageForwardingExtension } = await import('/src/services/SmartCalculationEnginePackageForwardingExtension.ts');
        const { integratedPaymentService } = await import('/src/services/IntegratedPaymentService.ts');
        
        window.integratedPackageForwardingService = integratedPackageForwardingService;
        window.smartCalculationEngineExtension = smartCalculationEnginePackageForwardingExtension;
        window.integratedPaymentService = integratedPaymentService;
        
        console.log('✅ Services loaded dynamically');
        results.push({ test: 'Service Availability', status: 'PASS', message: 'Services loaded dynamically' });
      } catch (importError) {
        console.log('❌ Failed to load services:', importError);
        results.push({ test: 'Service Availability', status: 'FAIL', message: 'Cannot load services' });
        return results;
      }
    } else {
      console.log('✅ All services available');
      results.push({ test: 'Service Availability', status: 'PASS', message: 'All services available' });
    }
  } catch (error) {
    console.log('❌ Service availability check failed:', error);
    results.push({ test: 'Service Availability', status: 'FAIL', message: error.message });
  }
  
  // Test 2: IntegratedPackageForwardingService methods
  console.log('\n📋 TEST 2: IntegratedPackageForwardingService Methods');
  try {
    const service = window.integratedPackageForwardingService;
    const requiredMethods = [
      'getIntegratedCustomerProfile',
      'assignIntegratedVirtualAddress', 
      'getCustomerPackagesIntegrated',
      'createIntegratedQuote'
    ];
    
    const methodTests = requiredMethods.map(method => ({
      method,
      exists: typeof service[method] === 'function'
    }));
    
    const missingMethods = methodTests.filter(test => !test.exists);
    
    if (missingMethods.length > 0) {
      console.log('❌ Missing methods:', missingMethods.map(m => m.method));
      results.push({ 
        test: 'IntegratedPackageForwardingService Methods', 
        status: 'FAIL', 
        message: `Missing methods: ${missingMethods.map(m => m.method).join(', ')}` 
      });
    } else {
      console.log('✅ All required methods found');
      results.push({ 
        test: 'IntegratedPackageForwardingService Methods', 
        status: 'PASS', 
        message: 'All required methods available' 
      });
    }
  } catch (error) {
    console.log('❌ Method check failed:', error);
    results.push({ test: 'IntegratedPackageForwardingService Methods', status: 'FAIL', message: error.message });
  }
  
  // Test 3: SmartCalculationEngine Extension
  console.log('\n📋 TEST 3: SmartCalculationEngine Extension');
  try {
    const extension = window.smartCalculationEngineExtension;
    const requiredMethods = ['calculateEnhancedWithPackageForwarding'];
    
    const methodExists = typeof extension.calculateEnhancedWithPackageForwarding === 'function';
    
    if (!methodExists) {
      console.log('❌ Missing calculateEnhancedWithPackageForwarding method');
      results.push({ 
        test: 'SmartCalculationEngine Extension', 
        status: 'FAIL', 
        message: 'Missing calculateEnhancedWithPackageForwarding method' 
      });
    } else {
      console.log('✅ SmartCalculationEngine extension method found');
      results.push({ 
        test: 'SmartCalculationEngine Extension', 
        status: 'PASS', 
        message: 'Extension method available' 
      });
    }
  } catch (error) {
    console.log('❌ Extension check failed:', error);
    results.push({ test: 'SmartCalculationEngine Extension', status: 'FAIL', message: error.message });
  }
  
  // Test 4: Database Connection via Supabase
  console.log('\n📋 TEST 4: Database Connection');
  try {
    // Import supabase client
    const { supabase } = await import('/src/integrations/supabase/client.ts');
    
    // Test basic database connectivity
    const { data, error } = await supabase
      .from('quotes')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Database connection failed:', error);
      results.push({ test: 'Database Connection', status: 'FAIL', message: error.message });
    } else {
      console.log('✅ Database connection successful');
      results.push({ test: 'Database Connection', status: 'PASS', message: 'Connected successfully' });
    }
  } catch (error) {
    console.log('❌ Database test failed:', error);
    results.push({ test: 'Database Connection', status: 'FAIL', message: error.message });
  }
  
  // Test 5: Package Forwarding Database Functions
  console.log('\n📋 TEST 5: Package Forwarding Database Functions');
  try {
    const { supabase } = await import('/src/integrations/supabase/client.ts');
    
    // Test if our custom functions exist by trying to call them with minimal data
    const functionTests = [];
    
    // Test get_or_create_customer_preferences function
    try {
      const testUserId = '00000000-0000-0000-0000-000000000000'; // Use a test UUID
      const { data, error } = await supabase.rpc('get_or_create_customer_preferences', {
        p_user_id: testUserId
      });
      
      // Function exists if we get a result or a specific error (not "function does not exist")
      const functionExists = !error || !error.message.includes('function') || !error.message.includes('does not exist');
      
      functionTests.push({
        function: 'get_or_create_customer_preferences',
        exists: functionExists,
        error: error?.message || null
      });
    } catch (err) {
      functionTests.push({
        function: 'get_or_create_customer_preferences',
        exists: false,
        error: err.message
      });
    }
    
    console.log('Function test results:', functionTests);
    
    const allFunctionsExist = functionTests.every(test => test.exists);
    
    if (allFunctionsExist) {
      console.log('✅ Database functions available');
      results.push({ test: 'Database Functions', status: 'PASS', message: 'Functions available' });
    } else {
      console.log('❌ Some database functions missing');
      results.push({ test: 'Database Functions', status: 'FAIL', message: 'Some functions missing' });
    }
  } catch (error) {
    console.log('❌ Database function test failed:', error);
    results.push({ test: 'Database Functions', status: 'FAIL', message: error.message });
  }
  
  // Test 6: Integration with Customer Profile System
  console.log('\n📋 TEST 6: Customer Profile Integration');
  try {
    const { supabase } = await import('/src/integrations/supabase/client.ts');
    
    // Check if customer_preferences table exists and is accessible
    const { data, error } = await supabase
      .from('customer_preferences')
      .select('count')
      .limit(1);
    
    if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log('❌ customer_preferences table not found');
      results.push({ test: 'Customer Profile Integration', status: 'FAIL', message: 'customer_preferences table missing' });
    } else {
      console.log('✅ Customer profile integration tables exist');
      results.push({ test: 'Customer Profile Integration', status: 'PASS', message: 'Integration tables available' });
    }
  } catch (error) {
    console.log('❌ Customer profile integration test failed:', error);
    results.push({ test: 'Customer Profile Integration', status: 'FAIL', message: error.message });
  }
  
  // Test Summary
  console.log('\n📊 SERVICE INTEGRATION TEST SUMMARY');
  console.log('=====================================');
  
  const totalTests = results.length;
  const passedTests = results.filter(r => r.status === 'PASS').length;
  const failedTests = results.filter(r => r.status === 'FAIL').length;
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log(`Execution Time: ${Date.now() - startTime}ms\n`);
  
  // Detailed Results
  console.log('📋 DETAILED RESULTS:');
  results.forEach((result, index) => {
    const statusIcon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${index + 1}. ${statusIcon} ${result.test}: ${result.message}`);
  });
  
  console.log('\n🎉 Service Integration Tests Complete!');
  
  if (failedTests === 0) {
    console.log('✅ All tests passed! Services are properly integrated.');
  } else {
    console.log('⚠️ Some tests failed. Review the results above and fix integration issues.');
  }
  
  return {
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: ((passedTests / totalTests) * 100).toFixed(1) + '%',
      executionTime: Date.now() - startTime + 'ms'
    },
    results: results
  };
};

// Make the test runner available globally
window.runServiceIntegrationTests = runServiceIntegrationTests;

console.log('✅ Service Integration Test Runner loaded!');
console.log('📝 To run tests, execute: await runServiceIntegrationTests()');

// Auto-run if requested
if (window.location.search.includes('autotest=true')) {
  console.log('🚀 Auto-running service integration tests...');
  runServiceIntegrationTests();
}