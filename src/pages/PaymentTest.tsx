import React from 'react';
import { useSearchParams } from 'react-router-dom';

const PaymentTest: React.FC = () => {
  const [searchParams] = useSearchParams();

  // Get all URL parameters
  const allParams = Object.fromEntries(searchParams.entries());

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Payment Test Page</h1>
      <p>This page successfully loaded! The routing is working.</p>

      <h2>URL Parameters Received:</h2>
      <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
        {JSON.stringify(allParams, null, 2)}
      </pre>

      <h2>Individual Parameters:</h2>
      <ul>
        <li>
          <strong>txnid:</strong> {searchParams.get('txnid') || 'Not provided'}
        </li>
        <li>
          <strong>status:</strong> {searchParams.get('status') || 'Not provided'}
        </li>
        <li>
          <strong>amount:</strong> {searchParams.get('amount') || 'Not provided'}
        </li>
        <li>
          <strong>gateway:</strong> {searchParams.get('gateway') || 'Not provided'}
        </li>
        <li>
          <strong>firstname:</strong> {searchParams.get('firstname') || 'Not provided'}
        </li>
        <li>
          <strong>email:</strong> {searchParams.get('email') || 'Not provided'}
        </li>
      </ul>

      <p style={{ marginTop: '20px' }}>
        <a href="/payment-success?gateway=payu&txnid=test123&status=success&amount=100">
          Test Success Link
        </a>
      </p>
    </div>
  );
};

export default PaymentTest;
