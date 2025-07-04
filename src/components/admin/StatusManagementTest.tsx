import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { StatusBadge } from '@/components/dashboard/StatusBadge';

export const StatusManagementTest = () => {
  const { quoteStatuses, orderStatuses, isLoading, error } = useStatusManagement();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Loading status configurations...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">Error loading status configurations: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dynamic Status System Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            This component tests the dynamic status system. All statuses below are loaded from the database.
          </p>
        </CardContent>
      </Card>

      {/* Quote Statuses */}
      <Card>
        <CardHeader>
          <CardTitle>Quote Statuses ({quoteStatuses?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quoteStatuses?.map((status) => (
              <div key={status.name} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={status.name} category="quote" />
                  <Badge variant="outline" className="text-xs">
                    {status.name}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm">
                  <p><strong>Label:</strong> {status.label}</p>
                  <p><strong>Color:</strong> {status.color || 'Default'}</p>
                  <p><strong>Icon:</strong> {status.icon || 'None'}</p>
                  <p><strong>Active:</strong> {status.isActive ? 'Yes' : 'No'}</p>
                  <p><strong>Order:</strong> {status.order}</p>
                  {status.description && (
                    <p><strong>Description:</strong> {status.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {(!quoteStatuses || quoteStatuses.length === 0) && (
            <p className="text-center text-muted-foreground py-4">
              No quote statuses configured
            </p>
          )}
        </CardContent>
      </Card>

      {/* Order Statuses */}
      <Card>
        <CardHeader>
          <CardTitle>Order Statuses ({orderStatuses?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orderStatuses?.map((status) => (
              <div key={status.name} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={status.name} category="order" />
                  <Badge variant="outline" className="text-xs">
                    {status.name}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm">
                  <p><strong>Label:</strong> {status.label}</p>
                  <p><strong>Color:</strong> {status.color || 'Default'}</p>
                  <p><strong>Icon:</strong> {status.icon || 'None'}</p>
                  <p><strong>Active:</strong> {status.isActive ? 'Yes' : 'No'}</p>
                  <p><strong>Order:</strong> {status.order}</p>
                  {status.description && (
                    <p><strong>Description:</strong> {status.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {(!orderStatuses || orderStatuses.length === 0) && (
            <p className="text-center text-muted-foreground py-4">
              No order statuses configured
            </p>
          )}
        </CardContent>
      </Card>

      {/* Test Status Badge with Different Statuses */}
      <Card>
        <CardHeader>
          <CardTitle>Status Badge Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Testing StatusBadge component with different status values:
          </p>
          <div className="flex flex-wrap gap-2">
            {quoteStatuses?.map((status) => (
              <StatusBadge key={status.name} status={status.name} category="quote" />
            ))}
            {orderStatuses?.map((status) => (
              <StatusBadge key={status.name} status={status.name} category="order" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 