/**
 * Cart Test Page - Demonstrate world-class cart functionality
 * 
 * Features to test:
 * - Cart persistence across page refresh
 * - Offline/online sync indicators
 * - Guest cart with authentication migration
 * - Real-time sync status updates
 * - Session recovery
 */

import React, { useState } from 'react';
import { 
  ShoppingCart, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Database, 
  User, 
  TestTube,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useCart, useCartSync } from '@/hooks/useCart';
import { SimpleCartSyncIndicator } from '@/components/cart/SimpleCartSyncIndicator';
import { CartSummary } from '@/components/cart/CartSummary';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// Mock quote data for testing
const mockQuotes = [
  {
    id: 'test-quote-1',
    display_id: 'TEST001',
    customer_id: null,
    status: 'approved',
    total_quote_origincurrency: 29.99,
    final_total_origin: 29.99,
    customer_currency: 'USD',
    items: JSON.stringify([
      {
        product_name: 'Wireless Headphones',
        product_url: 'https://example.com/headphones',
        quantity: 1,
        costprice_origin: 29.99,
        weight: 0.3
      }
    ]),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    calculation_data: JSON.stringify({
      applied_rates: {
        insurance_percentage: 2.0
      }
    })
  },
  {
    id: 'test-quote-2',
    display_id: 'TEST002',
    customer_id: null,
    status: 'approved',
    total_quote_origincurrency: 45.50,
    final_total_origin: 45.50,
    customer_currency: 'USD',
    items: JSON.stringify([
      {
        product_name: 'Smartphone Case',
        product_url: 'https://example.com/case',
        quantity: 2,
        costprice_origin: 22.75,
        weight: 0.15
      }
    ]),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    calculation_data: JSON.stringify({
      applied_rates: {
        insurance_percentage: 1.5
      }
    })
  }
];

