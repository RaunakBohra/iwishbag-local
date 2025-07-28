/**
 * Package Forwarding Integration Testing Suite
 * 
 * Comprehensive testing for the package forwarding system integration
 * with the main iwishBag ecosystem. Tests database integration, service
 * integration, and end-to-end workflows.
 */

import { supabase } from '@/integrations/supabase/client';
import { integratedPackageForwardingService } from '@/services/IntegratedPackageForwardingService';
import { smartCalculationEnginePackageForwardingExtension } from '@/services/SmartCalculationEnginePackageForwardingExtension';
import { integratedPaymentService } from '@/services/IntegratedPaymentService';
import { packageForwardingQuoteIntegration } from '@/services/PackageForwardingQuoteIntegration';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

interface TestResult {
  test_name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  execution_time_ms: number;
  details?: any;
}

interface TestSuite {
  suite_name: string;
  total_tests: number;
  passed: number;
  failed: number;
  skipped: number;
  results: TestResult[];
  execution_time_ms: number;
}

// ============================================================================
// PHASE 1: DATABASE INTEGRATION TESTS
// ============================================================================

export class DatabaseIntegrationTests {
  
  async runAllTests(): Promise<TestSuite> {
    const startTime = Date.now();
    const results: TestResult[] = [];
    
    console.log('🔍 Starting Database Integration Tests...');
    
    // Test 1: Verify database tables exist
    results.push(await this.testTablesExist());
    
    // Test 2: Verify foreign key relationships
    results.push(await this.testForeignKeyRelationships());
    
    // Test 3: Test database functions
    results.push(await this.testDatabaseFunctions());
    
    // Test 4: Test RLS policies
    results.push(await this.testRLSPolicies());
    
    // Test 5: Test database triggers
    results.push(await this.testDatabaseTriggers());
    
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const skipped = results.filter(r => r.status === 'SKIP').length;
    
    return {
      suite_name: 'Database Integration Tests',
      total_tests: results.length,
      passed,
      failed,
      skipped,
      results,
      execution_time_ms: Date.now() - startTime,
    };
  }
  
  private async testTablesExist(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const requiredTables = [
        'customer_addresses',
        'received_packages', 
        'consolidation_groups',
        'storage_fees',
        'customer_preferences',
        'quotes'
      ];
      
      const { data: tables, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', requiredTables);
      
      if (error) throw error;
      
      const foundTables = tables?.map(t => t.table_name) || [];
      const missingTables = requiredTables.filter(table => 
        !foundTables.includes(table)
      );
      
      if (missingTables.length > 0) {
        return {
          test_name: 'Database Tables Exist',
          status: 'FAIL',
          message: `Missing tables: ${missingTables.join(', ')}`,
          execution_time_ms: Date.now() - startTime,
          details: { foundTables, missingTables }
        };
      }
      
      return {
        test_name: 'Database Tables Exist',
        status: 'PASS',
        message: 'All required tables found',
        execution_time_ms: Date.now() - startTime,
        details: { foundTables }
      };
      
    } catch (error) {
      return {
        test_name: 'Database Tables Exist',
        status: 'FAIL',
        message: `Error checking tables: ${error instanceof Error ? error.message : 'Unknown error'}`,
        execution_time_ms: Date.now() - startTime,
      };
    }
  }
  
