import React from 'react';
import { FixStatusJSON } from '@/components/admin/FixStatusJSON';

export default function FixDatabase() {
  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Database Fixes</h1>
          <p className="text-muted-foreground">Tools to fix common database issues</p>
        </div>

        <FixStatusJSON />
      </div>
    </div>
  );
}
