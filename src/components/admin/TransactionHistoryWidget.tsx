import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { 
  Receipt, 
  RefreshCcw, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  Building,
  DollarSign,
  FileText,
  Download
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TransactionHistoryWidgetProps {
  quoteId: string;
  finalTotal: number;
  currency: string;
}

export const TransactionHistoryWidget: React.FC<TransactionHistoryWidgetProps> = ({
  quoteId,
  finalTotal,
  currency
}) => {
  const [activeTab, setActiveTab] = useState('all');

  // Mock data for demonstration - replace with actual query
  const transactions = [
    {
      id: '1',
      type: 'payment',
      method: 'bank_transfer',
      amount: 5000,
      date: new Date('2025-01-10'),
      status: 'completed',
      reference: 'BT-12345',
      description: 'Bank transfer payment',
      gateway: 'Bank Transfer'
    },
    {
      id: '2',
      type: 'payment',
      method: 'payu',
      amount: 3000,
      date: new Date('2025-01-11'),
      status: 'completed',
      reference: 'PU-67890',
      description: 'PayU payment',
      gateway: 'PayU'
    },
    {
      id: '3',
      type: 'refund',
      method: 'payu',
      amount: -500,
      date: new Date('2025-01-12'),
      status: 'completed',
      reference: 'RF-11111',
      description: 'Partial refund - overpayment',
      gateway: 'PayU'
    },
    {
      id: '4',
      type: 'adjustment',
      method: 'manual',
      amount: -200,
      date: new Date('2025-01-13'),
      status: 'completed',
      reference: 'ADJ-22222',
      description: 'Price adjustment - shipping discount',
      gateway: 'Manual'
    }
  ];

  const totalPaid = transactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const balance = finalTotal - totalPaid;

  const getTransactionIcon = (type: string, method: string) => {
    if (type === 'refund') return <RefreshCcw className="h-4 w-4 text-red-500" />;
    if (method === 'bank_transfer') return <Building className="h-4 w-4 text-blue-500" />;
    if (method.includes('payu') || method.includes('stripe')) return <CreditCard className="h-4 w-4 text-green-500" />;
    if (type === 'adjustment') return <FileText className="h-4 w-4 text-orange-500" />;
    return <DollarSign className="h-4 w-4 text-gray-500" />;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: { variant: 'default', className: 'bg-green-100 text-green-800' },
      pending: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800' },
      failed: { variant: 'destructive', className: 'bg-red-100 text-red-800' },
      processing: { variant: 'outline', className: 'bg-blue-100 text-blue-800' }
    };
    
    const config = variants[status] || variants.pending;
    return <Badge {...config}>{status}</Badge>;
  };

  const filteredTransactions = activeTab === 'all' 
    ? transactions 
    : transactions.filter(t => t.type === activeTab);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Complete Transaction History</CardTitle>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Financial Summary */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Order Total</p>
              <p className="font-semibold text-lg">{currency} {finalTotal.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Paid</p>
              <p className="font-semibold text-lg text-green-600">
                {currency} {Math.abs(totalPaid).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Adjustments</p>
              <p className="font-semibold text-lg text-orange-600">
                {currency} {transactions
                  .filter(t => t.type === 'adjustment')
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Balance</p>
              <p className={`font-semibold text-lg ${
                balance > 0 ? 'text-red-600' : balance < 0 ? 'text-blue-600' : 'text-green-600'
              }`}>
                {currency} {Math.abs(balance).toFixed(2)}
                {balance < 0 && ' (Overpaid)'}
                {balance > 0 && ' (Due)'}
              </p>
            </div>
          </div>
        </div>

        {/* Transaction Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All ({transactions.length})</TabsTrigger>
            <TabsTrigger value="payment">
              Payments ({transactions.filter(t => t.type === 'payment').length})
            </TabsTrigger>
            <TabsTrigger value="refund">
              Refunds ({transactions.filter(t => t.type === 'refund').length})
            </TabsTrigger>
            <TabsTrigger value="adjustment">
              Adjustments ({transactions.filter(t => t.type === 'adjustment').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <div className="space-y-2">
              {filteredTransactions.map((transaction, index) => (
                <div key={transaction.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getTransactionIcon(transaction.type, transaction.method)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {transaction.type === 'payment' && 'Payment Received'}
                            {transaction.type === 'refund' && 'Refund Issued'}
                            {transaction.type === 'adjustment' && 'Adjustment Applied'}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {transaction.gateway}
                          </Badge>
                          {getStatusBadge(transaction.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {transaction.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Ref: {transaction.reference}</span>
                          <span>{format(transaction.date, 'MMM dd, yyyy HH:mm')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold text-lg ${
                        transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}{currency} {Math.abs(transaction.amount).toFixed(2)}
                      </p>
                      {/* Running balance */}
                      <p className="text-xs text-muted-foreground mt-1">
                        Balance: {currency} {(finalTotal - transactions
                          .slice(0, index + 1)
                          .reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Multiple Payment Warning */}
        {transactions.filter(t => t.type === 'payment').length > 1 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Multiple Payments Detected</p>
                <p className="text-amber-700 text-xs mt-1">
                  This order has {transactions.filter(t => t.type === 'payment').length} payment transactions
                  from different sources. All transactions have been recorded in the ledger.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};