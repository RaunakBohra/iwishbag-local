/**
 * HSN MANAGEMENT PAGE
 *
 * Admin page for managing HSN codes, tax calculations, and product classifications.
 * Provides comprehensive HSN management functionality including:
 * - HSN code CRUD operations
 * - Product classification testing
 * - Tax calculation method configuration
 * - Analytics and system health monitoring
 *
 * Features:
 * - Integrated with 2-tier tax system
 * - Smart search and filtering
 * - Bulk operations support
 * - Real-time classification testing
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { HSNManagementInterface } from '@/components/admin/HSNManagementInterface';

const HSNManagement: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>HSN Management - iwishBag Admin</title>
        <meta
          name="description"
          content="Manage HSN codes, tax calculations, and product classifications for the iwishBag platform"
        />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <HSNManagementInterface className="max-w-7xl mx-auto" />
      </div>
    </>
  );
};

export default HSNManagement;
