import React from 'react';
import { StripePaymentForm } from '@/components/payment/StripePaymentForm';
import { QRPaymentModal } from '@/components/payment/QRPaymentModal';
import { PaymentStatusTracker } from '@/components/payment/PaymentStatusTracker';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

interface PaymentProcessorProps {
  // Stripe Payment Form
  stripeClientSecret: string | null;
  onCancelStripePayment: () => void;
  paymentCurrency: string;
  totalAmount: number;
  customerInfo: {
    name: string;
    email: string;
    phone?: string;
    address?: {
      line1: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
  onStripeSuccess: (paymentIntent: any) => Promise<void>;
  onStripeError: (error: string) => void;

  // QR Payment Modal  
  showQRModal: boolean;
  setShowQRModal: (show: boolean) => void;
  qrPaymentData: {
    qrCodeUrl: string;
    transactionId: string;
    gateway: string;
  } | null;
  onQRSuccess: () => void;
  onQRError: (error: string) => void;

  // Payment Status Tracker
  showPaymentStatus: boolean;
  setShowPaymentStatus: (show: boolean) => void;
  currentTransactionId: string | null;
  paymentMethod: string;
  onPaymentStatusChange: (status: string) => void;
}

export const PaymentProcessor: React.FC<PaymentProcessorProps> = ({
  stripeClientSecret,
  onCancelStripePayment,
  paymentCurrency,
  totalAmount,
  customerInfo,
  onStripeSuccess,
  onStripeError,
  showQRModal,
  setShowQRModal,
  qrPaymentData,
  onQRSuccess,
  onQRError,
  showPaymentStatus,
  setShowPaymentStatus,
  currentTransactionId,
  paymentMethod,
  onPaymentStatusChange
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  return (
    <>
      {/* Stripe Payment Form Modal */}
      {stripeClientSecret && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Complete Payment</h3>
            
            <StripePaymentForm
              client_secret={stripeClientSecret}
              amount={totalAmount}
              currency={paymentCurrency}
              customerInfo={customerInfo}
              onSuccess={onStripeSuccess}
              onError={onStripeError}
            />

            {/* Cancel button */}
            <div className="mt-4 text-center">
              <button
                onClick={onCancelStripePayment}
                className="text-sm text-gray-600 hover:text-foreground"
              >
                Cancel Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Payment Modal */}
      {showQRModal && qrPaymentData && (
        <QRPaymentModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          qrCodeUrl={qrPaymentData.qrCodeUrl}
          transactionId={qrPaymentData.transactionId}
          gateway={qrPaymentData.gateway}
          amount={totalAmount}
          currency={paymentCurrency}
          onSuccess={onQRSuccess}
          onError={onQRError}
          autoRefresh={true}
          refreshInterval={5000}
        />
      )}

      {/* Payment Status Tracker */}
      {showPaymentStatus && currentTransactionId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <PaymentStatusTracker
              transactionId={currentTransactionId}
              gateway={paymentMethod}
              onStatusChange={(status) => {
                if (status === 'completed') {
                  setShowPaymentStatus(false);
                  toast({
                    title: 'Payment Successful',
                    description: 'Your payment has been processed successfully.',
                  });
                  navigate('/dashboard/orders');
                } else if (status === 'failed') {
                  setShowPaymentStatus(false);
                  toast({
                    title: 'Payment Failed',
                    description: 'There was an issue processing your payment. Please try again.',
                    variant: 'destructive',
                  });
                }
                onPaymentStatusChange(status);
              }}
              autoRefresh={true}
              refreshInterval={3000}
            />
          </div>
        </div>
      )}
    </>
  );
};