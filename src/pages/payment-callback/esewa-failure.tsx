import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const EsewaFailure: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'failed' | 'error'>('processing');
  const [message, setMessage] = useState('Processing eSewa payment response...');

  useEffect(() => {
    const processEsewaCallback = async () => {
      try {
        // eSewa sends the response data as URL parameters (encoded)
        const encodedData = searchParams.get('data');
        
        if (!encodedData) {
          setStatus('failed');
          setMessage('Payment was cancelled or failed.');
          
          // Redirect to failure page after a brief delay
          setTimeout(() => {
            navigate('/payment-failure?gateway=esewa&status=cancelled');
          }, 3000);
          return;
        }

        console.log('📥 eSewa failure callback - data length:', encodedData.length);

        // Call our Edge Function to handle the eSewa callback
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/esewa-callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
            'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
          },
          body: encodedData
        });

        const result = await response.json();

        if (result.success && result.status === 'COMPLETE') {
          // Even though this is the failure URL, payment might have succeeded
          setStatus('failed');
          setMessage('Payment was successful but routed to failure URL. Redirecting...');
          
          setTimeout(() => {
            navigate('/payment-success?gateway=esewa&status=success');
          }, 2000);
        } else {
          setStatus('failed');
          setMessage(result.message || 'Payment was not completed successfully.');
          
          // Redirect to failure page after a brief delay
          setTimeout(() => {
            navigate('/payment-failure?gateway=esewa&status=failed');
          }, 3000);
        }
      } catch (error) {
        console.error('❌ eSewa failure callback processing error:', error);
        setStatus('error');
        setMessage('An error occurred while processing your payment response.');
        
        // Redirect to failure page after a brief delay
        setTimeout(() => {
          navigate('/payment-failure?gateway=esewa&status=error');
        }, 3000);
      }
    };

    processEsewaCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          {status === 'processing' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Response</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}
          
          {(status === 'failed' || status === 'error') && (
            <>
              <div className="rounded-full h-12 w-12 bg-red-100 mx-auto mb-4 flex items-center justify-center">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-red-900 mb-2">Payment Not Completed</h2>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500 mt-2">Redirecting you back...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EsewaFailure;