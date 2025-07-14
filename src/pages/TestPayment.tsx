import React from 'react';
import { PaymentGatewayTester } from '@/components/dev/PaymentGatewayTester';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TestPayment = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <Button 
          variant="outline" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <h1 className="text-2xl font-bold mb-6">Payment Gateway Testing</h1>
        
        <PaymentGatewayTester />
        
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h2 className="font-semibold mb-2">Testing Instructions:</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Select different countries to see available payment methods</li>
            <li>Run integration tests to verify database setup</li>
            <li>Check if PayPal appears for US, Nepal, and other configured countries</li>
            <li>Verify PayU remains primary for India with PayPal as secondary</li>
            <li>Test actual payment flow from checkout page</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default TestPayment;