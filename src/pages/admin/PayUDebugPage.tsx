import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PayUDebugger, PayUDebugData } from '@/utils/payuDebug';
import { format } from 'date-fns';
import { Trash2, RefreshCw, Copy, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export function PayUDebugPage() {
  const [logs, setLogs] = useState<PayUDebugData[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const loadLogs = () => {
    const debugLogs = PayUDebugger.getLogs();
    setLogs(debugLogs);
  };

  useEffect(() => {
    loadLogs();
    // Also make PayUDebugger available in console
    (window as any).PayUDebugger = PayUDebugger;
  }, []);

  const clearLogs = () => {
    PayUDebugger.clear();
    loadLogs();
    toast({
      title: "Logs Cleared",
      description: "PayU debug logs have been cleared.",
    });
  };

  const copyToClipboard = async (data: any, index: number) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      toast({
        title: "Copied",
        description: "Debug data copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const getEventBadge = (event: string) => {
    switch (event) {
      case 'response':
        return <Badge variant="outline" className="bg-blue-50">Response</Badge>;
      case 'submission':
        return <Badge variant="outline" className="bg-green-50">Submission</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{event}</Badge>;
    }
  };

  const renderFormDataSummary = (formData: Record<string, string>) => {
    const requiredFields = ['key', 'txnid', 'amount', 'productinfo', 'firstname', 'email', 'phone', 'surl', 'furl', 'hash'];
    const presentFields = Object.keys(formData);
    const missingFields = requiredFields.filter(field => !presentFields.includes(field));

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {missingFields.length === 0 ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">All required fields present</span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600">Missing: {missingFields.join(', ')}</span>
            </>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><strong>Transaction ID:</strong> {formData.txnid || 'N/A'}</div>
          <div><strong>Amount:</strong> {formData.amount || 'N/A'}</div>
          <div><strong>Email:</strong> {formData.email || 'N/A'}</div>
          <div><strong>Phone:</strong> {formData.phone || 'N/A'}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>PayU Debug Logs</CardTitle>
            <div className="flex gap-2">
              <Button onClick={loadLogs} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={clearLogs} variant="outline" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Logs
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No PayU debug logs found.</p>
              <p className="text-sm mt-2">Logs will appear here when you attempt a PayU payment.</p>
              <p className="text-sm mt-4">You can also run <code className="bg-gray-100 px-2 py-1 rounded">PayUDebugger.displayInConsole()</code> in the browser console.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getEventBadge(log.event)}
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(log.data, index)}
                      >
                        {copiedIndex === index ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {log.event === 'submission' && log.data.formData ? (
                      renderFormDataSummary(log.data.formData)
                    ) : (
                      <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}