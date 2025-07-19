import React from 'react';
import { getTurnstileSiteKey, isTurnstileEnabled } from '@/lib/turnstileVerification';

export const TurnstileDebug: React.FC = () => {
  const siteKey = getTurnstileSiteKey();
  const isEnabled = isTurnstileEnabled();

  return (
    <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
      <h3 className="text-lg font-bold mb-2">Turnstile Debug Info</h3>
      <div className="space-y-2 text-sm">
        <div>
          <strong>Turnstile Enabled:</strong> {isEnabled ? '✅ Yes' : '❌ No'}
        </div>
        <div>
          <strong>Site Key:</strong> {siteKey ? `✅ ${siteKey.substring(0, 20)}...` : '❌ Not found'}
        </div>
        <div>
          <strong>Environment:</strong> {import.meta.env?.MODE || 'unknown'}
        </div>
        <div>
          <strong>Enable Flag:</strong> {import.meta.env?.VITE_ENABLE_TURNSTILE || 'not set'}
        </div>
      </div>
    </div>
  );
};

export default TurnstileDebug;