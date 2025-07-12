export default function handler(req, res) {
  console.log('PayU Failure Handler - Method:', req.method);
  console.log('PayU Failure Handler - Body:', req.body);

  if (req.method === 'POST') {
    try {
      // Extract all PayU parameters from the POST body
      const params = new URLSearchParams();
      
      // Add all fields from req.body to params
      Object.entries(req.body || {}).forEach(([key, value]) => {
        if (value) {
          params.append(key, String(value));
        }
      });
      
      // Always add gateway parameter
      params.append('gateway', 'payu');
      
      console.log('Redirecting to:', `/payment-failure?${params.toString()}`);
      
      // Redirect to the React payment failure page with all parameters as GET
      res.redirect(302, `/payment-failure?${params.toString()}`);
    } catch (error) {
      console.error('Error processing PayU failure callback:', error);
      res.redirect(302, '/payment-failure?error=processing_failed');
    }
  } else {
    // For GET requests, just redirect to payment failure
    const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
    res.redirect(302, `/payment-failure?${queryString}`);
  }
}