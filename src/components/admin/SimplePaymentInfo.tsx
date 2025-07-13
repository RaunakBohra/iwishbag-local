import React from 'react';
import { Tables } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DollarSign, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { usePaymentStatusManagement } from '@/hooks/usePaymentStatusManagement';

interface SimplePaymentInfoProps {
  quote: Tables<'quotes'>;
}

export const SimplePaymentInfo: React.FC<SimplePaymentInfoProps> = ({ quote }) => {
  const { getPaymentStatusConfig } = usePaymentStatusManagement();
  const amountPaid = quote.amount_paid || 0;
  const totalAmount = quote.final_total || 0;
  const currency = quote.final_currency || 'USD';
  const paymentProgress = totalAmount > 0 ? (amountPaid / totalAmount) * 100 : 0;
  
  // DYNAMIC: Get payment status configuration
  const paymentStatusConfig = getPaymentStatusConfig(quote.payment_status || 'unpaid');
  
  // Fallback for status display if config not found
  const statusConfig = paymentStatusConfig ? {
    color: paymentStatusConfig.badgeColor || 'bg-gray-500',
    icon: paymentStatusConfig.icon === 'CheckCircle' ? CheckCircle :
          paymentStatusConfig.icon === 'Clock' ? Clock :
          paymentStatusConfig.icon === 'AlertCircle' ? AlertCircle : AlertCircle,
    text: paymentStatusConfig.label
  } : {
    color: 'bg-red-500',
    icon: AlertCircle,
    text: 'Unknown'
  };
  
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-3">
      {/* Payment Status Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">Payment Status</span>
        </div>
        <Badge className={`${statusConfig.color} text-white`}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {statusConfig.text}
        </Badge>
      </div>

      {/* Payment Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{currency} {amountPaid.toFixed(2)} paid</span>
          <span className="text-muted-foreground">of {currency} {totalAmount.toFixed(2)}</span>
        </div>
        <Progress value={paymentProgress} className="h-2" />
        {/* DYNAMIC: Show payment status specific messages */}
        {paymentStatusConfig?.message && (
          <p className={`text-xs ${paymentStatusConfig.textColor || 'text-gray-600'}`}>
            {paymentStatusConfig.message}
          </p>
        )}
        {/* Fallback for partial payment calculation */}
        {quote.payment_status === 'partial' && !paymentStatusConfig?.message && (
          <p className="text-xs text-orange-600">
            Remaining: {currency} {(totalAmount - amountPaid).toFixed(2)}
          </p>
        )}
        {/* Fallback for overpaid calculation */}
        {quote.payment_status === 'overpaid' && !paymentStatusConfig?.message && (
          <p className="text-xs text-blue-600">
            Overpaid: {currency} {(amountPaid - totalAmount).toFixed(2)}
          </p>
        )}
      </div>

      {/* Payment Method */}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Payment Method</span>
        <span className="capitalize">
          {quote.payment_method?.replace(/_/g, ' ') || 'Not specified'}
        </span>
      </div>

      {/* Payment Date if paid */}
      {quote.paid_at && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Paid On</span>
          <span>{new Date(quote.paid_at).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
};