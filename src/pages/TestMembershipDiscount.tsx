import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MembershipService } from '@/services/MembershipService';
import { DiscountService } from '@/services/DiscountService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Check, X, AlertCircle } from 'lucide-react';

export default function TestMembershipDiscount() {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      runTests();
    }
  }, [user]);

  const runTests = async () => {
    if (!user) {
      toast.error('Please login to test membership and discount features');
      return;
    }

    setLoading(true);
    const results: any = {};

    try {
      // Test 1: Check membership status
      console.log('Testing membership status...');
      const membershipStatus = await MembershipService.checkMembershipStatus(user.id);
      results.membershipStatus = {
        success: true,
        data: membershipStatus
      };

      // Test 2: Get membership plans
      console.log('Testing membership plans...');
      const plans = await MembershipService.getActivePlans();
      results.membershipPlans = {
        success: true,
        data: plans
      };

      // Test 3: Calculate discounts for different scenarios
      console.log('Testing discount calculations...');
      
      // Scenario A: Small order with bank transfer
      const discountA = await DiscountService.getInstance().calculateDiscounts(
        user.id,
        50, // $50 order
        5,  // $5 handling fee
        'bank_transfer',
        'US'
      );
      results.discountScenarioA = {
        success: true,
        data: discountA,
        description: 'Small order ($50) with bank transfer'
      };

      // Scenario B: Large order with credit card
      const discountB = await DiscountService.getInstance().calculateDiscounts(
        user.id,
        500, // $500 order
        50,  // $50 handling fee
        'credit_card',
        'IN'
      );
      results.discountScenarioB = {
        success: true,
        data: discountB,
        description: 'Large order ($500) with credit card'
      };

      // Test 4: Validate discount code
      console.log('Testing discount code validation...');
      const codeValidation = await DiscountService.getInstance().validateDiscountCode('WELCOME2025', user.id);
      results.discountCodeValidation = {
        success: codeValidation.valid,
        data: codeValidation
      };

      // Test 5: Check database tables
      console.log('Checking database tables...');
      const { data: campaigns } = await supabase
        .from('discount_campaigns')
        .select('id, name, campaign_type, is_active')
        .eq('is_active', true);
      
      results.activeCampaigns = {
        success: true,
        data: campaigns
      };

      // Test 6: Check RPC functions
      console.log('Testing RPC functions...');
      const { data: rpcTest, error: rpcError } = await supabase
        .rpc('check_customer_membership', { p_customer_id: user.id });
      
      results.rpcFunctions = {
        success: !rpcError,
        data: rpcTest,
        error: rpcError
      };

    } catch (error) {
      console.error('Test error:', error);
      toast.error('Some tests failed. Check console for details.');
    }

    setTestResults(results);
    setLoading(false);
  };

  const renderTestResult = (result: any, title: string) => {
    if (!result) return null;

    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {result.success ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : (
              <X className="h-5 w-5 text-red-600" />
            )}
            {title}
          </CardTitle>
          {result.description && (
            <CardDescription>{result.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-3 rounded-lg overflow-auto text-xs">
            {JSON.stringify(result.data || result.error, null, 2)}
          </pre>
        </CardContent>
      </Card>
    );
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Login Required</CardTitle>
            <CardDescription>
              Please login to test membership and discount features
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Membership & Discount System Test</h1>
        <p className="text-muted-foreground mt-2">
          Testing all components of the membership and discount system
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button onClick={runTests} disabled={loading}>
            {loading ? 'Running Tests...' : 'Run All Tests'}
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.open('/admin/memberships', '_blank')}
          >
            Open Admin Panel
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.open('/dashboard/membership', '_blank')}
          >
            Open Customer Dashboard
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="results">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="results">Test Results</TabsTrigger>
          <TabsTrigger value="instructions">Instructions</TabsTrigger>
          <TabsTrigger value="scenarios">Test Scenarios</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="space-y-4">
          {loading && (
            <Card>
              <CardContent className="p-6">
                <p className="text-center">Running tests...</p>
              </CardContent>
            </Card>
          )}
          
          {!loading && Object.keys(testResults).length > 0 && (
            <>
              {renderTestResult(testResults.membershipStatus, 'Membership Status Check')}
              {renderTestResult(testResults.membershipPlans, 'Available Membership Plans')}
              {renderTestResult(testResults.discountScenarioA, 'Discount Calculation - Scenario A')}
              {renderTestResult(testResults.discountScenarioB, 'Discount Calculation - Scenario B')}
              {renderTestResult(testResults.discountCodeValidation, 'Discount Code Validation')}
              {renderTestResult(testResults.activeCampaigns, 'Active Discount Campaigns')}
              {renderTestResult(testResults.rpcFunctions, 'RPC Functions Test')}
            </>
          )}
        </TabsContent>

        <TabsContent value="instructions">
          <Card>
            <CardHeader>
              <CardTitle>How to Test the System</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">1. Test Membership Features</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Go to <code>/dashboard/membership</code> to see the membership dashboard</li>
                  <li>Non-members will see upgrade options with regional pricing</li>
                  <li>Click "Become a Plus Member" to see the upgrade flow</li>
                  <li>Admin can manually create memberships from <code>/admin/memberships</code></li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">2. Test Discount Application</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Create a new quote and select "Bank Transfer" as payment method</li>
                  <li>You should see a 2% discount automatically applied</li>
                  <li>Plus members get an additional 2% discount on all orders</li>
                  <li>Try the code <Badge>WELCOME2025</Badge> for 10% off (first-time users)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">3. Test Admin Features</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Go to <code>/admin/memberships</code> to manage memberships</li>
                  <li>Go to <code>/admin/discounts</code> to manage discount campaigns</li>
                  <li>Create new campaigns, generate discount codes, view analytics</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">4. Test Warehouse Benefits</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Plus members get 90 days FREE warehouse storage</li>
                  <li>Non-members pay $0.50 per day after 7 free days</li>
                  <li>Check package management to see storage fee calculations</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios">
          <Card>
            <CardHeader>
              <CardTitle>Test Scenarios</CardTitle>
              <CardDescription>
                Common scenarios to validate the system is working correctly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Scenario 1: First-time User</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    A new user from India making their first purchase
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>✓ Should see membership upgrade prompt</li>
                    <li>✓ Can use WELCOME2025 for 10% off</li>
                    <li>✓ Gets 2% extra discount with bank transfer</li>
                    <li>✓ Sees pricing in INR</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Scenario 2: Plus Member</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    An active Plus member making a purchase
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>✓ Automatic 2% discount on all orders</li>
                    <li>✓ Additional 2% with bank transfer (4% total)</li>
                    <li>✓ FREE 90-day warehouse storage</li>
                    <li>✓ Priority support badge</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Scenario 3: Bulk Order</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Customer ordering 5+ items
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>✓ Eligible for bulk discount campaigns</li>
                    <li>✓ Discounts stack with payment method discount</li>
                    <li>✓ Large orders discount total amount</li>
                    <li>✓ Small orders discount handling fee only</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}