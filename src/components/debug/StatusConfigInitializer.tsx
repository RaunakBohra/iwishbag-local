import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { CheckCircle, AlertTriangle, RefreshCw, Database, Settings, TestTube } from 'lucide-react';

interface StatusConfig {
  id: string;
  name: string;
  label: string;
  description: string;
  color: 'default' | 'secondary' | 'outline' | 'destructive';
  icon: string;
  isActive: boolean;
  order: number;
  allowedTransitions: string[];
  isTerminal: boolean;
  category: 'quote' | 'order';
  triggersEmail?: boolean;
  emailTemplate?: string;
  requiresAction?: boolean;
  showsInQuotesList?: boolean;
  showsInOrdersList?: boolean;
  canBePaid?: boolean;
  isDefaultQuoteStatus?: boolean;
  allowCartActions?: boolean;
  countsAsOrder?: boolean;
  isSuccessful?: boolean;
  customerMessage?: string;
  customerActionText?: string;
  autoExpireHours?: number;
}

const defaultQuoteStatuses: StatusConfig[] = [
  {
    id: 'pending',
    name: 'pending',
    label: 'Pending',
    description: 'Quote request is awaiting review',
    color: 'secondary',
    icon: 'Clock',
    isActive: true,
    order: 1,
    allowedTransitions: ['sent', 'rejected'],
    isTerminal: false,
    category: 'quote',
    triggersEmail: false,
    requiresAction: true,
    showsInQuotesList: true,
    showsInOrdersList: false,
    canBePaid: false,
    isDefaultQuoteStatus: true,
  },
  {
    id: 'sent',
    name: 'sent',
    label: 'Sent',
    description: 'Quote has been sent to customer',
    color: 'outline',
    icon: 'FileText',
    isActive: true,
    order: 2,
    allowedTransitions: ['approved', 'rejected', 'expired'],
    autoExpireHours: 168,
    isTerminal: false,
    category: 'quote',
    triggersEmail: true,
    emailTemplate: 'quote_sent',
    requiresAction: false,
    showsInQuotesList: true,
    showsInOrdersList: false,
    canBePaid: false,
  },
  {
    id: 'approved',
    name: 'approved',
    label: 'Approved',
    description: 'Customer has approved the quote',
    color: 'default',
    icon: 'CheckCircle',
    isActive: true,
    order: 3,
    allowedTransitions: ['rejected', 'payment_pending', 'paid'],
    isTerminal: false,
    category: 'quote',
    triggersEmail: true,
    emailTemplate: 'quote_approved',
    requiresAction: false,
    showsInQuotesList: true,
    showsInOrdersList: false,
    canBePaid: true,
    allowCartActions: true,
  },
  {
    id: 'rejected',
    name: 'rejected',
    label: 'Rejected',
    description: 'Quote has been rejected',
    color: 'destructive',
    icon: 'XCircle',
    isActive: true,
    order: 4,
    allowedTransitions: ['approved'],
    isTerminal: true,
    category: 'quote',
    triggersEmail: true,
    emailTemplate: 'quote_rejected',
    requiresAction: false,
    showsInQuotesList: true,
    showsInOrdersList: false,
    canBePaid: false,
  },
  {
    id: 'expired',
    name: 'expired',
    label: 'Expired',
    description: 'Quote has expired',
    color: 'destructive',
    icon: 'AlertTriangle',
    isActive: true,
    order: 5,
    allowedTransitions: ['approved'],
    isTerminal: true,
    category: 'quote',
    triggersEmail: true,
    emailTemplate: 'quote_expired',
    requiresAction: false,
    showsInQuotesList: true,
    showsInOrdersList: false,
    canBePaid: false,
  },
];