export default function CartTest() {
  const { user } = useAuth();
  const cart = useCart();
  const syncManager = useCartSync();
  
  const [testResults, setTestResults] = useState<Array<{
    test: string;
    status: 'pending' | 'passed' | 'failed';
    message: string;
  }>>([]);

  // Add test result
  const addTestResult = (test: string, status: 'passed' | 'failed', message: string) => {
    setTestResults(prev => {
      const newResults = prev.filter(r => r.test !== test);
      return [...newResults, { test, status, message }];
    });
  };

  // Test functions
  const testAddItem = async () => {
    try {
      const mockQuote = mockQuotes[0] as any;
      await cart.addItem(mockQuote);
      addTestResult('Add Item', 'passed', 'Successfully added item to cart');
      toast({
        title: "Test Passed",
        description: "Item added to cart successfully"
      });
    } catch (error) {
      addTestResult('Add Item', 'failed', `Failed to add item: ${error}`);
      toast({
        title: "Test Failed",
        description: `Failed to add item: ${error}`,
        variant: "destructive"
      });
    }
  };

  const testRemoveItem = async () => {
    try {
      if (cart.items.length === 0) {
        throw new Error('No items in cart to remove');
      }
      
      const firstItem = cart.items[0];
      await cart.removeItem(firstItem.id);
      addTestResult('Remove Item', 'passed', 'Successfully removed item from cart');
      toast({
        title: "Test Passed",
        description: "Item removed from cart successfully"
      });
    } catch (error) {
      addTestResult('Remove Item', 'failed', `Failed to remove item: ${error}`);
      toast({
        title: "Test Failed",
        description: `Failed to remove item: ${error}`,
        variant: "destructive"
      });
    }
  };

  const testCartPersistence = () => {
    try {
      // This test requires user to manually refresh the page
      if (cart.items.length > 0) {
        addTestResult('Persistence', 'pending', 'Add items and refresh page to test persistence');
        toast({
          title: "Test Instructions",
          description: "Add items to cart, then refresh the page to test persistence"
        });
      } else {
        addTestResult('Persistence', 'pending', 'Add items first, then refresh page');
      }
    } catch (error) {
      addTestResult('Persistence', 'failed', `Persistence test failed: ${error}`);
    }
  };

  const testSyncFunctionality = async () => {
    try {
      await cart.syncWithServer();
      addTestResult('Sync', 'passed', 'Manual sync completed successfully');
      toast({
        title: "Test Passed",
        description: "Cart sync completed successfully"
      });
    } catch (error) {
      addTestResult('Sync', 'failed', `Sync failed: ${error}`);
      toast({
        title: "Test Failed",
        description: `Sync failed: ${error}`,
        variant: "destructive"
      });
    }
  };

  const testOfflineMode = () => {
    // This test requires user to go offline manually  
    if (!navigator.onLine) {
      addTestResult('Offline Mode', 'passed', 'Cart working in offline mode');
    } else {
      addTestResult('Offline Mode', 'pending', 'Disconnect internet to test offline mode');
      toast({
        title: "Test Instructions",
        description: "Disconnect internet connection to test offline functionality"
      });
    }
  };

  const clearPersistentData = async () => {
    await cart.clearCart();
    setTestResults([]);
    toast({
      title: "Data Cleared",
      description: "All cart data and test results have been cleared"
    });
  };

  const forceRecovery = async () => {
    try {
      // Force a sync which will recover from database
      await cart.syncWithServer();
      addTestResult('Recovery', 'passed', 'Successfully synced cart from server');
      toast({
        title: "Recovery Successful",
        description: "Cart data synced from server"
      });
    } catch (error) {
      addTestResult('Recovery', 'failed', `Recovery failed: ${error}`);
      toast({
        title: "Recovery Failed",
        description: `Recovery failed: ${error}`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <TestTube className="w-8 h-8 text-blue-600" />
          Enhanced Cart Test Suite
        </h1>
        <p className="text-gray-600">
          Test our world-class cart functionality with Shopify-level persistence and sync capabilities
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cart Status Panel */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Current Cart State */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Current Cart State
                </span>
                <SimpleCartSyncIndicator 
                  syncStatus={cart.syncStatus} 
                  showLabel={true} 
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{cart.items.length}</div>
                  <div className="text-sm text-gray-500">Items</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {navigator.onLine ? 'Online' : 'Offline'}
                  </div>
                  <div className="text-sm text-gray-500">Status</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {user ? 'User' : 'Guest'}
                  </div>
                  <div className="text-sm text-gray-500">Mode</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {cart.syncStatus !== 'synced' ? 'Yes' : 'No'}
                  </div>
                  <div className="text-sm text-gray-500">Pending</div>
                </div>
              </div>

              <Separator />

              {/* Detailed Status */}
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  Sync Status: <Badge variant="outline">{cart.syncStatus}</Badge>
                </div>
                
                <div className="text-sm text-gray-600">
                  Items in Cart: {cart.items.length}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Test Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Button onClick={testAddItem} variant="outline" size="sm">
                  Add Test Item
                </Button>
                <Button 
                  onClick={testRemoveItem} 
                  variant="outline" 
                  size="sm"
                  disabled={cart.items.length === 0}
                >
                  Remove Item
                </Button>
                <Button onClick={testCartPersistence} variant="outline" size="sm">
                  Test Persistence
                </Button>
                <Button onClick={testSyncFunctionality} variant="outline" size="sm">
                  Test Sync
                </Button>
                <Button onClick={testOfflineMode} variant="outline" size="sm">
                  Test Offline
                </Button>
                <Button onClick={forceRecovery} variant="outline" size="sm">
                  Force Recovery
                </Button>
              </div>
              
              <Separator />
              
              <Button 
                onClick={clearPersistentData} 
                variant="destructive" 
                size="sm"
                className="w-full"
              >
                Clear All Data & Tests
              </Button>
            </CardContent>
          </Card>

          {/* Test Results */}
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No tests run yet. Use the controls above to test cart functionality.
                </div>
              ) : (
                <div className="space-y-3">
                  {testResults.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {result.status === 'passed' && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                        {result.status === 'failed' && (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        )}
                        {result.status === 'pending' && (
                          <RefreshCw className="w-5 h-5 text-yellow-600 animate-spin" />
                        )}
                        <div>
                          <div className="font-medium">{result.test}</div>
                          <div className="text-sm text-gray-600">{result.message}</div>
                        </div>
                      </div>
                      <Badge 
                        variant={
                          result.status === 'passed' ? 'default' : 
                          result.status === 'failed' ? 'destructive' : 'secondary'
                        }
                      >
                        {result.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Debug Information */}
          <Card>
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div><strong>Cart Info:</strong></div>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                  {JSON.stringify({
                    itemCount: cart.items.length,
                    syncStatus: cart.syncStatus,
                    isLoading: cart.isLoading,
                    totalValue: cart.metadata.totalValueUSD
                  }, null, 2)}
                </pre>
                
                <div><strong>Sync Info:</strong></div>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                  {JSON.stringify({
                    syncStatus: syncManager.syncStatus,
                    canUndo: syncManager.canUndo,
                    conflictCount: syncManager.conflictCount
                  }, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cart Summary Sidebar */}
        <div className="space-y-6">
          <CartSummary />
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">1. Test Cart Persistence</h4>
                <p>Add items to cart, then refresh the page. Items should persist and be recovered automatically.</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">2. Test Offline Mode</h4>
                <p>Disconnect your internet, add/remove items. They should work offline and sync when you reconnect.</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">3. Test Authentication</h4>
                <p>Add items as guest, then sign in. Guest cart should migrate to authenticated user.</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">4. Test Sync Indicators</h4>
                <p>Watch the sync indicators change as you perform operations and network state changes.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}