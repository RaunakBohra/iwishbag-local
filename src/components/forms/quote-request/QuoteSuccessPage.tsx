import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  Clock,
  Mail,
  ExternalLink,
  User,
  Copy,
  Home,
  Package,
  Calendar,
  Phone,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QuoteSuccessPageProps {
  quoteData: {
    quote_number: string;
    quote_id: string;
    share_token: string;
    expires_at: string;
    customer_email: string;
    product_name: string;
    product_url: string;
  };
  isGuestUser: boolean;
}

export function QuoteSuccessPage({ quoteData, isGuestUser }: QuoteSuccessPageProps) {
  const { toast } = useToast();
  const [showAccountCreation, setShowAccountCreation] = useState(false);
  const [accountPassword, setAccountPassword] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const trackingUrl = `${window.location.origin}/quote/view/${quoteData.share_token}`;
  const expiryDate = new Date(quoteData.expires_at).toLocaleDateString();

  const copyTrackingLink = () => {
    navigator.clipboard.writeText(trackingUrl);
    toast({
      title: 'Link Copied!',
      description: 'Tracking link has been copied to your clipboard.',
    });
  };

  const handleAccountCreation = async () => {
    // This would integrate with the auth system
    setIsCreatingAccount(true);
    try {
      // Account creation logic would go here
      toast({
        title: 'Account Created!',
        description: 'You can now sign in to track your quotes and orders.',
      });
      setShowAccountCreation(false);
    } catch (error) {
      toast({
        title: 'Account Creation Failed',
        description: 'Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const processingSteps = [
    {
      step: 1,
      title: 'Quote Review',
      description: 'Our team reviews your product and calculates accurate pricing',
      time: '2-6 hours',
      icon: Package,
    },
    {
      step: 2,
      title: 'Quote Preparation',
      description: 'Detailed quote with shipping, customs, and all fees',
      time: '12-18 hours',
      icon: Calculator,
    },
    {
      step: 3,
      title: 'Quote Delivery',
      description: 'Complete quote sent to your email with next steps',
      time: 'Within 24 hours',
      icon: Mail,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-500 to-teal-500 rounded-full mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Quote Request Submitted!
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your quote #{quoteData.quote_number} has been received. 
            We'll send you a detailed quote within 24 hours.
          </p>
        </div>

        {/* Key Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          
          {/* Quote Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-green-600" />
                <span>Quote Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Quote Number:</span>
                <Badge variant="secondary" className="font-mono">
                  {quoteData.quote_number}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Valid Until:</span>
                <span className="text-sm font-medium">{expiryDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Product:</span>
                <span className="text-sm text-right max-w-48 truncate" title={quoteData.product_name}>
                  {quoteData.product_name}
                </span>
              </div>
              {quoteData.product_url && (
                <div className="pt-2">
                  <a 
                    href={quoteData.product_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View Original Product
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Response Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <span>Response Timeline</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Mail className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Email Confirmation</p>
                  <p className="text-sm text-gray-600">Sent to {quoteData.customer_email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Clock className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Detailed Quote</p>
                  <p className="text-sm text-gray-600">Within 24 hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tracking Link for Guest Users */}
        {isGuestUser && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ExternalLink className="h-5 w-5 text-purple-600" />
                <span>Track Your Quote</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Bookmark this link to check your quote status anytime:
              </p>
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <code className="flex-1 text-sm text-gray-800 break-all">
                  {trackingUrl}
                </code>
                <Button size="sm" onClick={copyTrackingLink} variant="outline">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Account Creation for Guest Users */}
        {isGuestUser && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-teal-600" />
                <span>Create Your Account</span>
                <Badge variant="outline">Optional</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!showAccountCreation ? (
                <div>
                  <p className="text-gray-600 mb-4">
                    Create an account to easily track this quote and manage future orders from your dashboard.
                  </p>
                  <Button 
                    onClick={() => setShowAccountCreation(true)}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Create Account
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email (already provided)
                    </label>
                    <Input 
                      value={quoteData.customer_email} 
                      disabled 
                      className="bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Create Password
                    </label>
                    <Input 
                      type="password"
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      placeholder="Choose a secure password"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <Button 
                      onClick={handleAccountCreation}
                      disabled={!accountPassword || isCreatingAccount}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {isCreatingAccount ? 'Creating...' : 'Create Account'}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setShowAccountCreation(false)}
                    >
                      Skip for Now
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* What Happens Next */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              <span>What Happens Next?</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {processingSteps.map((step, index) => (
                <div key={step.step} className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">{step.step}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{step.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {step.time}
                      </Badge>
                    </div>
                    <p className="text-gray-600 text-sm">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contact & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                <span>Need Help?</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">Email Support</p>
                  <a href="mailto:support@iwishbag.com" className="text-sm text-blue-600 hover:text-blue-800">
                    support@iwishbag.com
                  </a>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">Phone Support</p>
                  <p className="text-sm text-gray-600">Available 9 AM - 6 PM IST</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ArrowRight className="h-5 w-5 text-purple-600" />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.location.href = '/'}
              >
                <Home className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.location.reload()}
              >
                <Package className="h-4 w-4 mr-2" />
                Submit Another Quote
              </Button>
              
              {!isGuestUser && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/dashboard'}
                >
                  <User className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Note */}
        <Alert className="mt-8">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Thank you for choosing iwishBag!</strong> We're committed to providing you with 
            transparent pricing and excellent service. Your quote will include all costs upfront - 
            no surprises at checkout.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

// Add missing Calculator icon
const Calculator = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);