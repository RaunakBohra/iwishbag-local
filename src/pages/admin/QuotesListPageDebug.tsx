import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useQuotesPaginated } from '@/hooks/useQuotes';
import { CompactQuoteListItem } from '@/components/admin/CompactQuoteListItem';

const QuotesListPageDebug: React.FC = () => {
  console.log('🎯 DEBUG: QuotesListPage with useQuotesPaginated hook');
  
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  
  console.log('🎯 DEBUG: Basic state initialized', { searchTerm });
  
  // Test the quotes hook
  const filters = { search: searchTerm || undefined };
  const { data: paginatedData, isLoading, refetch } = useQuotesPaginated(filters, 1, 25);
  
  console.log('🎯 DEBUG: useQuotesPaginated result', { 
    dataExists: !!paginatedData,
    isLoading,
    quotesCount: paginatedData?.data?.length || 0,
    totalCount: paginatedData?.pagination?.total || 0
  });
  
  const quotes = paginatedData?.data || [];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Debug: Testing CompactQuoteListItem</h1>
      <p>Testing useQuotesPaginated hook + quote rendering...</p>
      <p>Search term: {searchTerm}</p>
      <p>Is Loading: {isLoading ? 'Yes' : 'No'}</p>
      <p>Quotes Count: {quotes.length}</p>
      <p>Total Count: {paginatedData?.pagination?.total || 0}</p>
      
      <div className="mt-4 border rounded-lg">
        <h2 className="text-lg font-semibold p-3 border-b">First 3 Quotes:</h2>
        {quotes.slice(0, 3).map((quote) => (
          <CompactQuoteListItem
            key={quote.id}
            quote={quote}
            onQuoteClick={(quoteId) => {
              console.log('Quote clicked:', quoteId);
              navigate(`/admin/quote-calculator-v2/${quoteId}`);
            }}
          />
        ))}
      </div>
      
      <button onClick={() => navigate('/admin')} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
        Go to Admin Dashboard
      </button>
      <button onClick={() => refetch()} className="mt-4 ml-2 px-4 py-2 bg-green-500 text-white rounded">
        Refetch Quotes
      </button>
    </div>
  );
};

export default QuotesListPageDebug;