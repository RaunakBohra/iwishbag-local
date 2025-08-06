/**
 * PaymentLinkPreview Component
 * Handles payment link generation, preview, and management
 * Extracted from EnhancedPaymentLinkGenerator for better maintainability
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import {
  Copy,
  ExternalLink,
  Eye,
  Loader2,
  CheckCircle,
  AlertCircle,
  Link,
  Share2,
  Clock,
} from 'lucide-react';

interface PaymentLinkResponse {
  success?: boolean;
  paymentUrl?: string;
  shortUrl?: string;
  amountInINR?: number;
  originalCurrency?: string;
  originalAmount?: number;
  expiresAt?: string;
  linkCode?: string;
  exchangeRate?: number;
  apiVersion?: string;
  fallbackUsed?: boolean;
  features?: {
    customFields?: boolean;
    partialPayment?: boolean;
  };
  error?: string;
}

interface PaymentLinkPreviewProps {
  createdLink: PaymentLinkResponse | null;
  isLoading: boolean;
  onGenerateLink: () => void;
  onResetForm: () => void;
  className?: string;
}

export const PaymentLinkPreview: React.FC<PaymentLinkPreviewProps> = ({
  createdLink,
  isLoading,
  onGenerateLink,
  onResetForm,
  className = '',
}) => {
  const { toast } = useToast();
  const [copying, setCopying] = useState<'url' | 'short' | null>(null);

  const copyToClipboard = async (text: string, type: 'url' | 'short') => {
    setCopying(type);
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied to clipboard!',
        description: `Payment ${type === 'url' ? 'URL' : 'short link'} has been copied.`,
      });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast({
        title: 'Failed to copy',
        description: 'Please try copying the link manually.',
        variant: 'destructive',
      });
    } finally {
      setTimeout(() => setCopying(null), 1000);
    }
  };

  const getApiVersionBadge = (version?: string) => {
    if (!version) return null;
    return (
      <Badge variant="outline" className="text-xs">
        API {version}
      </Badge>
    );
  };

  const getFeaturesBadges = (features?: { customFields?: boolean; partialPayment?: boolean }) => {
    if (!features) return null;

    return (
      <div className="flex gap-2 flex-wrap">
        {features.customFields && (
          <Badge variant="secondary" className="text-xs">
            Custom Fields
          </Badge>
        )}
        {features.partialPayment && (
          <Badge variant="secondary" className="text-xs">
            Partial Payment
          </Badge>
        )}
      </div>
    );
  };

  const formatExpiryDate = (expiresAt?: string) => {
    if (!expiresAt) return null;
    
    try {
      const date = new Date(expiresAt);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return expiresAt;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold mb-4">Payment Link Generation</h3>

        {!createdLink ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="w-5 h-5 text-blue-600" />
                Generate Payment Link
              </CardTitle>
              <CardDescription>
                Click the button below to generate a secure payment link for your customer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={onGenerateLink}
                disabled={isLoading}
                className="w-full h-12 text-base"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Payment Link...
                  </>
                ) : (
                  <>
                    <Link className="mr-2 h-5 w-5" />
                    Generate Payment Link
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : createdLink.success ? (
          <div className="space-y-4">
            {/* Success Alert */}
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Payment link has been generated successfully! Share it with your customer.
              </AlertDescription>
            </Alert>

            {/* Link Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-green-600" />
                    Payment Link Details
                  </span>
                  {createdLink.fallbackUsed && (
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      Fallback Used
                    </Badge>
                  )}
                </CardTitle>
                {createdLink.linkCode && (
                  <CardDescription>
                    Link Code: <code className="font-mono">{createdLink.linkCode}</code>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Payment URL */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Payment URL</label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => createdLink.paymentUrl && copyToClipboard(createdLink.paymentUrl, 'url')}
                      disabled={copying === 'url'}
                    >
                      {copying === 'url' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      Copy
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <code className="flex-1 text-sm break-all">{createdLink.paymentUrl}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(createdLink.paymentUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Short URL */}
                {createdLink.shortUrl && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Short URL</label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(createdLink.shortUrl!, 'short')}
                        disabled={copying === 'short'}
                      >
                        {copying === 'short' ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Copy className="h-4 w-4 mr-1" />
                        )}
                        Copy
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                      <code className="flex-1 text-sm">{createdLink.shortUrl}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(createdLink.shortUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Link Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Amount</label>
                    <p className="text-lg font-semibold">
                      {createdLink.originalCurrency} {createdLink.originalAmount?.toFixed(2)}
                    </p>
                    {createdLink.amountInINR && createdLink.originalCurrency !== 'INR' && (
                      <p className="text-sm text-gray-500">
                        ≈ ₹{createdLink.amountInINR.toFixed(2)}
                        {createdLink.exchangeRate && (
                          <span> (Rate: {createdLink.exchangeRate.toFixed(4)})</span>
                        )}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Expires</label>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <p className="text-sm">
                        {formatExpiryDate(createdLink.expiresAt) || 'No expiration'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Features and API Version */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    {getFeaturesBadges(createdLink.features)}
                  </div>
                  <div>
                    {getApiVersionBadge(createdLink.apiVersion)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => window.open(createdLink.paymentUrl, '_blank')}
                className="flex-1"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview Link
              </Button>
              <Button
                onClick={onResetForm}
                className="flex-1"
              >
                Create Another Link
              </Button>
            </div>
          </div>
        ) : (
          // Error State
          <Card>
            <CardContent className="p-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Failed to generate payment link</strong>
                  <br />
                  {createdLink.error || 'An unexpected error occurred. Please try again.'}
                </AlertDescription>
              </Alert>
              <div className="mt-4 flex gap-2">
                <Button onClick={onGenerateLink} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    'Try Again'
                  )}
                </Button>
                <Button variant="outline" onClick={onResetForm}>
                  Reset Form
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};