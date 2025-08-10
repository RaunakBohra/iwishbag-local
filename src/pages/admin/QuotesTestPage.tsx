import React from 'react';

const QuotesTestPage: React.FC = () => {
  console.log('🚀 TEST PAGE LOADED - Route is working!');
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Test Page Loaded Successfully!</h1>
      <p>If you see this, the admin route is working.</p>
    </div>
  );
};

export default QuotesTestPage;