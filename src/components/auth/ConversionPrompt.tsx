import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ProgressiveAuthModal } from './ProgressiveAuthModal';

interface ConversionPromptProps {
  trigger: 'quote_submitted' | 'cart_action' | 'checkout_start' | 'manual';
  onDismiss?: () => void;
  onConversionSuccess?: () => void;
  className?: string;
  submittedEmail?: string;
}

const PROMPT_MESSAGES = {
  quote_submitted: {
    title: 'Track Your Quote',
    description: 'Create an account to receive updates and track your quote progress.',
    benefits: [
      'Get notified when your quote is ready',
      'Track order status',
      'Save shipping addresses',
    ],
  },
  cart_action: {
    title: 'Save Your Cart',
    description: 'Create an account to save your cart and access it from any device.',
    benefits: ['Never lose your cart items', 'Faster checkout', 'Order history'],
  },
  checkout_start: {
    title: 'Secure Checkout',
    description: 'Create an account for a secure and faster checkout experience.',
    benefits: ['Secure payment processing', 'Order tracking', 'Saved payment methods'],
  },
  manual: {
    title: 'Create Your Account',
    description: 'Get the full iwishBag experience with a permanent account.',
    benefits: ['Track all your orders', 'Save preferences', 'Priority support'],
  },
};

export default function ConversionPrompt({
  trigger,
  onDismiss,
  onConversionSuccess,
  className = '',
  submittedEmail,
}: ConversionPromptProps) {
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if user is not anonymous or prompt is dismissed
  if (!user?.is_anonymous || isDismissed) {
    return null;
  }

  const promptConfig = PROMPT_MESSAGES[trigger];

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleConversionSuccess = () => {
    onConversionSuccess?.();
  };

  return (
    // Modal Overlay - Progressive Authentication
    <div
      className={`${className} fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50`}
    >
      <div className="relative max-w-md w-full bg-white rounded-lg shadow-xl p-6">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Progressive Auth Modal */}
        <ProgressiveAuthModal
          onSuccess={handleConversionSuccess}
          onBack={handleDismiss}
          prefilledEmail={submittedEmail}
        />
      </div>
    </div>
  );
}
