import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// This component handles the redirect from Fonepay
export default function FonepayCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Get all query parameters from Fonepay
    const params = Object.fromEntries(searchParams.entries());
    console.log('📥 Fonepay callback params:', params);

    // The Edge Function will handle verification and redirect
    // This page is just a fallback if something goes wrong

    // Check if we have the required parameters
    if (params.PRN) {
      // Payment status
      const isSuccess = params.PS === 'true';

      // Redirect based on payment status
      if (isSuccess) {
        navigate(`/payment-success?gateway=fonepay&txn=${params.PRN}&uid=${params.UID}`);
      } else {
        navigate(`/payment-failure?gateway=fonepay&txn=${params.PRN}&rc=${params.RC}`);
      }
    } else {
      // No parameters, something went wrong
      navigate('/payment-failure?gateway=fonepay&error=missing_parameters');
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-orange-600 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Processing Fonepay Payment</h2>
        <p className="text-gray-600">Please wait while we verify your payment...</p>
      </div>
    </div>
  );
}
