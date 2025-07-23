import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

// Temporary placeholder component - will be replaced by new unified system
interface QuoteDetailUnifiedProps {
  isShareToken?: boolean;
}

const QuoteDetailUnified: React.FC<QuoteDetailUnifiedProps> = ({ isShareToken = false }) => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg text-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
          System Under Maintenance
        </h1>
        <p className="text-gray-600 mb-6">
          The quote detail system is being upgraded to a more efficient unified interface. 
          This will be available soon with improved performance and features.
        </p>
        <Button
          onClick={() => navigate(isShareToken ? '/' : '/dashboard')}
          className="inline-flex items-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    </div>
  );
};

export default QuoteDetailUnified;