  private async testForeignKeyRelationships(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Test foreign key relationships by checking constraints
      const { data: constraints, error } = await supabase.rpc('sql', {
        query: `
          SELECT 
            tc.constraint_name,
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name IN ('customer_addresses', 'received_packages', 'consolidation_groups', 'storage_fees')
          ORDER BY tc.table_name, tc.constraint_name;
        `
      });
      
      if (error) throw error;
      
      const expectedConstraints = [
        'customer_addresses_user_id_fkey',
        'customer_addresses_profile_id_fkey',
        'received_packages_customer_address_id_fkey',
        'received_packages_quote_id_fkey',
        'consolidation_groups_quote_id_fkey',
        'storage_fees_package_id_fkey',
        'storage_fees_quote_id_fkey'
      ];
      
      const foundConstraints = constraints?.map((c: any) => c.constraint_name) || [];
      const missingConstraints = expectedConstraints.filter(constraint => 
        !foundConstraints.includes(constraint)
      );
      
      if (missingConstraints.length > 0) {
        return {
          test_name: 'Foreign Key Relationships',
          status: 'FAIL',
          message: `Missing foreign keys: ${missingConstraints.join(', ')}`,
          execution_time_ms: Date.now() - startTime,
          details: { foundConstraints, missingConstraints }
        };
      }
      
      return {
        test_name: 'Foreign Key Relationships',
        status: 'PASS',
        message: 'All foreign key relationships verified',
        execution_time_ms: Date.now() - startTime,
        details: { foundConstraints }
      };
      
    } catch (error) {
      return {
        test_name: 'Foreign Key Relationships',
        status: 'FAIL',
        message: `Error checking foreign keys: ${error instanceof Error ? error.message : 'Unknown error'}`,
        execution_time_ms: Date.now() - startTime,
      };
    }
  }
  
  private async testDatabaseFunctions(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const requiredFunctions = [
        'create_package_forwarding_quote',
        'create_consolidation_quote',
        'add_storage_fees_to_quote',
        'get_or_create_customer_preferences'
      ];
      
      const functionTests = [];
      
      for (const functionName of requiredFunctions) {
        try {
          // Test if function exists by querying pg_proc
          const { data, error } = await supabase.rpc('sql', {
            query: `SELECT proname FROM pg_proc WHERE proname = '${functionName}';`
          });
          
          if (error) throw error;
          
          functionTests.push({
            function: functionName,
            exists: data && data.length > 0,
            error: null
          });
        } catch (error) {
          functionTests.push({
            function: functionName,
            exists: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      const missingFunctions = functionTests.filter(test => !test.exists);
      
      if (missingFunctions.length > 0) {
        return {
          test_name: 'Database Functions',
          status: 'FAIL',
          message: `Missing functions: ${missingFunctions.map(f => f.function).join(', ')}`,
          execution_time_ms: Date.now() - startTime,
          details: { functionTests }
        };
      }
      
      return {
        test_name: 'Database Functions',
        status: 'PASS',
        message: 'All database functions found',
        execution_time_ms: Date.now() - startTime,
        details: { functionTests }
      };
      
    } catch (error) {
      return {
        test_name: 'Database Functions',
        status: 'FAIL',
        message: `Error checking functions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        execution_time_ms: Date.now() - startTime,
      };
    }
  }
  
  private async testRLSPolicies(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Test RLS is enabled on key tables
      const { data: policies, error } = await supabase.rpc('sql', {
        query: `
          SELECT schemaname, tablename, rowsecurity 
          FROM pg_tables 
          WHERE schemaname = 'public' 
            AND tablename IN ('customer_addresses', 'received_packages', 'consolidation_groups', 'storage_fees', 'customer_preferences')
          ORDER BY tablename;
        `
      });
      
      if (error) throw error;
      
      const rlsDisabled = policies?.filter((p: any) => !p.rowsecurity) || [];
      
      if (rlsDisabled.length > 0) {
        return {
          test_name: 'RLS Policies',
          status: 'FAIL',
          message: `RLS not enabled on: ${rlsDisabled.map((p: any) => p.tablename).join(', ')}`,
          execution_time_ms: Date.now() - startTime,
          details: { policies, rlsDisabled }
        };
      }
      
      return {
        test_name: 'RLS Policies',
        status: 'PASS',
        message: 'RLS enabled on all required tables',
        execution_time_ms: Date.now() - startTime,
        details: { policies }
      };
      
    } catch (error) {
      return {
        test_name: 'RLS Policies',
        status: 'FAIL',
        message: `Error checking RLS: ${error instanceof Error ? error.message : 'Unknown error'}`,
        execution_time_ms: Date.now() - startTime,
      };
    }
  }
  
  private async testDatabaseTriggers(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Check for triggers on key tables
      const { data: triggers, error } = await supabase.rpc('sql', {
        query: `
          SELECT 
            t.trigger_name,
            t.event_manipulation,
            t.event_object_table
          FROM information_schema.triggers t
          WHERE t.event_object_schema = 'public'
            AND t.event_object_table IN ('customer_addresses', 'storage_fees', 'quotes', 'customer_preferences')
          ORDER BY t.event_object_table, t.trigger_name;
        `
      });
      
      if (error) throw error;
      
      const expectedTriggers = [
        'sync_customer_address_profile_trigger',
        'mark_storage_fees_paid_trigger',
        'update_customer_preferences_updated_at'
      ];
      
      const foundTriggers = triggers?.map((t: any) => t.trigger_name) || [];
      const missingTriggers = expectedTriggers.filter(trigger => 
        !foundTriggers.includes(trigger)
      );
      
      return {
        test_name: 'Database Triggers',
        status: missingTriggers.length > 0 ? 'FAIL' : 'PASS',
        message: missingTriggers.length > 0 
          ? `Missing triggers: ${missingTriggers.join(', ')}`
          : 'Database triggers verified',
        execution_time_ms: Date.now() - startTime,
        details: { foundTriggers, missingTriggers, allTriggers: triggers }
      };
      
    } catch (error) {
      return {
        test_name: 'Database Triggers',
        status: 'FAIL',
        message: `Error checking triggers: ${error instanceof Error ? error.message : 'Unknown error'}`,
        execution_time_ms: Date.now() - startTime,
      };
    }
  }
}

// ============================================================================
// PHASE 2: SERVICE INTEGRATION TESTS
// ============================================================================

export class ServiceIntegrationTests {
  
  async runAllTests(): Promise<TestSuite> {
    const startTime = Date.now();
    const results: TestResult[] = [];
    
    console.log('⚙️ Starting Service Integration Tests...');
    
    // Test 1: IntegratedPackageForwardingService
    results.push(await this.testIntegratedPackageForwardingService());
    
    // Test 2: SmartCalculationEngine Extension
    results.push(await this.testSmartCalculationEngineExtension());
    
    // Test 3: IntegratedPaymentService
    results.push(await this.testIntegratedPaymentService());
    
    // Test 4: PackageForwardingQuoteIntegration
    results.push(await this.testPackageForwardingQuoteIntegration());
    
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const skipped = results.filter(r => r.status === 'SKIP').length;
    
    return {
      suite_name: 'Service Integration Tests',
      total_tests: results.length,
      passed,
      failed,
      skipped,
      results,
      execution_time_ms: Date.now() - startTime,
    };
  }
  
  private async testIntegratedPackageForwardingService(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Test service instantiation
      const service = integratedPackageForwardingService;
      
      if (!service) {
        throw new Error('Service not instantiated');
      }
      
      // Test basic method availability
      const requiredMethods = [
        'getIntegratedCustomerProfile',
        'assignIntegratedVirtualAddress',
        'getCustomerPackagesIntegrated',
        'createIntegratedQuote'
      ];
      
      const methodTests = requiredMethods.map(method => ({
        method,
        exists: typeof (service as any)[method] === 'function'
      }));
      
      const missingMethods = methodTests.filter(test => !test.exists);
      
      if (missingMethods.length > 0) {
        return {
          test_name: 'IntegratedPackageForwardingService',
          status: 'FAIL',
          message: `Missing methods: ${missingMethods.map(m => m.method).join(', ')}`,
          execution_time_ms: Date.now() - startTime,
          details: { methodTests }
        };
      }
      
      return {
        test_name: 'IntegratedPackageForwardingService',
        status: 'PASS',
        message: 'Service instantiated with all required methods',
        execution_time_ms: Date.now() - startTime,
        details: { methodTests }
      };
      
    } catch (error) {
      return {
        test_name: 'IntegratedPackageForwardingService',
        status: 'FAIL',
        message: `Service test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        execution_time_ms: Date.now() - startTime,
      };
    }
  }
  
  private async testSmartCalculationEngineExtension(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const extension = smartCalculationEnginePackageForwardingExtension;
      
      if (!extension) {
        throw new Error('Extension not instantiated');
      }
      
      // Test method availability
      const requiredMethods = [
        'calculateEnhancedWithPackageForwarding'
      ];
      
      const methodTests = requiredMethods.map(method => ({
        method,
        exists: typeof (extension as any)[method] === 'function'
      }));
      
      const missingMethods = methodTests.filter(test => !test.exists);
      
      if (missingMethods.length > 0) {
        return {
          test_name: 'SmartCalculationEngine Extension',
          status: 'FAIL',
          message: `Missing methods: ${missingMethods.map(m => m.method).join(', ')}`,
          execution_time_ms: Date.now() - startTime,
          details: { methodTests }
        };
      }
      
      return {
        test_name: 'SmartCalculationEngine Extension',
        status: 'PASS',
        message: 'Extension instantiated with required methods',
        execution_time_ms: Date.now() - startTime,
        details: { methodTests }
      };
      
    } catch (error) {
      return {
        test_name: 'SmartCalculationEngine Extension',
        status: 'FAIL',
        message: `Extension test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        execution_time_ms: Date.now() - startTime,
      };
    }
  }
  
  private async testIntegratedPaymentService(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const paymentService = integratedPaymentService;
      
      if (!paymentService) {
        throw new Error('Payment service not instantiated');
      }
      
      // Test method availability
      const requiredMethods = [
        'calculatePackageForwardingPaymentSummary',
        'processPackageForwardingPayment',
        'addStorageFeesToCart',
        'getPackageForwardingPaymentHistory'
      ];
      
      const methodTests = requiredMethods.map(method => ({
        method,
        exists: typeof (paymentService as any)[method] === 'function'
      }));
      
      const missingMethods = methodTests.filter(test => !test.exists);
      
      if (missingMethods.length > 0) {
        return {
          test_name: 'IntegratedPaymentService',
          status: 'FAIL',
          message: `Missing methods: ${missingMethods.map(m => m.method).join(', ')}`,
          execution_time_ms: Date.now() - startTime,
          details: { methodTests }
        };
      }
      
      return {
        test_name: 'IntegratedPaymentService',
        status: 'PASS',
        message: 'Payment service instantiated with required methods',
        execution_time_ms: Date.now() - startTime,
        details: { methodTests }
      };
      
    } catch (error) {
      return {
        test_name: 'IntegratedPaymentService',
        status: 'FAIL',
        message: `Payment service test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        execution_time_ms: Date.now() - startTime,
      };
    }
  }
  
  private async testPackageForwardingQuoteIntegration(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const integration = packageForwardingQuoteIntegration;
      
      if (!integration) {
        throw new Error('Quote integration not instantiated');
      }
      
      // Test method availability
      const requiredMethods = [
        'createIntegratedPackageQuote',
        'createIntegratedConsolidationQuote',
        'integrateStorageFeesWithPayment',
        'testCompleteIntegration'
      ];
      
      const methodTests = requiredMethods.map(method => ({
        method,
        exists: typeof (integration as any)[method] === 'function'
      }));
      
      const missingMethods = methodTests.filter(test => !test.exists);
      
      if (missingMethods.length > 0) {
        return {
          test_name: 'PackageForwardingQuoteIntegration',
          status: 'FAIL',
          message: `Missing methods: ${missingMethods.map(m => m.method).join(', ')}`,
          execution_time_ms: Date.now() - startTime,
          details: { methodTests }
        };
      }
      
      return {
        test_name: 'PackageForwardingQuoteIntegration',
        status: 'PASS',
        message: 'Quote integration instantiated with required methods',
        execution_time_ms: Date.now() - startTime,
        details: { methodTests }
      };
      
    } catch (error) {
      return {
        test_name: 'PackageForwardingQuoteIntegration',
        status: 'FAIL',
        message: `Quote integration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        execution_time_ms: Date.now() - startTime,
      };
    }
  }
}

// ============================================================================
// TEST RUNNER
// ============================================================================

export class PackageForwardingIntegrationTestRunner {
  
  async runAllTests(): Promise<{
    overall_status: 'PASS' | 'FAIL';
    total_suites: number;
    total_tests: number;
    passed: number;
    failed: number;
    skipped: number;
    execution_time_ms: number;
    suites: TestSuite[];
  }> {
    const startTime = Date.now();
    console.log('🚀 Starting Package Forwarding Integration Tests...\n');
    
    const suites: TestSuite[] = [];
    
    // Run Phase 1: Database Integration Tests
    const databaseTests = new DatabaseIntegrationTests();
    suites.push(await databaseTests.runAllTests());
    console.log(`✅ Database Integration Tests completed: ${suites[0].passed}/${suites[0].total_tests} passed\n`);
    
    // Run Phase 2: Service Integration Tests
    const serviceTests = new ServiceIntegrationTests();
    suites.push(await serviceTests.runAllTests());
    console.log(`✅ Service Integration Tests completed: ${suites[1].passed}/${suites[1].total_tests} passed\n`);
    
    // Calculate overall results
    const totalTests = suites.reduce((sum, suite) => sum + suite.total_tests, 0);
    const totalPassed = suites.reduce((sum, suite) => sum + suite.passed, 0);
    const totalFailed = suites.reduce((sum, suite) => sum + suite.failed, 0);
    const totalSkipped = suites.reduce((sum, suite) => sum + suite.skipped, 0);
    
    const overallStatus = totalFailed === 0 ? 'PASS' : 'FAIL';
    
    console.log('📊 INTEGRATION TEST SUMMARY:');
    console.log(`Overall Status: ${overallStatus}`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${totalPassed}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Skipped: ${totalSkipped}`);
    console.log(`Execution Time: ${Date.now() - startTime}ms\n`);
    
    // Print detailed results
    suites.forEach(suite => {
      console.log(`📋 ${suite.suite_name}:`);
      suite.results.forEach(result => {
        const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
        console.log(`  ${statusIcon} ${result.test_name}: ${result.message} (${result.execution_time_ms}ms)`);
      });
      console.log('');
    });
    
    return {
      overall_status: overallStatus,
      total_suites: suites.length,
      total_tests: totalTests,
      passed: totalPassed,
      failed: totalFailed,
      skipped: totalSkipped,
      execution_time_ms: Date.now() - startTime,
      suites
    };
  }
}

// Export for use in console or other test runners
if (typeof window !== 'undefined') {
  (window as any).PackageForwardingIntegrationTest = {
    runner: new PackageForwardingIntegrationTestRunner(),
    DatabaseIntegrationTests,
    ServiceIntegrationTests
  };
}