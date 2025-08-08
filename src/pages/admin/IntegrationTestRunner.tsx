/**
 * Integration Test Runner - Interactive Testing UI
 * 
 * Provides a visual interface to test all integrated services and workflows
 * without needing to use the browser console.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  PlayCircle, 
  CheckCircle, 
  XCircle, 
  RefreshCcw,
  Loader2,
  Bug,
  Zap,
  Database,
  Users,
  Package,
  FileText,
  MessageSquare,
  BarChart3
} from 'lucide-react';

import { masterServiceOrchestrator } from '@/services/MasterServiceOrchestrator';
import { unifiedUserContextService } from '@/services/UnifiedUserContextService';
import { enhancedSupportService } from '@/services/EnhancedSupportService';
import { advancedAnalyticsService } from '@/services/AdvancedAnalyticsService';
import { intelligentWorkflowService } from '@/services/IntelligentWorkflowService';
import { supabase } from '@/integrations/supabase/client';

// Test result type
interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  duration?: number;
  error?: string;
  details?: any;
}

export default function IntegrationTestRunner() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);

  // Update test result
  const updateTest = (name: string, updates: Partial<TestResult>) => {
    setTestResults(prev => prev.map(test => 
      test.name === name ? { ...test, ...updates } : test
    ));
  };

  // Add new test
  const addTest = (name: string) => {
    setTestResults(prev => [...prev, { name, status: 'pending' }]);
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    const tests = [
      testMasterOrchestrator,
      testUserContext,
      testEnhancedSupport,
      testAdvancedAnalytics,
      testWorkflowAutomation,
      testDatabaseConnections,
      testServiceHealth,
      testCrossCommunication,
    ];

    for (const test of tests) {
      await test();
    }

    setIsRunning(false);
  };

  // Individual test functions
  const testMasterOrchestrator = async () => {
    const testName = 'Master Service Orchestrator';
    addTest(testName);
    updateTest(testName, { status: 'running' });
    const startTime = Date.now();

    try {
      // Test service health check
      const health = await masterServiceOrchestrator.getServiceHealth();
      
      // Test quote operation
      const quoteOp = await masterServiceOrchestrator.executeOperation({
        id: 'test-quote-op',
        service: 'quote',
        operation: 'read',
        context: { metadata: { test: true } },
        priority: 'low',
      });

      // Verify results
      if (!health || Object.keys(health).length === 0) {
        throw new Error('Service health check failed');
      }

      updateTest(testName, {
        status: 'passed',
        duration: Date.now() - startTime,
        details: {
          servicesHealthy: Object.values(health).filter((s: any) => s.status === 'healthy').length,
          totalServices: Object.keys(health).length,
        },
      });
    } catch (error) {
      updateTest(testName, {
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
      });
    }
  };

  const testUserContext = async () => {
    const testName = 'Unified User Context';
    addTest(testName);
    updateTest(testName, { status: 'running' });
    const startTime = Date.now();

    try {
      // Get current user context
      const context = await unifiedUserContextService.getCurrentUserContext();
      
      if (!context) {
        throw new Error('Failed to load user context');
      }

      // Test cache refresh
      const refreshed = await unifiedUserContextService.refreshUserContext();

      updateTest(testName, {
        status: 'passed',
        duration: Date.now() - startTime,
        details: {
          userId: context.id,
          role: context.role,
          customerSegment: context.customer_data.customer_segment,
          totalOrders: context.customer_data.total_orders,
        },
      });
    } catch (error) {
      updateTest(testName, {
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
      });
    }
  };

  const testEnhancedSupport = async () => {
    const testName = 'Enhanced Support Service';
    addTest(testName);
    updateTest(testName, { status: 'running' });
    const startTime = Date.now();

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Create test ticket
      const ticket = await enhancedSupportService.createTicketWithContext(
        user.id,
        'general_inquiry',
        'Integration Test Ticket',
        'This is an automated test ticket from the integration test runner.',
        {}
      );

      if (!ticket) {
        throw new Error('Failed to create support ticket');
      }

      // Get ticket messages
      const messages = await enhancedSupportService.getTicketMessages(ticket.id);

      updateTest(testName, {
        status: 'passed',
        duration: Date.now() - startTime,
        details: {
          ticketId: ticket.id,
          priority: ticket.priority,
          contextLoaded: !!ticket.context,
          messagesCount: messages.length,
        },
      });
    } catch (error) {
      updateTest(testName, {
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
      });
    }
  };

  const testAdvancedAnalytics = async () => {
    const testName = 'Advanced Analytics';
    addTest(testName);
    updateTest(testName, { status: 'running' });
    const startTime = Date.now();

    try {
      // Get business metrics
      const metrics = await advancedAnalyticsService.getBusinessMetrics('7d');
      
      // Generate insights
      const insights = await advancedAnalyticsService.generatePredictiveInsights();
      
      // Create segments
      const segments = await advancedAnalyticsService.createCustomerSegments();

      if (!metrics || !insights || !segments) {
        throw new Error('Analytics data generation failed');
      }

      updateTest(testName, {
        status: 'passed',
        duration: Date.now() - startTime,
        details: {
          totalRevenue: metrics.total_revenue,
          insightsGenerated: insights.length,
          segmentsCreated: segments.length,
          topInsightConfidence: insights[0]?.confidence || 0,
        },
      });
    } catch (error) {
      updateTest(testName, {
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
      });
    }
  };

  const testWorkflowAutomation = async () => {
    const testName = 'Workflow Automation';
    addTest(testName);
    updateTest(testName, { status: 'running' });
    const startTime = Date.now();

    try {
      // Get workflow stats
      const stats = await intelligentWorkflowService.getWorkflowStats();
      
      // Test workflow trigger (won't actually execute in test mode)
      await intelligentWorkflowService.triggerWorkflow(
        'quote_created',
        {
          id: 'test-quote-workflow',
          total_amount_usd: 50,
          customer_id: 'test-customer',
        },
        'test-customer'
      );

      updateTest(testName, {
        status: 'passed',
        duration: Date.now() - startTime,
        details: {
          totalRules: stats.total_rules,
          activeRules: stats.active_rules,
          successRate: stats.success_rate,
        },
      });
    } catch (error) {
      updateTest(testName, {
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
      });
    }
  };

  const testDatabaseConnections = async () => {
    const testName = 'Database Connections';
    addTest(testName);
    updateTest(testName, { status: 'running' });
    const startTime = Date.now();

    try {
      // Test various table connections
      const tests = await Promise.all([
        supabase.from('profiles').select('count').limit(1),
        supabase.from('quotes_v2').select('count').limit(1),
        supabase.from('received_packages').select('count').limit(1),
        supabase.from('support_tickets').select('count').limit(1),
      ]);

      const failures = tests.filter(t => t.error);
      if (failures.length > 0) {
        throw new Error(`${failures.length} database queries failed`);
      }

      updateTest(testName, {
        status: 'passed',
        duration: Date.now() - startTime,
        details: {
          tablesChecked: tests.length,
          allConnected: true,
        },
      });
    } catch (error) {
      updateTest(testName, {
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
      });
    }
  };

  const testServiceHealth = async () => {
    const testName = 'Service Health Monitoring';
    addTest(testName);
    updateTest(testName, { status: 'running' });
    const startTime = Date.now();

    try {
      const health = await masterServiceOrchestrator.getServiceHealth();
      const unhealthyServices = Object.entries(health)
        .filter(([_, status]: [string, any]) => status.status !== 'healthy')
        .map(([service]) => service);

      if (unhealthyServices.length > 0) {
        throw new Error(`Unhealthy services: ${unhealthyServices.join(', ')}`);
      }

      updateTest(testName, {
        status: 'passed',
        duration: Date.now() - startTime,
        details: {
          allHealthy: true,
          serviceCount: Object.keys(health).length,
        },
      });
    } catch (error) {
      updateTest(testName, {
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
      });
    }
  };

  const testCrossCommunication = async () => {
    const testName = 'Cross-Service Communication';
    addTest(testName);
    updateTest(testName, { status: 'running' });
    const startTime = Date.now();

    try {
      // Test service orchestration with dependencies
      const result = await masterServiceOrchestrator.executeOperation({
        id: 'test-cross-comm',
        service: 'quote',
        operation: 'calculate',
        context: {
          user_id: 'test-user',
          metadata: {
            quote: {
              items: [{ product_name: 'Test', price: 100 }],
              destination_country: 'US',
            },
          },
        },
        priority: 'medium',
        dependencies: [],
      });

      if (!result.success) {
        throw new Error('Cross-service operation failed');
      }

      updateTest(testName, {
        status: 'passed',
        duration: Date.now() - startTime,
        details: {
          operationSuccess: true,
          cacheHit: result.performance?.cache_hit || false,
          duration: result.performance?.duration_ms || 0,
        },
      });
    } catch (error) {
      updateTest(testName, {
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
      });
    }
  };

  // Get status color
  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'running': return 'text-blue-600';
      default: return 'text-gray-500';
    }
  };

  // Get status icon
  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-5 w-5" />;
      case 'failed': return <XCircle className="h-5 w-5" />;
      case 'running': return <Loader2 className="h-5 w-5 animate-spin" />;
      default: return <PlayCircle className="h-5 w-5" />;
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bug className="h-8 w-8" />
            Integration Test Runner
          </h1>
          <p className="text-muted-foreground">
            Test all integrated services and workflows
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setTestResults([])}
            variant="outline"
            disabled={isRunning}
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Clear Results
          </Button>
          <Button
            onClick={runAllTests}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Run All Tests
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Test Results Summary */}
      {testResults.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{testResults.length}</div>
              <p className="text-sm text-muted-foreground">Total Tests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {testResults.filter(t => t.status === 'passed').length}
              </div>
              <p className="text-sm text-muted-foreground">Passed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {testResults.filter(t => t.status === 'failed').length}
              </div>
              <p className="text-sm text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {testResults.reduce((sum, t) => sum + (t.duration || 0), 0)}ms
              </div>
              <p className="text-sm text-muted-foreground">Total Duration</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Test Results List */}
      <div className="space-y-4">
        {testResults.map((test) => (
          <Card key={test.name} className="cursor-pointer" onClick={() => setSelectedTest(test.name)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={getStatusColor(test.status)}>
                    {getStatusIcon(test.status)}
                  </div>
                  <div>
                    <h3 className="font-semibold">{test.name}</h3>
                    {test.error && (
                      <p className="text-sm text-red-600">{test.error}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {test.duration && (
                    <Badge variant="secondary">{test.duration}ms</Badge>
                  )}
                  <Badge variant={test.status === 'passed' ? 'default' : test.status === 'failed' ? 'destructive' : 'secondary'}>
                    {test.status}
                  </Badge>
                </div>
              </div>
              
              {selectedTest === test.name && test.details && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(test.details, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Test Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Test Actions</CardTitle>
          <CardDescription>Run individual service tests</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="outline" onClick={testMasterOrchestrator}>
            <Zap className="h-4 w-4 mr-2" />
            Orchestrator
          </Button>
          <Button variant="outline" onClick={testUserContext}>
            <Users className="h-4 w-4 mr-2" />
            User Context
          </Button>
          <Button variant="outline" onClick={testEnhancedSupport}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Support
          </Button>
          <Button variant="outline" onClick={testAdvancedAnalytics}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button variant="outline" onClick={testWorkflowAutomation}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Workflows
          </Button>
          <Button variant="outline" onClick={testDatabaseConnections}>
            <Database className="h-4 w-4 mr-2" />
            Database
          </Button>
          <Button variant="outline" onClick={testServiceHealth}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Health
          </Button>
          <Button variant="outline" onClick={testCrossCommunication}>
            <Package className="h-4 w-4 mr-2" />
            Cross-Comm
          </Button>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Alert>
        <AlertDescription>
          <strong>Testing Instructions:</strong>
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Click "Run All Tests" to test all integrations</li>
            <li>Click individual buttons to test specific services</li>
            <li>Click on test results to see detailed output</li>
            <li>All tests are non-destructive and use test data</li>
            <li>Check browser console for additional debug info</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}