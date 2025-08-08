/**
 * RegionalPricingAdminPage - Standalone Admin Page for Regional Pricing Management
 * 
 * Features:
 * - Complete regional pricing management interface
 * - Integrated with admin layout and navigation
 * - Mobile responsive design
 * - World-class UX matching admin design patterns
 */

import React from 'react';
import { RegionalPricingManager } from '@/components/admin/RegionalPricingManager';

const RegionalPricingAdminPage: React.FC = () => {
  return (
    <div className="flex flex-col space-y-6 p-6">
      {/* Page Header */}
      <div className="border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Regional Pricing</h1>
            <p className="text-muted-foreground mt-2">
              Manage add-on service pricing across 197 countries with intelligent regional optimization
            </p>
          </div>
          
          {/* Quick Stats */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="font-bold text-lg text-blue-600">5</div>
              <div className="text-muted-foreground">Services</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-green-600">197</div>
              <div className="text-muted-foreground">Countries</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-purple-600">6</div>
              <div className="text-muted-foreground">Continents</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <RegionalPricingManager />
      </div>
    </div>
  );
};

export default RegionalPricingAdminPage;