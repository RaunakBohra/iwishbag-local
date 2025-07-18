import React from 'react';
import EmailTemplateManager from '@/components/admin/EmailTemplateManager';

const EmailTemplatesPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Stripe-style header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Email templates</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Manage email templates for customer communications, notifications, and automated messaging.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmailTemplateManager />
      </div>
    </div>
  );
};

export default EmailTemplatesPage;