const defaultOrderStatuses: StatusConfig[] = [
  {
    id: 'payment_pending',
    name: 'payment_pending',
    label: 'Awaiting Payment',
    description: 'Order placed, awaiting payment verification',
    color: 'outline',
    icon: 'Clock',
    isActive: true,
    order: 1,
    allowedTransitions: ['paid', 'ordered', 'cancelled'],
    isTerminal: false,
    category: 'order',
    triggersEmail: true,
    emailTemplate: 'payment_instructions',
    requiresAction: false,
    showsInQuotesList: false, // CRITICAL: Should NOT show in quotes list
    showsInOrdersList: true, // CRITICAL: Should show in orders list
    canBePaid: false,
    countsAsOrder: true,
    customerMessage: 'Order placed - Please complete payment',
    customerActionText: 'Pay Now',
  },
  {
    id: 'processing',
    name: 'processing',
    label: 'Processing',
    description: 'Order is being processed and prepared for fulfillment',
    color: 'secondary',
    icon: 'RefreshCw',
    isActive: true,
    order: 2,
    allowedTransitions: ['ordered', 'shipped', 'cancelled'],
    isTerminal: false,
    category: 'order',
    triggersEmail: true,
    emailTemplate: 'order_processing',
    requiresAction: true,
    showsInQuotesList: false,
    showsInOrdersList: true,
    canBePaid: false,
  },
  {
    id: 'paid',
    name: 'paid',
    label: 'Paid',
    description: 'Payment has been received',
    color: 'default',
    icon: 'DollarSign',
    isActive: true,
    order: 3,
    allowedTransitions: ['ordered', 'cancelled'],
    isTerminal: false,
    category: 'order',
    triggersEmail: true,
    emailTemplate: 'payment_received',
    requiresAction: true,
    showsInQuotesList: false,
    showsInOrdersList: true,
    canBePaid: false,
    countsAsOrder: true,
  },
  {
    id: 'ordered',
    name: 'ordered',
    label: 'Ordered',
    description: 'Order has been placed with merchant',
    color: 'default',
    icon: 'ShoppingCart',
    isActive: true,
    order: 4,
    allowedTransitions: ['shipped', 'cancelled'],
    isTerminal: false,
    category: 'order',
    triggersEmail: true,
    emailTemplate: 'order_placed',
    requiresAction: false,
    showsInQuotesList: false,
    showsInOrdersList: true,
    canBePaid: false,
  },
  {
    id: 'shipped',
    name: 'shipped',
    label: 'Shipped',
    description: 'Order has been shipped',
    color: 'secondary',
    icon: 'Truck',
    isActive: true,
    order: 5,
    allowedTransitions: ['completed', 'cancelled'],
    isTerminal: false,
    category: 'order',
    triggersEmail: true,
    emailTemplate: 'order_shipped',
    requiresAction: false,
    showsInQuotesList: false,
    showsInOrdersList: true,
    canBePaid: false,
    countsAsOrder: true,
  },
  {
    id: 'completed',
    name: 'completed',
    label: 'Completed',
    description: 'Order has been delivered',
    color: 'outline',
    icon: 'CheckCircle',
    isActive: true,
    order: 6,
    allowedTransitions: [],
    isTerminal: true,
    category: 'order',
    triggersEmail: true,
    emailTemplate: 'order_completed',
    requiresAction: false,
    showsInQuotesList: false,
    showsInOrdersList: true,
    canBePaid: false,
    countsAsOrder: true,
    isSuccessful: true,
  },
  {
    id: 'cancelled',
    name: 'cancelled',
    label: 'Cancelled',
    description: 'Quote or order has been cancelled',
    color: 'destructive',
    icon: 'XCircle',
    isActive: true,
    order: 7,
    allowedTransitions: [],
    isTerminal: true,
    category: 'order',
    triggersEmail: true,
    emailTemplate: 'order_cancelled',
    requiresAction: false,
    showsInQuotesList: true,
    showsInOrdersList: true,
    canBePaid: false,
  },
];

