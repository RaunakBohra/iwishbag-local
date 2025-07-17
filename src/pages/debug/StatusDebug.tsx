import React from 'react';
import { StatusConfigInitializer } from '@/components/debug/StatusConfigInitializer';
import { StatusFilteringTest } from '@/components/debug/StatusFilteringTest';

export default function StatusDebug() {
  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Status Configuration Debug Tool</h1>
        <p className="text-gray-600">
          This tool helps debug and fix issues with status filtering where quotes with
          "payment_pending" status appear in the quotes list instead of the orders list.
        </p>
      </div>

      <StatusFilteringTest />
      <StatusConfigInitializer />
    </div>
  );
}
