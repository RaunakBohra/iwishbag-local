import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePaymentGateways } from '@/hooks/usePaymentGateways';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const PaymentDebug = () => {
  const { user } = useAuth();
  const { 
    availableMethods, 
    userProfile, 
    allGateways,
    isLoading,
    getPaymentMethodDisplay 
  } = usePaymentGateways();

  const [debugInfo, setDebugInfo] = React.useState<any>(null);

  React.useEffect(() => {
    const fetchDebugInfo = async () => {
      if (!user) return;

      try {
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        // Get all payment gateways
        const { data: gateways } = await supabase
          .from('payment_gateways')
          .select('*');

        // Get PayU specifically
        const { data: payuGateway } = await supabase
          .from('payment_gateways')
          .select('*')
          .eq('code', 'payu')
          .single();

        setDebugInfo({
          user: {
            id: user.id,
            email: user.email
          },
          profile,
          gateways,
          payuGateway,
          availableMethods,
          userProfile
        });
      } catch (error) {
        console.error('Debug error:', error);
      }
    };

    fetchDebugInfo();
  }, [user, availableMethods, userProfile]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Debug - Loading...</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading debug information...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Payment Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* User Info */}
            <div>
              <h3 className="font-semibold mb-2">👤 User Information</h3>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                {JSON.stringify(debugInfo?.user, null, 2)}
              </pre>
            </div>

            {/* Profile Info */}
            <div>
              <h3 className="font-semibold mb-2">📋 User Profile</h3>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                {JSON.stringify(debugInfo?.profile, null, 2)}
              </pre>
            </div>

            {/* Available Methods */}
            <div>
              <h3 className="font-semibold mb-2">💳 Available Payment Methods</h3>
              <div className="bg-gray-100 p-2 rounded">
                <p className="text-sm">
                  <strong>Available Methods:</strong> {availableMethods?.join(', ') || 'None'}
                </p>
                <p className="text-sm">
                  <strong>Count:</strong> {availableMethods?.length || 0}
                </p>
              </div>
            </div>

            {/* All Gateways */}
            <div>
              <h3 className="font-semibold mb-2">🏦 All Payment Gateways</h3>
              <div className="space-y-2">
                {debugInfo?.gateways?.map((gateway: any) => (
                  <div key={gateway.id} className="bg-gray-100 p-2 rounded">
                    <p className="text-sm">
                      <strong>{gateway.name} ({gateway.code})</strong>
                    </p>
                    <p className="text-sm">
                      Active: {gateway.is_active ? '✅' : '❌'} | 
                      Countries: {gateway.supported_countries?.join(', ')} | 
                      Currencies: {gateway.supported_currencies?.join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* PayU Specific */}
            <div>
              <h3 className="font-semibold mb-2">🇮🇳 PayU Gateway Details</h3>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                {JSON.stringify(debugInfo?.payuGateway, null, 2)}
              </pre>
            </div>

            {/* Filtering Logic */}
            <div>
              <h3 className="font-semibold mb-2">🔍 Filtering Logic</h3>
              <div className="bg-gray-100 p-2 rounded text-sm">
                <p><strong>User Country:</strong> {debugInfo?.profile?.country}</p>
                <p><strong>User Currency:</strong> {debugInfo?.profile?.preferred_display_currency}</p>
                <p><strong>PayU Countries:</strong> {debugInfo?.payuGateway?.supported_countries?.join(', ')}</p>
                <p><strong>PayU Currencies:</strong> {debugInfo?.payuGateway?.supported_currencies?.join(', ')}</p>
                <p><strong>Country Match:</strong> {debugInfo?.payuGateway?.supported_countries?.includes(debugInfo?.profile?.country) ? '✅' : '❌'}</p>
                <p><strong>Currency Match:</strong> {debugInfo?.payuGateway?.supported_currencies?.includes(debugInfo?.profile?.preferred_display_currency) ? '✅' : '❌'}</p>
                <p><strong>PayU Active:</strong> {debugInfo?.payuGateway?.is_active ? '✅' : '❌'}</p>
              </div>
            </div>

            {/* Force PayU Button */}
            <div>
              <h3 className="font-semibold mb-2">🔧 Debug Actions</h3>
              <button 
                onClick={() => {
                  console.log('🔧 DEBUG: Forcing PayU to show up for testing');
                  window.location.reload();
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Force PayU & Reload
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 