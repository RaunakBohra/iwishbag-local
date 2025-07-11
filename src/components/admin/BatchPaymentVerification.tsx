import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { PaymentProofPreviewModal } from '@/components/payment/PaymentProofPreviewModal';
import { 
  Eye, 
  Receipt,
  Package,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Message } from '@/components/messaging/types';

interface OrderWithPaymentProof {
  id: string;
  order_display_id: string;
  final_total: number;
  final_currency: string;
  payment_status: string;
  created_at: string;
  paymentProofMessage?: Message & { 
    message_type: 'payment_proof'; 
    sender_id?: string;
    created_at?: string;
    verified_at?: string;
  };
  isSelected: boolean;
}

interface BatchPaymentVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderWithPaymentProof[];
  onOrdersUpdate?: (orders: OrderWithPaymentProof[]) => void;
}

export const BatchPaymentVerification: React.FC<BatchPaymentVerificationProps> = ({
  isOpen,
  onClose,
  orders,
  onOrdersUpdate
}) => {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<OrderWithPaymentProof | null>(null);
  const [processedOrders, setProcessedOrders] = useState<Set<string>>(new Set());

  const handleOrderClick = (order: OrderWithPaymentProof) => {
    if (order.paymentProofMessage) {
      setSelectedOrder(order);
    }
  };

  const handleStatusUpdate = (orderId: string) => {
    // Mark order as processed
    setProcessedOrders(prev => new Set(prev).add(orderId));
    setSelectedOrder(null);
    
    // Refresh all queries
    queryClient.invalidateQueries({ queryKey: ['payment-proof-message'] });
    queryClient.invalidateQueries({ queryKey: ['orders-with-payment-proofs'] });
    queryClient.invalidateQueries({ queryKey: ['payment-proof-stats'] });
    queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'verified':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'verified':
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Payment Proofs
            </DialogTitle>
            <DialogDescription>
              Review and verify payment proofs. Pending proofs are highlighted. Click on any order to view details.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No pending payment proofs found.</p>
                <p className="text-sm text-gray-400 mt-1">Payment proofs will appear here when customers upload them.</p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[calc(85vh-200px)] pr-2">
                {orders.map((order) => {
                  const isProcessed = processedOrders.has(order.id);
                  const verificationStatus = order.paymentProofMessage?.verification_status;
                  
                  return (
                    <div 
                      key={order.id}
                      className={`border rounded-lg p-4 transition-all hover:shadow-md cursor-pointer ${
                        isProcessed ? 'opacity-60 bg-gray-50' : 'bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => !isProcessed && handleOrderClick(order)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-lg">Order #{order.order_display_id}</h4>
                            <Badge className={`${getStatusColor(verificationStatus)} flex items-center gap-1`}>
                              {getStatusIcon(verificationStatus)}
                              {verificationStatus || 'pending'}
                            </Badge>
                            {isProcessed && (
                              <Badge variant="outline" className="text-green-600 border-green-300">
                                Processed
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-gray-400" />
                              <span>
                                <span className="font-medium">{order.final_currency} {order.final_total.toFixed(2)}</span>
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600">
                                {new Date(order.paymentProofMessage?.created_at || order.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            
                            {order.paymentProofMessage && (
                              <div className="flex items-center gap-2">
                                <Receipt className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600 truncate">
                                  {order.paymentProofMessage.attachment_file_name}
                                </span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {order.payment_status || 'Unpaid'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-4"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOrderClick(order);
                          }}
                          disabled={isProcessed}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t pt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {processedOrders.size} of {orders.length} processed
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Individual Payment Proof Preview Modal */}
      {selectedOrder && selectedOrder.paymentProofMessage && (
        <PaymentProofPreviewModal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          message={selectedOrder.paymentProofMessage}
          orderId={selectedOrder.id}
          onStatusUpdate={() => handleStatusUpdate(selectedOrder.id)}
        />
      )}
    </>
  );
};