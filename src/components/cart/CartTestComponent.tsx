/**
 * Cart Test Component - Simple test component for cart functionality
 */

import React, { useEffect, useState } from 'react';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CartTestComponentProps {
  onTestResult?: (result: string) => void;
}

export function CartTestComponent({ onTestResult }: CartTestComponentProps) {
  const { items, metadata, isLoading, addItem, removeItem, clearCart, hasItem } = useCart();
  const [testResults, setTestResults] = useState<string[]>([]);

  const logResult = (result: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const message = `[${timestamp}] ${result}`;
    setTestResults(prev => [...prev, message]);
    onTestResult?.(message);
    console.log(message);
  };

  useEffect(() => {
    logResult(`✅ Cart hook initialized - Items: ${items.length}, Loading: ${isLoading}`);
  }, []);

  const testQuote = {
    id: 'test-quote-1',
    status: 'approved',
    customer_email: 'test@example.com',
    total_quote_origincurrency: 100,
    customer_currency: 'USD',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: [],
    final_total_origin: 100
  };

  const handleTestAdd = async () => {
    try {
      logResult('🧪 Testing add to cart...');
      await addItem(testQuote as any);
      logResult(`✅ Add successful - Cart now has ${items.length} items`);
    } catch (error: any) {
      logResult(`❌ Add failed: ${error.message}`);
    }
  };

  const handleTestRemove = async () => {
    if (items.length === 0) {
      logResult('⚠️ No items to remove');
      return;
    }

    try {
      logResult('🧪 Testing remove from cart...');
      const firstItem = items[0];
      await removeItem(firstItem.id);
      logResult(`✅ Remove successful - Cart now has ${items.length} items`);
    } catch (error: any) {
      logResult(`❌ Remove failed: ${error.message}`);
    }
  };

  const handleTestClear = async () => {
    try {
      logResult('🧪 Testing clear cart...');
      await clearCart();
      logResult(`✅ Clear successful - Cart now has ${items.length} items`);
    } catch (error: any) {
      logResult(`❌ Clear failed: ${error.message}`);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🛒 Cart System Test</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Cart Status */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Cart Status</h3>
            <div className="text-sm space-y-1">
              <div>Items: {metadata.totalItems}</div>
              <div>Total Value: ${metadata.totalValueUSD.toFixed(2)}</div>
              <div>Currency: {metadata.displayCurrency}</div>
              <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
            </div>
          </div>

          {/* Test Actions */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleTestAdd} size="sm">
              Add Test Item
            </Button>
            <Button onClick={handleTestRemove} size="sm" variant="outline">
              Remove First Item
            </Button>
            <Button onClick={handleTestClear} size="sm" variant="destructive">
              Clear Cart
            </Button>
          </div>

          {/* Cart Items */}
          {items.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Cart Items ({items.length})</h3>
              {items.map((item, index) => (
                <div key={item.id} className="text-sm p-2 bg-gray-50 rounded mb-2">
                  <div>#{index + 1}: {item.id}</div>
                  <div>Price: ${item.metadata?.priceAtAdd || 'N/A'}</div>
                  <div>Added: {item.addedAt.toLocaleString()}</div>
                  <div>Has Item: {hasItem(item.id) ? 'Yes' : 'No'}</div>
                </div>
              ))}
            </div>
          )}

          {/* Test Results */}
          <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
            <h3 className="font-semibold mb-2">Test Results</h3>
            <div className="text-xs font-mono space-y-1">
              {testResults.map((result, index) => (
                <div key={index} className="whitespace-pre-wrap">
                  {result}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}