export const StatusConfigInitializer: React.FC = () => {
  const { user } = useAuth();
  const { data: isAdmin, isLoading: isAdminLoading } = useAdminRole();
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isCreatingTestData, setIsCreatingTestData] = useState(false);
  const [diagnostics, setDiagnostics] = useState<{
    hasConfigs: boolean;
    quotesCount: number;
    ordersCount: number;
    paymentPendingQuotes: number;
    paymentPendingInQuotesList: boolean;
    paymentPendingInOrdersList: boolean;
  } | null>(null);

  const initializeConfigurations = async () => {
    if (!isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'You need admin privileges to initialize status configurations',
        variant: 'destructive',
      });
      return;
    }

    setIsInitializing(true);
    try {
      // Insert quote statuses
      const { error: quoteError } = await supabase.from('system_settings').upsert(
        {
          setting_key: 'quote_statuses',
          setting_value: JSON.stringify(defaultQuoteStatuses),
          description: 'Quote status configurations',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'setting_key',
        },
      );

      if (quoteError) throw quoteError;

      // Insert order statuses
      const { error: orderError } = await supabase.from('system_settings').upsert(
        {
          setting_key: 'order_statuses',
          setting_value: JSON.stringify(defaultOrderStatuses),
          description: 'Order status configurations',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'setting_key',
        },
      );

      if (orderError) throw orderError;

      toast({
        title: 'Success',
        description: 'Status configurations initialized successfully',
      });

      // Run diagnostics after initialization
      await runDiagnostics();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error initializing configurations:', error);
      toast({
        title: 'Initialization Failed',
        description: errorMessage || 'Failed to initialize status configurations',
        variant: 'destructive',
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const runDiagnostics = async () => {
    setIsChecking(true);
    try {
      // Check if configurations exist
      const { data: settings, error: settingsError } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', ['quote_statuses', 'order_statuses']);

      if (settingsError) throw settingsError;

      const hasConfigs = settings?.length === 2;

      // Get all quotes
      const { data: allQuotes, error: quotesError } = await supabase
        .from('quotes')
        .select('id, status')
        .eq('user_id', user?.id);

      if (quotesError) throw quotesError;

      const quotes = allQuotes || [];
      const paymentPendingQuotes = quotes.filter((q) => q.status === 'payment_pending');

      // Simulate filtering logic if configurations exist
      let paymentPendingInQuotesList = false;
      let paymentPendingInOrdersList = false;

      if (hasConfigs) {
        const quoteSettings = settings?.find((s) => s.setting_key === 'quote_statuses');
        const orderSettings = settings?.find((s) => s.setting_key === 'order_statuses');

        if (quoteSettings && orderSettings) {
          const quoteStatuses = JSON.parse(quoteSettings.setting_value);
          const orderStatuses = JSON.parse(orderSettings.setting_value);

          const quotesListStatuses = quoteStatuses
            .filter((s: StatusConfig) => s.showsInQuotesList)
            .map((s: StatusConfig) => s.name);

          const ordersListStatuses = orderStatuses
            .filter((s: StatusConfig) => s.showsInOrdersList)
            .map((s: StatusConfig) => s.name);

          paymentPendingInQuotesList = quotesListStatuses.includes('payment_pending');
          paymentPendingInOrdersList = ordersListStatuses.includes('payment_pending');
        }
      }

      setDiagnostics({
        hasConfigs,
        quotesCount: quotes.length,
        ordersCount: quotes.filter((q) =>
          ['payment_pending', 'paid', 'ordered', 'shipped', 'completed'].includes(q.status),
        ).length,
        paymentPendingQuotes: paymentPendingQuotes.length,
        paymentPendingInQuotesList,
        paymentPendingInOrdersList,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error running diagnostics:', error);
      toast({
        title: 'Diagnostics Failed',
        description: errorMessage || 'Failed to run diagnostics',
        variant: 'destructive',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const createTestData = async () => {
    if (!isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'You need admin privileges to create test data',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingTestData(true);
    try {
      const testQuotes = [
        {
          user_id: user?.id,
          product_name: 'Test Product - Pending Quote',
          status: 'pending',
          final_total: 100.0,
          destination_country: 'US',
        },
        {
          user_id: user?.id,
          product_name: 'Test Product - Approved Quote',
          status: 'approved',
          final_total: 150.0,
          destination_country: 'US',
        },
        {
          user_id: user?.id,
          product_name: 'Test Product - Payment Pending Order',
          status: 'payment_pending',
          final_total: 200.0,
          destination_country: 'US',
        },
        {
          user_id: user?.id,
          product_name: 'Test Product - Paid Order',
          status: 'paid',
          final_total: 250.0,
          destination_country: 'US',
        },
      ];

      const { data: createdQuotes, error } = await supabase
        .from('quotes')
        .insert(testQuotes)
        .select('id, status, product_name');

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Created ${createdQuotes?.length || 0} test quotes`,
      });

      // Run diagnostics after creating test data
      await runDiagnostics();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error creating test data:', error);
      toast({
        title: 'Test Data Creation Failed',
        description: errorMessage || 'Failed to create test data',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingTestData(false);
    }
  };

  if (isAdminLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!user) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>You need to be logged in to use this tool.</AlertDescription>
      </Alert>
    );
  }

  if (!isAdmin) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You need admin privileges to use this status configuration tool.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Status Configuration Initializer & Debugger
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={initializeConfigurations}
              disabled={isInitializing}
              className="flex items-center gap-2"
            >
              {isInitializing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              Initialize Configurations
            </Button>

            <Button
              onClick={runDiagnostics}
              disabled={isChecking}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isChecking ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Run Diagnostics
            </Button>

            <Button
              onClick={createTestData}
              disabled={isCreatingTestData}
              variant="secondary"
              className="flex items-center gap-2"
            >
              {isCreatingTestData ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
              Create Test Data
            </Button>
          </div>

          {diagnostics && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3">Diagnostic Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Status configurations exist:</span>
                    <span className={diagnostics.hasConfigs ? 'text-green-600' : 'text-red-600'}>
                      {diagnostics.hasConfigs ? '✅ Yes' : '❌ No'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Total quotes:</span>
                    <span>{diagnostics.quotesCount}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Total orders:</span>
                    <span>{diagnostics.ordersCount}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Payment pending quotes:</span>
                    <span>{diagnostics.paymentPendingQuotes}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>payment_pending in quotes list:</span>
                    <span
                      className={
                        diagnostics.paymentPendingInQuotesList ? 'text-red-600' : 'text-green-600'
                      }
                    >
                      {diagnostics.paymentPendingInQuotesList ? '❌ Yes (Issue!)' : '✅ No'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>payment_pending in orders list:</span>
                    <span
                      className={
                        diagnostics.paymentPendingInOrdersList ? 'text-green-600' : 'text-red-600'
                      }
                    >
                      {diagnostics.paymentPendingInOrdersList ? '✅ Yes' : '❌ No (Issue!)'}
                    </span>
                  </div>

                  {!diagnostics.paymentPendingInOrdersList ||
                  diagnostics.paymentPendingInQuotesList ? (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Configuration issue detected! Initialize configurations to fix.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="mt-2">
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription className="text-green-700">
                        Configuration is correct! payment_pending items will show in orders list
                        only.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 p-4 bg-teal-50 rounded-lg">
            <h4 className="font-medium mb-2">How this fixes the issue:</h4>
            <ul className="text-sm space-y-1 text-teal-800">
              <li>• Initializes proper status configurations in the database</li>
              <li>
                • Sets <code>payment_pending</code> status to show only in orders list
              </li>
              <li>
                • Ensures quotes with <code>payment_pending</code> status appear in orders, not
                quotes
              </li>
              <li>• Creates test data to verify the fix works correctly</li>
              <li>• Provides diagnostics to confirm the configuration is working</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
