// ============================================================================
// Development HSN Test Page
// Standalone page for testing the enhanced customs calculation system
// Access via: /dev/hsn-test
// ============================================================================

import React from 'react';
import { HSNTestInterface } from '@/components/dev/HSNTestInterface';

const HSNTestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Development Header */}
      <div className="bg-orange-600 text-white p-2 text-center text-sm font-medium">
        🧪 DEVELOPMENT MODE - HSN System Testing Interface
      </div>
      
      <HSNTestInterface />
    </div>
  );
};

export default HSNTestPage;