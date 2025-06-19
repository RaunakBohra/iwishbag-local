// eSewa Configuration
export const ESEWA_CONFIG = {
  // Test environment
  test: {
    merchantId: 'EPAYTEST', // Use the known working test merchant ID
    secretKey: '8gBm/:&EnhH.1/q(', // Use the known working test secret key
    paymentUrl: 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
    statusCheckUrl: 'https://rc.esewa.com.np/api/epay/transaction/status/',
    environment: 'test' as const
  },
  
  // Live environment
  live: {
    merchantId: 'NP-ES-IWISH', // Real merchant ID
    secretKey: 'LCQsJCkxKiJDKyNIMjJeIjIwNjs', // Real secret key
    paymentUrl: 'https://epay.esewa.com.np/api/epay/main/v2/form',
    statusCheckUrl: 'https://epay.esewa.com.np/api/epay/transaction/status/',
    environment: 'live' as const
  }
};

// Get current environment
export const getESewaConfig = () => {
  // Use live environment with real credentials
  const environment = 'live' as const; // Use live mode with real credentials
  // const environment = (import.meta.env.VITE_ESEWA_ENVIRONMENT as 'test' | 'live') || 'test';
  return ESEWA_CONFIG[environment];
};

// Test credentials for development
export const ESEWA_TEST_CREDENTIALS = {
  esewaId: '9806800001',
  password: 'Nepal@123',
  mpin: '1122',
  token: '123456'
};

// eSewa Payment Parameters Interface
export interface ESewaPaymentParams {
  amt: string;           // Amount
  pdc: string;           // Product delivery charge
  psc: string;           // Product service charge
  txAmt: string;         // Tax amount
  tAmt: string;          // Total amount
  pid: string;           // Product ID (Order ID)
  scd: string;           // Service code (Merchant ID)
  su: string;            // Success URL
  fu: string;            // Failure URL
  customer_name?: string;
  customer_email?: string;
}

// Build eSewa payment URL
export const buildESewaPaymentUrl = (params: ESewaPaymentParams): string => {
  const config = getESewaConfig();
  const urlParams = new URLSearchParams(params);
  return `${config.paymentUrl}?${urlParams.toString()}`;
};

// Validate eSewa payment response
export const validateESewaResponse = (response: any): boolean => {
  // This would validate the response from eSewa
  // In a real implementation, you'd verify the signature and other security measures
  return response && response.oid && response.amt;
}; 