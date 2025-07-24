import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

/**
 * SentryTestTrigger - A component to test Sentry error reporting
 *
 * This component provides a button that intentionally throws an error
 * to verify that Sentry is properly configured and capturing errors.
 *
 * ⚠️ IMPORTANT: Remove this component from production builds!
 */
export const SentryTestTrigger: React.FC = () => {
  const triggerSentryError = () => {
    throw new Error('Sentry Test Error');
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <span className="text-sm font-medium text-yellow-800">Sentry Test</span>
      </div>
      <p className="text-xs text-yellow-700 mb-3">Click to test Sentry error reporting</p>
      <Button onClick={triggerSentryError} variant="destructive" size="sm" className="w-full">
        Trigger Test Error
      </Button>
      <p className="text-xs text-yellow-600 mt-2">⚠️ Remove this component after testing!</p>
    </div>
  );
};
