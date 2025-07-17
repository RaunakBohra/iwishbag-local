import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Link,
  Mail,
  Loader2,
  CheckCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DueAmountInfo } from '@/lib/paymentUtils';
import { PaymentLinkGenerator } from './PaymentLinkGenerator';

interface QuoteWithCustomerInfo {
  id?: string;
  shipping_address?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  user?: {
    full_name?: string;
    email?: string;
    phone?: string;
  };
}

interface PaymentLinkData {
  success?: boolean;
  shortUrl?: string;
  amountInINR?: number;
  linkCode?: string;
}

interface DueAmountNotificationProps {
  dueInfo: DueAmountInfo;
  currency: string;
  currencySymbol: string;
  quote?: QuoteWithCustomerInfo;
  onPaymentLinkCreated?: (link: PaymentLinkData) => void;
  showActions?: boolean;
  className?: string;
}

export function DueAmountNotification({
  dueInfo,
  currency,
  currencySymbol,
  quote,
  onPaymentLinkCreated,
  showActions = true,
  className,
}: DueAmountNotificationProps) {
  const [linkSent, setLinkSent] = useState(false);

  if (!dueInfo.hasDueAmount && dueInfo.changeType === 'none') {
    return null;
  }

  const getAlertVariant = () => {
    if (dueInfo.changeType === 'increase') return 'default';
    if (dueInfo.changeType === 'decrease') return 'default';
    return 'default';
  };

  const getIcon = () => {
    if (dueInfo.changeType === 'increase') return <TrendingUp className="h-4 w-4" />;
    if (dueInfo.changeType === 'decrease') return <TrendingDown className="h-4 w-4" />;
    return <Info className="h-4 w-4" />;
  };

  const getTitle = () => {
    if (dueInfo.changeType === 'increase') return 'Order Value Increased';
    if (dueInfo.changeType === 'decrease') return 'Order Value Decreased';
    return 'Payment Due';
  };

  const getDescription = () => {
    const changeAmountFormatted = `${currencySymbol}${Math.abs(dueInfo.changeAmount).toFixed(2)}`;
    const dueAmountFormatted = `${currencySymbol}${dueInfo.dueAmount.toFixed(2)}`;

    if (dueInfo.changeType === 'increase') {
      return `Order total increased by ${changeAmountFormatted}. Outstanding amount: ${dueAmountFormatted}`;
    } else if (dueInfo.changeType === 'decrease') {
      return `Order total decreased by ${changeAmountFormatted}. ${dueInfo.hasDueAmount ? `Outstanding amount: ${dueAmountFormatted}` : 'No outstanding payment required.'}`;
    }

    return `Outstanding payment: ${dueAmountFormatted}`;
  };

  const handleLinkCreated = (link: PaymentLinkData) => {
    setLinkSent(true);
    onPaymentLinkCreated?.(link);
  };

  return (
    <Alert
      className={cn('border-l-4', className, {
        'border-l-orange-500 bg-orange-50': dueInfo.changeType === 'increase',
        'border-l-blue-500 bg-blue-50': dueInfo.changeType === 'decrease',
        'border-l-red-500 bg-red-50': dueInfo.hasDueAmount && dueInfo.changeType === 'none',
      })}
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{getTitle()}</h4>
            {dueInfo.changeType !== 'none' && (
              <Badge variant={dueInfo.changeType === 'increase' ? 'destructive' : 'secondary'}>
                {dueInfo.changeType === 'increase' ? '+' : '-'}
                {currencySymbol}
                {Math.abs(dueInfo.changeAmount).toFixed(2)}
              </Badge>
            )}
          </div>

          <AlertDescription className="text-sm">{getDescription()}</AlertDescription>

          {/* Payment Summary */}
          {dueInfo.changeType !== 'none' && (
            <div className="grid grid-cols-2 gap-4 mt-3 p-3 bg-white/50 rounded-md text-xs">
              <div>
                <span className="text-muted-foreground">Previous Total:</span>
                <p className="font-medium">
                  {currencySymbol}
                  {dueInfo.oldTotal.toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">New Total:</span>
                <p className="font-medium">
                  {currencySymbol}
                  {dueInfo.newTotal.toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          {showActions && dueInfo.hasDueAmount && (
            <div className="flex items-center gap-2 mt-3">
              <PaymentLinkGenerator
                quoteId={quote?.id || ''}
                amount={dueInfo.dueAmount}
                currency={currency}
                customerInfo={{
                  name: quote?.shipping_address?.name || quote?.user?.full_name || '',
                  email: quote?.shipping_address?.email || quote?.user?.email || '',
                  phone: quote?.shipping_address?.phone || quote?.user?.phone || '',
                }}
                onLinkCreated={handleLinkCreated}
              />

              {linkSent && (
                <div className="flex items-center gap-1 text-green-600 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>Link sent</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Alert>
  );
}
