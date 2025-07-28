import React from 'react';

console.log('🧪 TestQuotePage module loaded');

const TestQuotePage: React.FC = () => {
  console.log('🧪 TestQuotePage component rendered');
  return (
    <div style={{ 
      background: 'green', 
      color: 'white', 
      padding: '40px', 
      minHeight: '100vh', 
      fontSize: '32px',
      textAlign: 'center'
    }}>
      <h1>✅ TEST QUOTE PAGE WORKING!</h1>
      <p>This is a simple test component</p>
      <p>URL: {window.location.href}</p>
      <p>Time: {new Date().toLocaleString()}</p>
    </div>
  );
};

export default TestQuotePage;