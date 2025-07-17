import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStatusManagement } from '@/hooks/useStatusManagement';

export const TestStatusFiltering = () => {
  const {
    quoteStatuses,
    orderStatuses,
    getStatusesForQuotesList,
    getStatusesForOrdersList,
    isLoading,
    error,
  } = useStatusManagement();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status Filtering Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
            <span>Loading status configuration...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">Status Filtering Test - Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  const quotesListStatuses = getStatusesForQuotesList();
  const ordersListStatuses = getStatusesForOrdersList();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Status Filtering Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">
              Quotes Page Statuses ({quotesListStatuses.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {quotesListStatuses.map((status) => (
                <Badge key={status} variant="outline" className="bg-blue-50 border-blue-200">
                  {status}
                </Badge>
              ))}
            </div>
            {quotesListStatuses.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No statuses configured for quotes page
              </p>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-2">
              Orders Page Statuses ({ordersListStatuses.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {ordersListStatuses.map((status) => (
                <Badge key={status} variant="outline" className="bg-green-50 border-green-200">
                  {status}
                </Badge>
              ))}
            </div>
            {ordersListStatuses.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No statuses configured for orders page
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Status Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Quote Statuses</h3>
              <div className="grid gap-2">
                {quoteStatuses.map((status) => (
                  <div
                    key={status.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={status.color}>{status.name}</Badge>
                      <span className="text-sm">{status.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`px-2 py-1 rounded ${status.showsInQuotesList ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}
                      >
                        Quotes: {status.showsInQuotesList ? 'Yes' : 'No'}
                      </span>
                      <span
                        className={`px-2 py-1 rounded ${status.showsInOrdersList ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}
                      >
                        Orders: {status.showsInOrdersList ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Order Statuses</h3>
              <div className="grid gap-2">
                {orderStatuses.map((status) => (
                  <div
                    key={status.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={status.color}>{status.name}</Badge>
                      <span className="text-sm">{status.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`px-2 py-1 rounded ${status.showsInQuotesList ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}
                      >
                        Quotes: {status.showsInQuotesList ? 'Yes' : 'No'}
                      </span>
                      <span
                        className={`px-2 py-1 rounded ${status.showsInOrdersList ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}
                      >
                        Orders: {status.showsInOrdersList ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
