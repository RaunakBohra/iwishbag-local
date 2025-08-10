import React from 'react';

const QuotesListPageMinimal: React.FC = () => {
  console.log('🎯 MINIMAL QuotesListPage loaded successfully!');
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Minimal Quotes Page</h1>
      <p>This is a minimal version to test if basic React component works.</p>
    </div>
  );
};

export default QuotesListPageMinimal;