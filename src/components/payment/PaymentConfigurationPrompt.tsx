import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  CreditCard,
  AlertTriangle,
  Plus,
  ArrowRight,
  Globe,
  Smartphone,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import { cn } from '@/lib/utils';

interface PaymentConfigurationPromptProps {
  currency: string;
  amount: number;
  onContactSupport?: () => void;
  onNavigateToSettings?: () => void;
}

export const PaymentConfigurationPrompt: React.FC<PaymentConfigurationPromptProps> = ({
  currency,
  amount,
  onContactSupport,
  onNavigateToSettings,
}) => {
  const { isAdmin } = useUserRoles();

  const handleConfigureClick = () => {
    if (onNavigateToSettings) {
      onNavigateToSettings();
    } else if (isAdmin) {
      // Default navigation to system settings
      window.location.href = '/admin/system-settings';
    } else if (onContactSupport) {
      onContactSupport();
    }
  };

  const isUserFacing = !isAdmin;

  return (
    <Card className="shadow-sm border-orange-200 bg-orange-50/20 overflow-hidden">
      {/* Configuration Prompt Indicator */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 h-1 w-full" />

      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-gray-600" />
            <span className="font-medium text-gray-900 text-sm">Payment Methods</span>
            <Badge
              variant="outline"
              className="text-xs h-5 px-2 bg-orange-100 text-orange-700 border-orange-300"
            >
              {isUserFacing ? 'Unavailable' : 'Setup Required'}
            </Badge>
          </div>
          <AlertTriangle className="w-4 h-4 text-orange-500" />
        </div>

        {/* Main Message */}
        <Alert className="border-orange-200 bg-orange-50 mb-4">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            {isUserFacing ? (
              <>
                <div className="font-medium mb-1">No payment methods available</div>
                <div className="text-sm">
                  Payment processing is currently unavailable for {currency} {amount}. Please
                  contact our support team for assistance with your payment.
                </div>
              </>
            ) : (
              <>
                <div className="font-medium mb-1">Payment gateways not configured</div>
                <div className="text-sm">
                  No payment methods are available for{' '}
                  <span className="font-medium">{currency}</span> payments. Configure payment
                  gateways in System Settings to enable payment functionality.
                </div>
              </>
            )}
          </AlertDescription>
        </Alert>

        {/* Configuration Steps (Admin Only) */}
        {!isUserFacing && (
          <div className="bg-white border border-orange-200 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <Settings className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-orange-900 text-sm mb-2">Quick Setup Required</h3>

                {/* Setup Steps */}
                <div className="space-y-2 text-xs text-orange-800">
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
                    <span>Configure payment gateways in System Settings</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
                    <span>Set up currency-specific payment methods</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
                    <span>Add environment variables for payment APIs</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
                    <span>Test payment flows before enabling</span>
                  </div>
                </div>

                {/* Suggested Payment Methods */}
                <div className="mt-3">
                  <div className="text-xs font-medium text-orange-700 mb-2">
                    Suggested for {currency}:
                  </div>
                  <div className="flex items-center space-x-3 text-xs">
                    {currency === 'USD' && (
                      <>
                        <div className="flex items-center space-x-1">
                          <CreditCard className="w-3 h-3" />
                          <span>Stripe</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Globe className="w-3 h-3" />
                          <span>PayPal</span>
                        </div>
                      </>
                    )}
                    {currency === 'INR' && (
                      <>
                        <div className="flex items-center space-x-1">
                          <CreditCard className="w-3 h-3" />
                          <span>PayU</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Smartphone className="w-3 h-3" />
                          <span>UPI</span>
                        </div>
                      </>
                    )}
                    {currency === 'NPR' && (
                      <>
                        <div className="flex items-center space-x-1">
                          <Smartphone className="w-3 h-3" />
                          <span>eSewa</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CreditCard className="w-3 h-3" />
                          <span>Fonepay</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Section */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {isUserFacing ? (
              <span>Need help with payment? Our support team is here to assist.</span>
            ) : (
              <span>Configure payment methods to enable customer payments.</span>
            )}
          </div>

          <Button
            size="sm"
            onClick={handleConfigureClick}
            className={cn(
              'h-8 px-3 text-xs',
              isUserFacing
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-orange-600 hover:bg-orange-700 text-white',
            )}
          >
            {isUserFacing ? (
              <>
                <ArrowRight className="w-3 h-3 mr-1" />
                Contact Support
              </>
            ) : (
              <>
                <Plus className="w-3 h-3 mr-1" />
                Configure Payments
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
