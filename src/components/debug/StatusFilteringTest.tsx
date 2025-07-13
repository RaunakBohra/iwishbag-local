import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { useDashboardState } from '@/hooks/useDashboardState';
import { CheckCircle, AlertTriangle, RefreshCw, List, Database } from 'lucide-react';

export const StatusFilteringTest: React.FC = () => {
  const { 
    getStatusesForQuotesList, 
    getStatusesForOrdersList,
    quoteStatuses,
    orderStatuses,
    isLoading: statusLoading
  } = useStatusManagement();
  
  const { 
    quotes, 
    orders, 
    allQuotes, 
    isLoading: dataLoading 
  } = useDashboardState();

  const [testResults, setTestResults] = useState<{
    quotesListStatuses: string[];
    ordersListStatuses: string[];
    totalQuotes: number;
    quotesShownInQuotesList: number;
    quotesShownInOrdersList: number;
    paymentPendingTotal: number;
    paymentPendingInQuotes: number;
    paymentPendingInOrders: number;
    isConfigurationCorrect: boolean;
    issues: string[];
  } | null>(null);

  const runTest = () => {
    // Get the filter arrays
    const quotesListStatuses = getStatusesForQuotesList();
    const ordersListStatuses = getStatusesForOrdersList();
    
    // Count items
    const totalQuotes = allQuotes?.length || 0;
    const quotesShownInQuotesList = quotes?.length || 0;
    const quotesShownInOrdersList = orders?.length || 0;
    
    // Count payment_pending specifically
    const paymentPendingTotal = allQuotes?.filter(q => q.status === 'payment_pending').length || 0;
    const paymentPendingInQuotes = quotes?.filter(q => q.status === 'payment_pending').length || 0;
    const paymentPendingInOrders = orders?.filter(q => q.status === 'payment_pending').length || 0;
    
    // Check for issues
    const issues: string[] = [];
    
    if (quotesListStatuses.includes('payment_pending')) {
      issues.push('payment_pending is configured to show in quotes list (should be false)');
    }
    
    if (!ordersListStatuses.includes('payment_pending')) {
      issues.push('payment_pending is NOT configured to show in orders list (should be true)');
    }
    
    if (paymentPendingInQuotes > 0) {
      issues.push(`${paymentPendingInQuotes} payment_pending items are showing in quotes list`);
    }
    
    if (paymentPendingTotal > 0 && paymentPendingInOrders !== paymentPendingTotal) {
      issues.push(`Only ${paymentPendingInOrders} of ${paymentPendingTotal} payment_pending items are showing in orders list`);
    }

    const isConfigurationCorrect = issues.length === 0;

    setTestResults({
      quotesListStatuses,
      ordersListStatuses,
      totalQuotes,
      quotesShownInQuotesList,
      quotesShownInOrdersList,
      paymentPendingTotal,
      paymentPendingInQuotes,
      paymentPendingInOrders,
      isConfigurationCorrect,
      issues
    });
  };

  useEffect(() => {
    if (!statusLoading && !dataLoading) {
      runTest();
    }
  }, [statusLoading, dataLoading, quotes, orders, allQuotes]);

  if (statusLoading || dataLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading status configurations and data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <List className="h-5 w-5" />
          Status Filtering Test Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runTest} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Re-run Test
        </Button>

        {testResults && (
          <div className="space-y-4">
            {/* Overall Status */}
            <Alert className={testResults.isConfigurationCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              {testResults.isConfigurationCorrect ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={testResults.isConfigurationCorrect ? 'text-green-800' : 'text-red-800'}>
                {testResults.isConfigurationCorrect 
                  ? '✅ Status filtering is working correctly!' 
                  : '❌ Status filtering has issues that need attention'}
              </AlertDescription>
            </Alert>

            {/* Issues */}
            {testResults.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-700">Issues Found:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
                  {testResults.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Configuration Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Filter Configurations</h4>
                <div className="text-sm space-y-1">
                  <div>
                    <span className="font-medium">Quotes list statuses:</span>
                    <div className="text-xs text-gray-600 mt-1">
                      [{testResults.quotesListStatuses.join(', ')}]
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Orders list statuses:</span>
                    <div className="text-xs text-gray-600 mt-1">
                      [{testResults.ordersListStatuses.join(', ')}]
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Data Counts</h4>
                <div className="text-sm space-y-1">
                  <div>Total quotes in database: {testResults.totalQuotes}</div>
                  <div>Showing in quotes list: {testResults.quotesShownInQuotesList}</div>
                  <div>Showing in orders list: {testResults.quotesShownInOrdersList}</div>
                </div>
              </div>
            </div>

            {/* Payment Pending Specific */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium mb-2 text-blue-800">Payment Pending Status Check</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Total payment_pending quotes:</span>
                  <span className="font-medium">{testResults.paymentPendingTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>In quotes list:</span>
                  <span className={`font-medium ${testResults.paymentPendingInQuotes > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {testResults.paymentPendingInQuotes} {testResults.paymentPendingInQuotes > 0 ? '❌' : '✅'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>In orders list:</span>
                  <span className={`font-medium ${testResults.paymentPendingInOrders === testResults.paymentPendingTotal ? 'text-green-600' : 'text-red-600'}`}>
                    {testResults.paymentPendingInOrders} {testResults.paymentPendingInOrders === testResults.paymentPendingTotal ? '✅' : '❌'}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Configuration Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Quote Statuses ({quoteStatuses.length})</h4>
                <div className="text-xs space-y-1">
                  {quoteStatuses.map(status => (
                    <div key={status.name} className="flex justify-between">
                      <span>{status.label}</span>
                      <span className={status.showsInQuotesList ? 'text-green-600' : 'text-gray-400'}>
                        {status.showsInQuotesList ? 'Shows in quotes' : 'Hidden'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Order Statuses ({orderStatuses.length})</h4>
                <div className="text-xs space-y-1">
                  {orderStatuses.map(status => (
                    <div key={status.name} className="flex justify-between">
                      <span>{status.label}</span>
                      <span className={status.showsInOrdersList ? 'text-green-600' : 'text-gray-400'}>
                        {status.showsInOrdersList ? 'Shows in orders' : 'Hidden'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};