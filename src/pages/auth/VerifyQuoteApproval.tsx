/**
 * VerifyQuoteApproval - Email verification page for quote approvals
 * 
 * Features:
 * - Verify email tokens from quote approval links
 * - Redirect to quote detail page after successful verification
 * - Handle expired or invalid tokens gracefully
 * - Track verification in audit logs
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEmailNotifications } from '@/hooks/useEmailNotifications';
import { auditLogService } from '@/services/AuditLogService';
import { notificationService } from '@/services/NotificationService';

interface VerificationResult {
  success: boolean;
  message: string;
  quoteId?: string;
  customerEmail?: string;
}

export default function VerifyQuoteApproval() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const { sendQuoteVerificationSuccessEmail, isSending } = useEmailNotifications();

  const token = searchParams.get('token');
  const redirectUrl = searchParams.get('redirect') || '/';

  useEffect(() => {
    if (!token) {
      setResult({
        success: false,
        message: 'Invalid verification link. No token provided.',
      });
      setIsVerifying(false);
      return;
    }

    verifyToken(token);
  }, [token]);

  const verifyToken = async (verificationToken: string) => {
    try {
      setIsVerifying(true);

      // Call the database function to verify the token
      const { data: quoteId, error } = await supabase
        .rpc('verify_quote_email', { p_verification_token: verificationToken });

      if (error) {
        console.error('Token verification error:', error);
        setResult({
          success: false,
          message: 'Failed to verify token. Please try again or contact support.',
        });
        return;
      }

      if (!quoteId) {
        setResult({
          success: false,
          message: 'This verification link has expired or is invalid. Please request a new quote approval link.',
        });
        return;
      }

      // Get quote details
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('id, display_id, customer_name, customer_email')
        .eq('id', quoteId)
        .single();

      if (quoteError) {
        console.error('Quote fetch error:', quoteError);
        setResult({
          success: false,
          message: 'Quote not found. Please contact support.',
        });
        return;
      }

      // Log successful verification
      await auditLogService.logAction(
        quoteId,
        'email_verified',
        {
          details: { 
            verification_token: verificationToken,
            customer_email: quote.customer_email,
            verified_at: new Date().toISOString()
          }
        }
      );

      // Approve the quote after email verification (simple flow)
      const { error: approvalError } = await supabase
        .from('quotes')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      if (approvalError) {
        console.warn('Failed to approve quote after verification:', approvalError);
      }

      // Send high-value quote notification if applicable
      try {
        // Get full quote data for notification
        const { data: fullQuote } = await supabase
          .from('quotes')
          .select('*')
          .eq('id', quoteId)
          .single();
          
        if (fullQuote) {
          await notificationService.notifyHighValueQuoteApproval(fullQuote);
        }
      } catch (notificationError) {
        console.warn('Failed to send high-value notification:', notificationError);
      }

      // Send success email
      try {
        await sendQuoteVerificationSuccessEmail({
          to: quote.customer_email,
          quoteId: quote.display_id || quote.id,
          customerName: quote.customer_name || 'Customer',
        });
      } catch (emailError) {
        console.warn('Failed to send verification success email:', emailError);
        // Don't fail the verification process if email fails
      }

      setResult({
        success: true,
        message: 'Email verified successfully! You can now approve your quote.',
        quoteId: quote.id,
        customerEmail: quote.customer_email,
      });

    } catch (error) {
      console.error('Verification process error:', error);
      setResult({
        success: false,
        message: 'An unexpected error occurred during verification. Please try again.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleProceedToQuote = () => {
    if (result?.quoteId) {
      // Navigate to the shared quote page
      navigate(`/s/${result.quoteId}`);
    } else {
      // Fallback to redirect URL or home
      navigate(redirectUrl);
    }
  };

  const handleRequestNewLink = () => {
    // Navigate back to the original shared quote (if we have the quote ID)
    if (result?.quoteId) {
      navigate(`/s/${result.quoteId}`);
    } else {
      navigate('/');
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <CardTitle className="text-xl">Verifying Email</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600">
              Please wait while we verify your email address...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            result?.success 
              ? 'bg-green-100' 
              : 'bg-red-100'
          }`}>
            {result?.success ? (
              <CheckCircle className="h-8 w-8 text-green-600" />
            ) : (
              <XCircle className="h-8 w-8 text-red-600" />
            )}
          </div>
          <CardTitle className="text-xl">
            {result?.success ? 'Email Verified!' : 'Verification Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className={result?.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <AlertDescription>
              {result?.message}
            </AlertDescription>
          </Alert>

          {result?.success ? (
            <div className="space-y-4">
              <div className="text-center text-sm text-gray-600">
                <Mail className="h-5 w-5 mx-auto mb-2 text-gray-400" />
                A confirmation email has been sent to your email address.
              </div>
              
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleProceedToQuote} 
                  className="w-full"
                  disabled={isSending}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending confirmation...
                    </>
                  ) : (
                    'Proceed to Quote'
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  Return to Home
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center text-sm text-gray-600">
                {result?.message.includes('expired') && (
                  <div className="space-y-2">
                    <p>The verification link has expired.</p>
                    <p>You can request a new approval link by visiting the original quote.</p>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleRequestNewLink}
                  variant="default"
                  className="w-full"
                >
                  Request New Link
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  Return to Home
                </Button>
              </div>
              
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  Need help? Contact our support team at{' '}
                  <a 
                    href="mailto:support@iwishbag.com" 
                    className="text-blue-600 hover:underline"
                  >
                    support@iwishbag.com
                  </a>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}