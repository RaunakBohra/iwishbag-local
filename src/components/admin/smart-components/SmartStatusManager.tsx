// ============================================================================
// SMART STATUS MANAGER - Intelligent Status Transitions
// Features: Smart status suggestions, automated workflows, validation
// ============================================================================

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Package, 
  Truck,
  DollarSign,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { UnifiedQuote } from '@/types/unified-quote';

interface SmartStatusManagerProps {
  quote: UnifiedQuote;
  onStatusUpdate: () => void;
}

export const SmartStatusManager: React.FC<SmartStatusManagerProps> = ({
  quote,
  onStatusUpdate,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: {
        label: 'Pending',
        color: 'bg-yellow-100 text-yellow-800',
        icon: <Clock className="w-3 h-3" />,
        nextActions: ['sent', 'approved'],
      },
      sent: {
        label: 'Sent',
        color: 'bg-blue-100 text-blue-800',
        icon: <Package className="w-3 h-3" />,
        nextActions: ['approved', 'rejected'],
      },
      approved: {
        label: 'Approved',
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="w-3 h-3" />,
        nextActions: ['payment_pending', 'paid'],
      },
      rejected: {
        label: 'Rejected',
        color: 'bg-red-100 text-red-800',
        icon: <AlertTriangle className="w-3 h-3" />,
        nextActions: ['pending'],
      },
      payment_pending: {
        label: 'Payment Pending',
        color: 'bg-orange-100 text-orange-800',
        icon: <DollarSign className="w-3 h-3" />,
        nextActions: ['paid', 'cancelled'],
      },
      paid: {
        label: 'Paid',
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="w-3 h-3" />,
        nextActions: ['ordered', 'shipped'],
      },
      ordered: {
        label: 'Ordered',
        color: 'bg-purple-100 text-purple-800',
        icon: <Package className="w-3 h-3" />,
        nextActions: ['shipped'],
      },
      shipped: {
        label: 'Shipped',
        color: 'bg-blue-100 text-blue-800',
        icon: <Truck className="w-3 h-3" />,
        nextActions: ['completed'],
      },
      completed: {
        label: 'Completed',
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="w-3 h-3" />,
        nextActions: [],
      },
      cancelled: {
        label: 'Cancelled',
        color: 'bg-gray-100 text-gray-800',
        icon: <AlertTriangle className="w-3 h-3" />,
        nextActions: [],
      },
    };

    return configs[status as keyof typeof configs] || configs.pending;
  };

  const currentConfig = getStatusConfig(quote.status);
  const canTransition = currentConfig.nextActions.length > 0;

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      // Here you would call the unifiedDataEngine to update status
      // await unifiedDataEngine.updateQuote(quote.id, { status: newStatus });
      // For now, we'll just call the parent callback
      onStatusUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getSmartSuggestion = () => {
    switch (quote.status) {
      case 'pending':
        return 'Ready to send to customer for review';
      case 'sent':
        return 'Waiting for customer approval';
      case 'approved':
        return 'Quote approved - request payment';
      case 'payment_pending':
        return 'Payment pending - follow up with customer';
      case 'paid':
        return 'Payment received - proceed with order';
      case 'ordered':
        return 'Order placed - prepare for shipping';
      case 'shipped':
        return 'Package shipped - tracking available';
      default:
        return null;
    }
  };

  const suggestion = getSmartSuggestion();

  return (
    <div className="flex items-center space-x-2">
      {/* Current Status Badge */}
      <Badge className={`flex items-center space-x-1 ${currentConfig.color}`}>
        {currentConfig.icon}
        <span>{currentConfig.label}</span>
      </Badge>

      {/* Status Transition Dropdown */}
      {canTransition && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={isUpdating}
              className="flex items-center space-x-1"
            >
              <span>Change Status</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {currentConfig.nextActions.map((nextStatus) => {
              const nextConfig = getStatusConfig(nextStatus);
              return (
                <DropdownMenuItem
                  key={nextStatus}
                  onClick={() => handleStatusChange(nextStatus)}
                  className="flex items-center space-x-2"
                >
                  <div className={`p-1 rounded-full ${nextConfig.color}`}>
                    {nextConfig.icon}
                  </div>
                  <span>{nextConfig.label}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Smart Suggestion */}
      {suggestion && (
        <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
          💡 {suggestion}
        </div>
      )}
    </div>
  );
};