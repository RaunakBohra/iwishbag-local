// src/pages/OrderConfirmationPage.tsx
import React, { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, Loader2, CreditCard, Truck, Banknote, UserPlus, Package, Clock, MapPin, History, Zap, Gift, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { BankTransferDetails } from '@/components/dashboard/BankTransferDetails';
import { EnhancedBankTransferDetails } from '@/components/payment/EnhancedBankTransferDetails';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';

interface QuoteItem {
  product_name: string;
  quantity: number;
  item_price: number;
}

interface OrderDetails {
  id: string;
  displayId?: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  email?: string;
  customerName?: string;
  items?: QuoteItem[];
  isAnonymous?: boolean;
  quotes: {
    display_id: string;
    quote_items: QuoteItem[];
  }
}

const OrderConfirmationPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');

  useEffect(() => {
    // Get order ID from the URL path, e.g., /order-confirmation/12345
    const pathParts = location.pathname.split('/');
    const orderId = pathParts[pathParts.length - 1];

    if (!orderId) {
      setError('No order ID found in the URL.');
      setLoading(false);
      return;
    }

    const fetchOrderDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('quotes')
          .select(`
            id,
            display_id,
            final_total,
            final_currency,
            payment_method,
            email,
            customer_name,
            is_anonymous,
            quote_items (
              product_name,
              quantity,
              item_price
            )
          `)
          .eq('id', orderId)
          .single();

        if (error) throw error;
        
        if (data) {
          const formattedOrder = {
            id: data.id,
            displayId: data.display_id,
            amount: data.final_total,
            currency: data.final_currency,
            paymentMethod: data.payment_method,
            email: data.email,
            customerName: data.customer_name,
            items: data.quote_items,
            isAnonymous: data.is_anonymous,
          };
          setOrderDetails(formattedOrder as any);
          
          // Store guest email in localStorage for convenience
          if (!user && data.email) {
            localStorage.setItem('guestOrderEmail', data.email);
          }
        } else {
          throw new Error('Order not found.');
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [location]);

  const handleCreateAccount = async () => {
    if (!orderDetails?.email) {
      toast({ title: "Error", description: "No email found for this order", variant: "destructive" });
      return;
    }

    if (signupPassword !== signupPasswordConfirm) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    if (signupPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setIsCreatingAccount(true);

    try {
      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: orderDetails.email,
        password: signupPassword,
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        // Update the quote to link it to the new user
        const { error: updateError } = await supabase
          .from('quotes')
          .update({ 
            user_id: authData.user.id,
            is_anonymous: false 
          })
          .eq('id', orderDetails.id);

        if (updateError) {
          console.error('Error linking order to account:', updateError);
        }

        toast({ 
          title: "Account Created!", 
          description: "Your account has been created successfully. You can now track all your orders." 
        });
        
        // Navigate to dashboard
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create account", 
        variant: "destructive" 
      });
    } finally {
      setIsCreatingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Confirming your payment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader className="bg-destructive text-destructive-foreground p-6">
            <div className="mx-auto bg-white rounded-full p-2 w-fit">
              <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
            <CardTitle className="mt-4 text-2xl">Payment Error</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-4xl">
        <Card className="text-center shadow-lg">
          <CardHeader className="bg-green-500 text-green-50 p-6">
            <div className="mx-auto bg-white rounded-full p-2 w-fit">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="mt-4 text-2xl">
              {user ? 'Payment Successful!' : 'Order Confirmed!'}
            </CardTitle>
            {!user && orderDetails?.customerName && (
              <p className="text-green-100 mt-2">Thank you, {orderDetails.customerName}!</p>
            )}
          </CardHeader>
          <CardContent className="p-6 space-y-4">
          <p className="text-lg text-muted-foreground">
            Thank you for your purchase. Your order has been confirmed.
          </p>
          <div className="border-t border-b py-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Order ID:</span>
              <Badge variant="secondary" className="text-lg">
                {orderDetails?.displayId || 'N/A'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">
                {orderDetails?.paymentMethod === 'bank_transfer' ? 'Amount to Pay:' : 'Amount Paid:'}
              </span>
              <span className="font-bold text-lg">
                {orderDetails?.amount?.toFixed(2)} {orderDetails?.currency}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Payment Method:</span>
              <div className="flex items-center gap-2">
                {orderDetails?.paymentMethod === 'bank_transfer' && <Banknote className="h-4 w-4" />}
                {orderDetails?.paymentMethod === 'cod' && <Truck className="h-4 w-4" />}
                {(orderDetails?.paymentMethod === 'stripe' || orderDetails?.paymentMethod === 'payu') && <CreditCard className="h-4 w-4" />}
                <span className="font-medium">
                  {orderDetails?.paymentMethod === 'bank_transfer' ? 'Bank Transfer' :
                   orderDetails?.paymentMethod === 'cod' ? 'Cash on Delivery' :
                   orderDetails?.paymentMethod === 'stripe' ? 'Credit Card' :
                   orderDetails?.paymentMethod === 'payu' ? 'PayU' :
                   orderDetails?.paymentMethod || 'Unknown'}
                </span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-medium text-left mb-2">Order Summary:</h3>
            <div className="text-left text-muted-foreground space-y-2">
              {orderDetails?.items && orderDetails.items.length > 0 ? (
                orderDetails.items.map((item: QuoteItem, index: number) => (
                  <div key={index} className="flex justify-between">
                    <span>{item.product_name || 'Unnamed Product'} (x{item.quantity})</span>
                    <span>{(item.item_price * item.quantity).toFixed(2)} {orderDetails.currency}</span>
                  </div>
                ))
              ) : (
                <p>Product details unavailable</p>
              )}
            </div>
          </div>

          {/* Guest Order Lookup Info */}
          {!user && orderDetails && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-900">Save Your Order Information</p>
                  <p className="text-sm text-amber-800 mt-1">
                    To track this order later, you'll need:
                  </p>
                  <ul className="text-sm text-amber-800 mt-2 space-y-1">
                    <li>• Order ID: <strong>{orderDetails.displayId}</strong></li>
                    <li>• Email: <strong>{orderDetails.email}</strong></li>
                  </ul>
                  <p className="text-xs text-amber-700 mt-2">
                    We recommend taking a screenshot or creating an account for easier tracking.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sign-up Benefits Section for Guest Users */}
          {!user && (
            <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <div className="max-w-2xl mx-auto">
                <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center justify-center gap-2">
                  <UserPlus className="h-6 w-6" />
                  Create an Account for Better Experience
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-start gap-3 bg-white p-4 rounded-lg shadow-sm">
                    <Package className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Track Your Orders</h4>
                      <p className="text-sm text-gray-600">Real-time updates on your order status and delivery</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 bg-white p-4 rounded-lg shadow-sm">
                    <History className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Order History</h4>
                      <p className="text-sm text-gray-600">Access all your past orders in one place</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 bg-white p-4 rounded-lg shadow-sm">
                    <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Saved Addresses</h4>
                      <p className="text-sm text-gray-600">Store multiple addresses for faster checkout</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 bg-white p-4 rounded-lg shadow-sm">
                    <Zap className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Express Checkout</h4>
                      <p className="text-sm text-gray-600">Skip the forms next time you shop</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 bg-white p-4 rounded-lg shadow-sm">
                    <Gift className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Exclusive Offers</h4>
                      <p className="text-sm text-gray-600">Members-only discounts and early access</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 bg-white p-4 rounded-lg shadow-sm">
                    <Clock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Priority Support</h4>
                      <p className="text-sm text-gray-600">Get help faster with dedicated support</p>
                    </div>
                  </div>
                </div>
                
                {!showSignupForm ? (
                  <div className="flex gap-3 justify-center">
                    <Button 
                      onClick={() => setShowSignupForm(true)} 
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <UserPlus className="h-5 w-5 mr-2" />
                      Create Account & Track Order
                    </Button>
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={() => {
                        if (orderDetails?.email) {
                          localStorage.setItem('guestOrderEmail', orderDetails.email);
                          localStorage.setItem('guestOrderId', orderDetails.displayId || '');
                        }
                      }}
                    >
                      Continue as Guest
                    </Button>
                  </div>
                ) : (
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h4 className="font-semibold text-gray-900 mb-4">Create Your Account</h4>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="signup-email">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          value={orderDetails?.email || ''}
                          disabled
                          className="bg-gray-50"
                        />
                      </div>
                      <div>
                        <Label htmlFor="signup-password">Create Password</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                        />
                      </div>
                      <div>
                        <Label htmlFor="signup-password-confirm">Confirm Password</Label>
                        <Input
                          id="signup-password-confirm"
                          type="password"
                          value={signupPasswordConfirm}
                          onChange={(e) => setSignupPasswordConfirm(e.target.value)}
                          placeholder="Re-enter your password"
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button 
                          onClick={handleCreateAccount}
                          disabled={isCreatingAccount}
                          className="flex-1"
                        >
                          {isCreatingAccount ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Creating Account...
                            </>
                          ) : (
                            'Create Account'
                          )}
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => setShowSignupForm(false)}
                          disabled={isCreatingAccount}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment Method Specific Instructions */}
          {orderDetails?.paymentMethod === 'bank_transfer' && (
            <EnhancedBankTransferDetails
              orderId={orderDetails.id}
              orderDisplayId={orderDetails.displayId || 'N/A'}
              amount={orderDetails.amount}
              currency={orderDetails.currency}
            />
          )}

          {orderDetails?.paymentMethod === 'cod' && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-900 mb-3 flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Cash on Delivery
              </h4>
              <p className="text-sm text-green-800 mb-2">
                Your order will be delivered to your address. Please have the exact amount ready for payment upon delivery.
              </p>
              <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  <strong>Amount to pay on delivery:</strong> {orderDetails?.amount?.toFixed(2)} {orderDetails?.currency}
                </p>
              </div>
            </div>
          )}

          {(orderDetails?.paymentMethod === 'stripe' || orderDetails?.paymentMethod === 'payu') && (
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Processed
              </h4>
              <p className="text-sm text-gray-800">
                Your payment has been successfully processed. You will receive a confirmation email shortly.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col sm:flex-row gap-2">
          {user ? (
            <>
              <Button asChild className="w-full">
                <Link to="/dashboard">View Order in Dashboard</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/">Continue Shopping</Link>
              </Button>
            </>
          ) : (
            <>
              <Button 
                onClick={() => {
                  // Store order info for guest tracking
                  if (orderDetails) {
                    localStorage.setItem('guestOrderEmail', orderDetails.email || '');
                    localStorage.setItem('guestOrderId', orderDetails.displayId || '');
                    toast({ 
                      title: "Order Information Saved", 
                      description: "You can track your order using your email and order ID." 
                    });
                  }
                }} 
                className="w-full"
              >
                <Package className="h-4 w-4 mr-2" />
                Save Order Info
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/">Continue Shopping</Link>
              </Button>
              {!showSignupForm && (
                <Button 
                  onClick={() => setShowSignupForm(true)} 
                  variant="default"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Account
                </Button>
              )}
            </>
          )}
        </CardFooter>
      </Card>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;
