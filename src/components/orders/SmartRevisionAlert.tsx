import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Eye,
  MessageCircle
} from 'lucide-react';
import { Database } from '@/types/database';

type ItemRevision = Database['public']['Tables']['item_revisions']['Row'] & {
  order_items?: Database['public']['Tables']['order_items']['Row'];
};

interface SmartRevisionAlertProps {
  revisions: ItemRevision[];
  onApprove?: (revisionId: string) => void;
  onReject?: (revisionId: string) => void;
  onViewDetails?: (revisionId: string) => void;
  onContactCustomer?: (revisionId: string) => void;
  isCustomerView?: boolean;
}

export const SmartRevisionAlert: React.FC<SmartRevisionAlertProps> = ({
  revisions,
  onApprove,
  onReject,
  onViewDetails,
  onContactCustomer,
  isCustomerView = false
}) => {
  const pendingRevisions = revisions.filter(r => 
    r.customer_approval_status === 'pending' || 
    r.customer_approval_status === 'awaiting_customer_response'
  );

  const approvedRevisions = revisions.filter(r => 
    r.customer_approval_status === 'approved' || 
    r.customer_approval_status === 'auto_approved'
  );

  const rejectedRevisions = revisions.filter(r => 
    r.customer_approval_status === 'rejected'
  );

  const getRevisionIcon = (changeType: string) => {
    switch (changeType) {
      case 'price_increase': return TrendingUp;
      case 'price_decrease': return TrendingDown;
      case 'weight_increase': return Package;
      case 'weight_decrease': return Package;
      default: return AlertTriangle;
    }
  };

  const getRevisionBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
      case 'auto_approved': return 'default';
      case 'pending':
      case 'awaiting_customer_response': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const getImpactColor = (impact: number) => {
    if (impact > 0) return 'text-red-600';
    if (impact < 0) return 'text-green-600';
    return 'text-gray-600';
  };

  const getImpactBgColor = (impact: number) => {
    if (impact > 0) return 'bg-red-50 border-red-200';
    if (impact < 0) return 'bg-green-50 border-green-200';
    return 'bg-gray-50 border-gray-200';
  };

  if (revisions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          {isCustomerView ? 'Price & Weight Changes' : 'Smart Revision Management'}
          {pendingRevisions.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {pendingRevisions.length} pending
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-gray-500">
          {isCustomerView 
            ? 'Changes detected in your order items that require your attention'
            : 'Automated price and weight revisions with smart approval logic'
          }
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Pending Revisions - Highest Priority */}
          {pendingRevisions.length > 0 && (
            <div>
              <h4 className="font-medium text-orange-700 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Awaiting {isCustomerView ? 'Your' : 'Customer'} Response ({pendingRevisions.length})
              </h4>
              <div className="space-y-3">
                {pendingRevisions.map((revision) => {
                  const Icon = getRevisionIcon(revision.change_type || '');
                  const impact = revision.total_cost_impact || 0;
                  
                  return (
                    <div 
                      key={revision.id} 
                      className={`p-4 rounded-lg border ${getImpactBgColor(impact)}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Icon className={`h-5 w-5 ${getImpactColor(impact)}`} />
                          <div>
                            <h5 className="font-medium">
                              {revision.order_items?.product_name || 'Product Item'}
                            </h5>
                            <p className="text-sm text-gray-600 capitalize">
                              {revision.change_type?.replace('_', ' ')} • Revision #{revision.revision_number}
                            </p>
                          </div>
                        </div>
                        <Badge variant={getRevisionBadgeVariant(revision.customer_approval_status || '')}>
                          {revision.customer_approval_status?.replace('_', ' ')}
                        </Badge>
                      </div>

                      {/* Impact Details */}
                      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                        {revision.original_price && revision.new_price && (
                          <div>
                            <span className="text-gray-500">Price Change:</span>
                            <div className="flex items-center gap-2">
                              <span>${revision.original_price.toFixed(2)}</span>
                              <span>→</span>
                              <span className={getImpactColor(impact)}>
                                ${revision.new_price.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {revision.total_cost_impact && (
                          <div>
                            <span className="text-gray-500">Total Impact:</span>
                            <div className={`font-medium ${getImpactColor(impact)}`}>
                              {impact > 0 ? '+' : ''}${Math.abs(impact).toFixed(2)}
                              {revision.price_change_percentage && (
                                <span className="text-xs ml-1">
                                  ({revision.price_change_percentage.toFixed(1)}%)
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Reason */}
                      {revision.change_reason && (
                        <div className="mb-3">
                          <span className="text-sm text-gray-500">Reason:</span>
                          <p className="text-sm mt-1">{revision.change_reason}</p>
                        </div>
                      )}

                      {/* Auto-approval info */}
                      {revision.auto_approval_eligible && !revision.auto_approved && (
                        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                          <div className="flex items-center gap-2 text-blue-700">
                            <CheckCircle className="h-4 w-4" />
                            <span className="font-medium">Auto-approval eligible</span>
                          </div>
                          {revision.auto_approval_reason && (
                            <p className="text-blue-600 mt-1">{revision.auto_approval_reason}</p>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t">
                        {onViewDetails && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewDetails(revision.id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Details
                          </Button>
                        )}
                        
                        {!isCustomerView && onContactCustomer && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onContactCustomer(revision.id)}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Contact Customer
                          </Button>
                        )}

                        {isCustomerView && (
                          <>
                            {onApprove && (
                              <Button
                                size="sm"
                                onClick={() => onApprove(revision.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                            )}
                            {onReject && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => onReject(revision.id)}
                              >
                                Reject
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Approved Revisions */}
          {approvedRevisions.length > 0 && (
            <div>
              <h4 className="font-medium text-green-700 mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Approved Changes ({approvedRevisions.length})
              </h4>
              <div className="space-y-2">
                {approvedRevisions.slice(0, 3).map((revision) => {
                  const impact = revision.total_cost_impact || 0;
                  
                  return (
                    <div key={revision.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                      <div>
                        <span className="font-medium text-sm">
                          {revision.order_items?.product_name || 'Product Item'}
                        </span>
                        <p className="text-xs text-green-700">
                          {revision.change_type?.replace('_', ' ')} • 
                          {impact > 0 ? '+' : ''}${Math.abs(impact).toFixed(2)}
                          {revision.auto_approved ? ' (Auto-approved)' : ''}
                        </p>
                      </div>
                      <Badge variant="default" className="bg-green-600">
                        Approved
                      </Badge>
                    </div>
                  );
                })}
                {approvedRevisions.length > 3 && (
                  <p className="text-sm text-gray-500 text-center">
                    +{approvedRevisions.length - 3} more approved changes
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Rejected Revisions */}
          {rejectedRevisions.length > 0 && (
            <div>
              <h4 className="font-medium text-red-700 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Rejected Changes ({rejectedRevisions.length})
              </h4>
              <div className="space-y-2">
                {rejectedRevisions.slice(0, 2).map((revision) => (
                  <div key={revision.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded">
                    <div>
                      <span className="font-medium text-sm">
                        {revision.order_items?.product_name || 'Product Item'}
                      </span>
                      <p className="text-xs text-red-700">
                        {revision.change_type?.replace('_', ' ')} rejected
                      </p>
                    </div>
                    <Badge variant="destructive">
                      Rejected
                    </Badge>
                  </div>
                ))}
                {rejectedRevisions.length > 2 && (
                  <p className="text-sm text-gray-500 text-center">
                    +{rejectedRevisions.length - 2} more rejected changes
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartRevisionAlert;