import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Loader2,
  Receipt,
  AlertTriangle,
  Package
} from 'lucide-react';
import { Message } from '@/components/messaging/types';

interface OrderWithPaymentProof {
  id: string;
  order_display_id: string;
  final_total: number;
  final_currency: string;
  payment_status: string;
  created_at: string;
  paymentProofMessage?: Message & { message_type: 'payment_proof' };
  isSelected: boolean;
}

interface BatchPaymentVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderWithPaymentProof[];
  onOrdersUpdate: (orders: OrderWithPaymentProof[]) => void;
}

type BatchAction = 'verify' | 'reject' | 'confirm';

export const BatchPaymentVerification: React.FC<BatchPaymentVerificationProps> = ({
  isOpen,
  onClose,
  orders,
  onOrdersUpdate
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [batchAction, setBatchAction] = useState<BatchAction>('verify');
  const [batchNotes, setBatchNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedOrdersData = orders.filter(order => selectedOrders.includes(order.id));
  const totalAmount = selectedOrdersData.reduce((sum, order) => sum + order.final_total, 0);

  // Batch verification mutation
  const batchVerificationMutation = useMutation({
    mutationFn: async ({ action, notes, orderIds }: { action: BatchAction; notes: string; orderIds: string[] }) => {
      setIsProcessing(true);
      
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const results = [];
      
      for (const orderId of orderIds) {
        const order = orders.find(o => o.id === orderId);
        if (!order?.paymentProofMessage) continue;

        // Update message verification status
        const { error: messageError } = await supabase
          .from('messages')
          .update({
            verification_status: action === 'verify' ? 'verified' : action === 'confirm' ? 'confirmed' : 'rejected',
            admin_notes: notes,
            verified_by: user.id,
            verified_at: new Date().toISOString()
          })
          .eq('id', order.paymentProofMessage.id);

        if (messageError) {
          results.push({ orderId, success: false, error: messageError.message });
          continue;
        }

        // If confirming payment, also update the order payment status
        if (action === 'confirm') {
          const { error: orderError } = await supabase
            .from('quotes')
            .update({
              payment_status: 'paid',
              paid_at: new Date().toISOString(),
              amount_paid: order.final_total
            })
            .eq('id', orderId);

          if (orderError) {
            results.push({ orderId, success: false, error: orderError.message });
            continue;
          }
        }

        results.push({ orderId, success: true });
      }

      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      setIsProcessing(false);
      
      if (successCount > 0) {
        toast({
          title: 'Batch Processing Complete',
          description: `${successCount} order(s) processed successfully. ${failureCount > 0 ? `${failureCount} failed.` : ''}`,
        });
      }

      if (failureCount > 0) {
        toast({
          title: 'Some Orders Failed',
          description: `${failureCount} order(s) could not be processed.`,
          variant: 'destructive',
        });
      }

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['quote-messages'] });
      
      // Clear selections and close
      setSelectedOrders([]);
      onClose();
    },
    onError: (error) => {
      setIsProcessing(false);
      toast({
        title: 'Batch Processing Failed',
        description: `Error: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(orders.map(order => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleBatchProcess = () => {
    if (selectedOrders.length === 0) {
      toast({
        title: 'No Orders Selected',
        description: 'Please select at least one order to process.',
        variant: 'destructive',
      });
      return;
    }

    batchVerificationMutation.mutate({
      action: batchAction,
      notes: batchNotes.trim() || getDefaultNotes(batchAction),
      orderIds: selectedOrders
    });
  };

  const getDefaultNotes = (action: BatchAction): string => {
    switch (action) {
      case 'verify': return 'Batch verification - payment proof approved';
      case 'confirm': return 'Batch confirmation - payment verified and order confirmed';
      case 'reject': return 'Batch rejection - payment proof insufficient';
      default: return '';
    }
  };

  const getActionColor = (action: BatchAction) => {
    switch (action) {
      case 'verify': return 'bg-blue-600 hover:bg-blue-700';
      case 'confirm': return 'bg-green-600 hover:bg-green-700';
      case 'reject': return 'bg-red-600 hover:bg-red-700';
      default: return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  const getActionIcon = (action: BatchAction) => {
    switch (action) {
      case 'verify': return <Eye className="h-4 w-4" />;
      case 'confirm': return <CheckCircle className="h-4 w-4" />;
      case 'reject': return <XCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Batch Payment Verification
          </DialogTitle>
          <DialogDescription>
            Select multiple orders to verify, confirm, or reject payment proofs in bulk.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selection Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedOrders.length === orders.length && orders.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="font-medium">
                  Select All ({selectedOrders.length} of {orders.length} selected)
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Total Selected Amount: <span className="font-medium">{totalAmount.toFixed(2)} {selectedOrdersData[0]?.final_currency || 'USD'}</span>
              </div>
            </div>
          </div>

          {/* Orders List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {orders.map((order) => (
              <div 
                key={order.id}
                className={`border rounded-lg p-4 transition-colors ${
                  selectedOrders.includes(order.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedOrders.includes(order.id)}
                    onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Order #{order.order_display_id}</span>
                        <Badge variant="outline">
                          {order.final_total.toFixed(2)} {order.final_currency}
                        </Badge>
                        <Badge 
                          className={
                            order.paymentProofMessage?.verification_status === 'verified' ? 'bg-blue-100 text-blue-800' :
                            order.paymentProofMessage?.verification_status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            order.paymentProofMessage?.verification_status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {order.paymentProofMessage?.verification_status || 'pending'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {order.paymentProofMessage && (
                      <div className="mt-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-3 w-3" />
                          Payment proof: {order.paymentProofMessage.attachment_file_name}
                        </div>
                        {order.paymentProofMessage.admin_notes && (
                          <div className="mt-1 text-xs italic">
                            Notes: {order.paymentProofMessage.admin_notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Batch Action Controls */}
          <div className="border-t pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="batch-action">Batch Action</Label>
                <Select value={batchAction} onValueChange={(value: BatchAction) => setBatchAction(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verify">Verify Payment Proofs</SelectItem>
                    <SelectItem value="confirm">Confirm Payments</SelectItem>
                    <SelectItem value="reject">Reject Payment Proofs</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Action Preview</Label>
                <div className="border rounded-md p-3 bg-gray-50 text-sm">
                  {batchAction === 'verify' && 'Mark payment proofs as verified (requires manual payment confirmation)'}
                  {batchAction === 'confirm' && 'Verify proofs AND confirm payments (updates order status to paid)'}
                  {batchAction === 'reject' && 'Reject payment proofs (customer needs to resubmit)'}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="batch-notes">Batch Notes</Label>
              <Textarea
                id="batch-notes"
                value={batchNotes}
                onChange={(e) => setBatchNotes(e.target.value)}
                placeholder={getDefaultNotes(batchAction)}
                rows={3}
              />
            </div>

            {/* Warning for confirm action */}
            {batchAction === 'confirm' && selectedOrders.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-yellow-800">Confirm Payment Action</div>
                  <div className="text-yellow-700 mt-1">
                    This will mark {selectedOrders.length} order(s) as paid and update their status. 
                    Total amount: {totalAmount.toFixed(2)} {selectedOrdersData[0]?.final_currency || 'USD'}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleBatchProcess}
                disabled={selectedOrders.length === 0 || isProcessing}
                className={getActionColor(batchAction)}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {getActionIcon(batchAction)}
                    <span className="ml-2">
                      {batchAction === 'verify' && 'Verify Selected'}
                      {batchAction === 'confirm' && 'Confirm Selected'}
                      {batchAction === 'reject' && 'Reject Selected'}
                    </span>
                    <span className="ml-1">({selectedOrders.length})</span>
                  </>
                )}
              </Button>
              
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};