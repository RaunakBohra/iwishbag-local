import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Info, Terminal, Bug } from 'lucide-react';

export function PayUDebugInstructions() {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          PayU Payment Debug Guide
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            If PayU payments aren't working, follow these steps to debug:
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5">
              1
            </Badge>
            <div>
              <h4 className="font-medium">Attempt a PayU Payment</h4>
              <p className="text-sm text-muted-foreground">
                Try to make a payment with PayU. The debug data will be stored even if the payment
                fails.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5">
              2
            </Badge>
            <div>
              <h4 className="font-medium">Check Console Logs</h4>
              <p className="text-sm text-muted-foreground">Open browser console (F12) and run:</p>
              <code className="block bg-gray-100 p-2 rounded mt-1 text-sm">
                PayUDebugger.displayInConsole()
              </code>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5">
              3
            </Badge>
            <div>
              <h4 className="font-medium">Visit Debug Page</h4>
              <p className="text-sm text-muted-foreground">
                Go to{' '}
                <a href="/admin/debug/payu" className="text-blue-600 hover:underline">
                  /admin/debug/payu
                </a>{' '}
                to view a formatted view of the logs.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5">
              4
            </Badge>
            <div>
              <h4 className="font-medium">Check What's Logged</h4>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>
                  • <strong>Response:</strong> What the backend sent to frontend
                </li>
                <li>
                  • <strong>Submission:</strong> What form data was sent to PayU
                </li>
                <li>
                  • <strong>Error:</strong> Any validation or processing errors
                </li>
              </ul>
            </div>
          </div>
        </div>

        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertDescription>
            <strong>Console Commands:</strong>
            <br />
            <code className="text-sm">PayUDebugger.displayInConsole()</code> - Show all logs
            <br />
            <code className="text-sm">PayUDebugger.clear()</code> - Clear all logs
            <br />
            <code className="text-sm">PayUDebugger.getLastLog()</code> - Get most recent log
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
