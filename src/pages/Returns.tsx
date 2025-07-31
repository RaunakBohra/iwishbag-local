/**
 * Dynamic Returns Page
 * 
 * Integrates the ReturnRequestForm with existing return policy information.
 * Provides both policy information and functional return request capability.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  RefreshCw,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Lightbulb,
  Package,
  DollarSign,
  Truck,
  Search,
} from 'lucide-react';
import ReturnRequestForm from '@/components/returns/ReturnRequestForm';
import PackageReturnForm from '@/components/returns/PackageReturnForm';
import ReturnStatusTracker from '@/components/returns/ReturnStatusTracker';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

const Returns: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'policy' | 'refund' | 'return' | 'track'>('policy');
  const [showRefundForm, setShowRefundForm] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);
  const [submittedRmaNumber, setSubmittedRmaNumber] = useState<string | null>(null);

  const handleRefundSuccess = (refundRequestId: string) => {
    setSubmittedRequestId(refundRequestId);
    setShowRefundForm(false);
    toast({
      title: 'Refund Request Submitted',
      description: 'Your refund request has been submitted and is being reviewed.',
    });
  };

  const handleReturnSuccess = (rmaNumber: string) => {
    setSubmittedRmaNumber(rmaNumber);
    setShowReturnForm(false);
    toast({
      title: 'Return Request Submitted',
      description: `Your return request ${rmaNumber} has been created.`,
    });
  };

  const handleStartRefund = () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to submit a refund request.',
        variant: 'destructive',
      });
      return;
    }
    setActiveTab('refund');
    setShowRefundForm(true);
  };

  const handleStartReturn = () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to submit a return request.',
        variant: 'destructive',
      });
      return;
    }
    setActiveTab('return');
    setShowReturnForm(true);
  };

  if (showRefundForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => setShowRefundForm(false)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Returns
            </Button>
          </div>
          
          <ReturnRequestForm
            onSuccess={handleRefundSuccess}
            onCancel={() => setShowRefundForm(false)}
          />
        </div>
      </div>
    );
  }

  if (showReturnForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => setShowReturnForm(false)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Returns
            </Button>
          </div>
          
          <PackageReturnForm
            onSuccess={handleReturnSuccess}
            onCancel={() => setShowReturnForm(false)}
          />
        </div>
      </div>
    );
  }

  if (submittedRequestId || submittedRmaNumber) {
    return (
      <div className="min-h-screen bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-6" />
              <h1 className="text-2xl font-bold mb-4">
                {submittedRequestId ? 'Refund Request Submitted' : 'Return Request Created'}
              </h1>
              <p className="text-muted-foreground mb-6">
                {submittedRequestId 
                  ? 'Your refund request has been submitted successfully. We\'ll review it and get back to you within 2-3 business days.'
                  : `Your return request ${submittedRmaNumber} has been created. You'll receive return instructions via email within 2-3 business days.`
                }
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => {
                  setSubmittedRequestId(null);
                  setSubmittedRmaNumber(null);
                }}>
                  Submit Another Request
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <section className="py-16 bg-gradient-to-br from-blue-50 to-indigo-100 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Returns & Refunds</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              We want you to be completely satisfied with your purchase. Review our policy and submit return requests easily.
            </p>
            
            {user ? (
              <div className="flex gap-4">
                <Button 
                  size="lg" 
                  onClick={handleStartRefund}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <DollarSign className="h-5 w-5 mr-2" />
                  Request Refund
                </Button>
                <Button 
                  size="lg" 
                  onClick={handleStartReturn}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Package className="h-5 w-5 mr-2" />
                  Return Packages
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Button 
                  size="lg" 
                  onClick={() => window.location.href = '/auth/login'}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Login to Submit Return
                </Button>
                <p className="text-sm text-gray-500">
                  Need to create an account? <a href="/auth/signup" className="text-blue-600 hover:underline">Sign up here</a>
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'policy' | 'refund' | 'return' | 'track')}>
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="policy" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Return Policy
              </TabsTrigger>
              <TabsTrigger value="refund" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Request Refund
              </TabsTrigger>
              <TabsTrigger value="return" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Return Packages
              </TabsTrigger>
              <TabsTrigger value="track" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Track Status
              </TabsTrigger>
            </TabsList>

            <TabsContent value="policy" className="space-y-8">
              {/* Quick Overview */}
              <div className="grid md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="text-center p-6">
                    <Clock className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">30-Day Window</h3>
                    <p className="text-gray-600">Return items within 30 days of delivery</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="text-center p-6">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Original Condition</h3>
                    <p className="text-gray-600">Items must be unused and in original packaging</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="text-center p-6">
                    <Lightbulb className="h-8 w-8 text-yellow-600 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Easy Process</h3>
                    <p className="text-gray-600">Simple online return request system</p>
                  </CardContent>
                </Card>
              </div>

              {/* Eligible Returns */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Items We Can Accept
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">✓</Badge>
                        <span>Unopened items in original packaging</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">✓</Badge>
                        <span>Defective or damaged items upon arrival</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">✓</Badge>
                        <span>Items not matching description</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">✓</Badge>
                        <span>Clothing with tags still attached</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Non-Returnable Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    Items We Cannot Accept
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-red-100 text-red-800">✗</Badge>
                        <span>Perishable goods (food, flowers, etc.)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-red-100 text-red-800">✗</Badge>
                        <span>Personal care items (cosmetics, underwear)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-red-100 text-red-800">✗</Badge>
                        <span>Custom or personalized items</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-red-100 text-red-800">✗</Badge>
                        <span>Items damaged by normal wear</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-red-100 text-red-800">✗</Badge>
                        <span>Items returned after 30 days</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Return Process */}
              <Card>
                <CardHeader>
                  <CardTitle>How to Return an Item</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-sm">1</span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 mb-1">Submit Request Online</h3>
                        <p className="text-gray-600 text-sm">
                          Use our online form to submit your return request with order details and reason.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-sm">2</span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 mb-1">Get Authorization</h3>
                        <p className="text-gray-600 text-sm">
                          We'll review your request and provide return authorization and shipping instructions.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-sm">3</span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 mb-1">Ship the Item</h3>
                        <p className="text-gray-600 text-sm">
                          Package securely and ship using provided instructions and tracking.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-sm">4</span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 mb-1">Receive Refund</h3>
                        <p className="text-gray-600 text-sm">
                          Once received and inspected, we'll process your refund within 5-10 business days.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Important Notes */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Return shipping costs are the customer's responsibility unless the item was defective or incorrectly described. International return shipping can be expensive - please consider this when placing orders.
                </AlertDescription>
              </Alert>

              {/* CTA */}
              <div className="text-center py-8">
                <h3 className="text-xl font-semibold mb-4">Need to Make a Return?</h3>
                <p className="text-gray-600 mb-6">
                  Choose the right option for your situation.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button 
                    size="lg" 
                    onClick={handleStartRefund}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <DollarSign className="h-5 w-5 mr-2" />
                    Request Refund
                  </Button>
                  <Button 
                    size="lg" 
                    onClick={handleStartReturn}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Package className="h-5 w-5 mr-2" />
                    Return Packages
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="refund">
              {user ? (
                <div className="space-y-6">
                  <Alert>
                    <Lightbulb className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Refund Request:</strong> Use this if you want your money back for a paid order. You don't need to return physical packages for most refunds.
                    </AlertDescription>
                  </Alert>

                  <div className="text-center py-8">
                    <h3 className="text-xl font-semibold mb-4">Request Money Back</h3>
                    <p className="text-gray-600 mb-6">
                      Submit a refund request for orders you've already paid for.
                    </p>
                    <Button 
                      size="lg" 
                      onClick={() => setShowRefundForm(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <DollarSign className="h-5 w-5 mr-2" />
                      Open Refund Form
                    </Button>
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Login Required</h3>
                    <p className="text-gray-600 mb-6">
                      You need to be logged in to submit a refund request.
                    </p>
                    <div className="flex gap-4 justify-center">
                      <Button onClick={() => window.location.href = '/auth/login'}>
                        Login
                      </Button>
                      <Button variant="outline" onClick={() => window.location.href = '/auth/signup'}>
                        Sign Up
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="return">
              {user ? (
                <div className="space-y-6">
                  <Alert>
                    <Lightbulb className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Package Return:</strong> Use this if you need to physically send packages back to our warehouse (defective items, wrong items, etc.).
                    </AlertDescription>
                  </Alert>

                  <div className="text-center py-8">
                    <h3 className="text-xl font-semibold mb-4">Return Physical Packages</h3>
                    <p className="text-gray-600 mb-6">
                      Create a return request for packages you need to send back to us.
                    </p>
                    <Button 
                      size="lg" 
                      onClick={() => setShowReturnForm(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Package className="h-5 w-5 mr-2" />
                      Open Package Return Form
                    </Button>
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Login Required</h3>
                    <p className="text-gray-600 mb-6">
                      You need to be logged in to submit a package return request.
                    </p>
                    <div className="flex gap-4 justify-center">
                      <Button onClick={() => window.location.href = '/auth/login'}>
                        Login
                      </Button>
                      <Button variant="outline" onClick={() => window.location.href = '/auth/signup'}>
                        Sign Up
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="track">
              <ReturnStatusTracker 
                onContactSupport={(returnId, type) => {
                  // Handle contact support - could integrate with support system
                  toast({
                    title: 'Contact Support',
                    description: `Please contact support regarding your ${type} request: ${returnId}`,
                  });
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
};

export default Returns;