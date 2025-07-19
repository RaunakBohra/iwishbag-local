import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const EsewaSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing eSewa payment...');

  useEffect(() => {
    const processEsewaCallback = async () => {
      try {
        // eSewa sends the response data as URL parameters (encoded)
        const encodedData = searchParams.get('data');

        if (!encodedData) {
          setStatus('error');
          setMessage('No payment data received from eSewa.');
          return;
        }

        console.log('📥 eSewa success callback - data length:', encodedData.length);

        // Call our Edge Function to handle the eSewa callback
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/esewa-callback`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain',
              Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
            },
            body: encodedData,
          },
        );

        const result = await response.json();

        if (result.success) {
          setStatus('success');
          setMessage(result.message || 'Payment completed successfully!');

          // Redirect to success page after a brief delay
          setTimeout(() => {
            navigate('/payment-success?gateway=esewa&status=success');
          }, 2000);
        } else {
          setStatus('error');
          setMessage(result.error || 'Payment verification failed.');

          // Redirect to failure page after a brief delay
          setTimeout(() => {
            navigate('/payment-failure?gateway=esewa&status=error');
          }, 3000);
        }
      } catch (error) {
        console.error('❌ eSewa callback processing error:', error);
        setStatus('error');
        setMessage('An error occurred while processing your payment.');

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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Payment</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="rounded-full h-12 w-12 bg-green-100 mx-auto mb-4 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-green-900 mb-2">Payment Successful!</h2>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500 mt-2">Redirecting you to the success page...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="rounded-full h-12 w-12 bg-red-100 mx-auto mb-4 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-red-900 mb-2">Payment Error</h2>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500 mt-2">Redirecting you to the failure page...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EsewaSuccess;
