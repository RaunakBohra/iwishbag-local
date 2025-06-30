import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStatusTransitions } from '@/hooks/useStatusTransitions';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { useToast } from '@/components/ui/use-toast';
import { DollarSign, FileText, Truck, AlertCircle, Package, User } from 'lucide-react';

interface StatusTransitionTestProps {
  quoteId: string;
  currentStatus: string;
}

export const StatusTransitionTest: React.FC<StatusTransitionTestProps> = ({ 
  quoteId, 
  currentStatus 
}) => {
  const { toast } = useToast();
  const { getStatusConfig } = useStatusManagement();
  const { 
    handlePaymentReceived, 
    handleQuoteSent, 
    handleOrderShipped, 
    handleQuoteExpired, 
    handleAutoCalculation,
    isTransitioning 
  } = useStatusTransitions();

  const currentStatusConfig = getStatusConfig(currentStatus, 'quote');

  const testTransitions = [
    {
      name: 'Payment Received',
      description: 'Simulate payment received (approved → paid)',
      icon: <DollarSign className="h-4 w-4" />,
      action: () => handlePaymentReceived(quoteId, currentStatus),
      enabled: currentStatus === 'approved',
      color: 'bg-green-100 text-green-800'
    },
    {
      name: 'Quote Sent',
      description: 'Simulate quote sent (pending/calculated → sent)',
      icon: <FileText className="h-4 w-4" />,
      action: () => handleQuoteSent(quoteId, currentStatus),
      enabled: ['pending', 'calculated'].includes(currentStatus),
      color: 'bg-blue-100 text-blue-800'
    },
    {
      name: 'Order Shipped',
      description: 'Simulate order shipped (ordered → shipped)',
      icon: <Truck className="h-4 w-4" />,
      action: () => handleOrderShipped(quoteId, currentStatus),
      enabled: currentStatus === 'ordered',
      color: 'bg-purple-100 text-purple-800'
    },
    {
      name: 'Quote Expired',
      description: 'Simulate quote expired (sent → expired)',
      icon: <AlertCircle className="h-4 w-4" />,
      action: () => handleQuoteExpired(quoteId, currentStatus),
      enabled: currentStatus === 'sent',
      color: 'bg-red-100 text-red-800'
    },
    {
      name: 'Auto Calculation',
      description: 'Simulate auto calculation (pending → calculated)',
      icon: <Package className="h-4 w-4" />,
      action: () => handleAutoCalculation(quoteId, currentStatus),
      enabled: currentStatus === 'pending',
      color: 'bg-orange-100 text-orange-800'
    }
  ];

  const handleTestTransition = async (transition: typeof testTransitions[0]) => {
    try {
      await transition.action();
      toast({
        title: "Transition Test Successful",
        description: `Successfully triggered "${transition.name}" transition`,
      });
    } catch (error: any) {
      toast({
        title: "Transition Test Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Status Transition Testing
        </CardTitle>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          Test automatic status transitions for this quote. Current status: 
          <Badge className="ml-2" variant="outline">
            {currentStatusConfig?.label || currentStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {testTransitions.map((transition, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${transition.color}`}>
                  {transition.icon}
                </div>
                <div>
                  <div className="font-medium">{transition.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {transition.description}
                  </div>
                </div>
              </div>
              <Button
                onClick={() => handleTestTransition(transition)}
                disabled={!transition.enabled || isTransitioning}
                variant={transition.enabled ? "default" : "outline"}
                size="sm"
              >
                {isTransitioning ? 'Testing...' : 'Test'}
              </Button>
            </div>
          ))}
          
          {testTransitions.every(t => !t.enabled) && (
            <div className="text-center py-4 text-muted-foreground">
              <div>No automatic transitions available for current status.</div>
              <div className="text-sm">Change the quote status to test different transitions.</div>
            </div>
          )}
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Automatic transitions validate status changes before applying them</li>
            <li>• Status changes are logged with timestamps and user information</li>
            <li>• Email notifications are sent for important status changes</li>
            <li>• All transitions are tracked in the Status History section</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}; 