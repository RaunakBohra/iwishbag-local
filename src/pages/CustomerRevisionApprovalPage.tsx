import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle,
  XCircle,
  MessageSquare,
  Package,
  DollarSign,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  Clock,
  Edit,
  Send,
  ArrowLeft,
  RefreshCw,
  FileText,
  ShoppingBag,
} from 'lucide-react';

interface RevisionRequest {
  id: string;
  quote_id: string;
  revision_type: 'pricing' | 'items' | 'shipping' | 'general';
  status: 'pending' | 'approved' | 'rejected' | 'needs_changes';
  customer_message?: string;
  admin_message?: string;
  requested_changes: {
    original_value: any;
    requested_value: any;
    reason: string;
  }[];
  created_at: string;
  updated_at: string;
  expires_at?: string;
  quote_data?: {
    id: string;
    display_id: string;
    total_amount: number;
    currency: string;
    items: any[];
    customer_info: {
      name: string;
      email: string;
      phone?: string;
      country: string;
    };
  };
}

const CustomerRevisionApprovalPage = () => {
  const { revisionId } = useParams<{ revisionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Modal states
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [changesRequestDialogOpen, setChangesRequestDialogOpen] = useState(false);

  // Form states
  const [customerMessage, setCustomerMessage] = useState('');
  const [requestedChanges, setRequestedChanges] = useState('');

  // Fetch revision request data
  const { data: revision, isLoading, error, refetch } = useQuery({
    queryKey: ['revision-request', revisionId],
    queryFn: async () => {
      if (!revisionId) throw new Error('No revision ID provided');
      
      // Mock data - in production this would fetch from the database
      const mockRevision: RevisionRequest = {
        id: revisionId,
        quote_id: 'quote-123',
        revision_type: 'pricing',
        status: 'pending',
        customer_message: 'I would like to request a discount on the shipping costs as I am a returning customer.',
        admin_message: 'We have reviewed your request and can offer a 15% discount on shipping. The new total would be $285.50.',
        requested_changes: [
          {
            original_value: { shipping_cost: 85.00, total: 335.50 },
            requested_value: { shipping_cost: 72.25, total: 285.50 },
            reason: 'Returning customer discount applied'
          }
        ],
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2024-01-10T14:30:00Z',
        expires_at: '2024-01-17T23:59:59Z',
        quote_data: {
          id: 'quote-123',
          display_id: 'QT-2024-001',
          total_amount: 285.50,
          currency: 'USD',
          items: [
            {
              id: '1',
              name: 'Apple iPhone 15 Pro Max',
              quantity: 1,
              price_origin: 200.00,
              weight_kg: 0.3,
              image: 'https://via.placeholder.com/64x64?text=iPhone'
            },
            {
              id: '2',
              name: 'AirPods Pro (2nd Gen)',
              quantity: 1,
              price_origin: 50.00,
              weight_kg: 0.1,
              image: 'https://via.placeholder.com/64x64?text=AirPods'
            }
          ],
          customer_info: {
            name: 'John Doe',
            email: 'john.doe@example.com',
            phone: '+1 555-0123',
            country: 'IN'
          }
        }
      };

      return mockRevision;
    },
    staleTime: 30000,
  });

  // Approval mutation
  const approveRevisionMutation = useMutation({
    mutationFn: async ({ message }: { message: string }) => {
      // Mock API call - in production this would update the database
      console.log('Approving revision:', revisionId, { message });
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: 'Revision approved',
        description: 'Your quote revision has been approved and will proceed to the next step.',
      });
      queryClient.invalidateQueries({ queryKey: ['revision-request'] });
      navigate('/dashboard/quotes');
    },
    onError: (error: any) => {
      toast({
        title: 'Approval failed',
        description: error.message || 'Failed to approve revision',
        variant: 'destructive',
      });
    },
  });

  // Rejection mutation
  const rejectRevisionMutation = useMutation({
    mutationFn: async ({ message }: { message: string }) => {
      // Mock API call
      console.log('Rejecting revision:', revisionId, { message });
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: 'Revision rejected',
        description: 'The revision has been rejected. The original quote will remain unchanged.',
      });
      queryClient.invalidateQueries({ queryKey: ['revision-request'] });
      navigate('/dashboard/quotes');
    },
    onError: (error: any) => {
      toast({
        title: 'Rejection failed',
        description: error.message || 'Failed to reject revision',
        variant: 'destructive',
      });
    },
  });

  // Request changes mutation
  const requestChangesMutation = useMutation({
    mutationFn: async ({ message, changes }: { message: string; changes: string }) => {
      // Mock API call
      console.log('Requesting changes to revision:', revisionId, { message, changes });
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: 'Change request sent',
        description: 'Your change request has been sent to our team for review.',
      });
      queryClient.invalidateQueries({ queryKey: ['revision-request'] });
      setChangesRequestDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Request failed',
        description: error.message || 'Failed to send change request',
        variant: 'destructive',
      });
    },
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'pending':
        return 'secondary';
      case 'needs_changes':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const isExpired = revision?.expires_at && new Date(revision.expires_at) < new Date();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading revision details...</p>
        </div>
      </div>
    );
  }

  if (error || !revision) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Revision Not Found</h2>
          <p className="text-gray-600 mb-4">
            The revision request you're looking for could not be found or may have expired.
          </p>
          <Button onClick={() => navigate('/dashboard/quotes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quotes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard/quotes')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Quotes</span>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Revision Approval</h1>
                <p className="text-gray-600">
                  Review and respond to your quote revision - {revision.quote_data?.display_id}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span>Revision Status</span>
                  </div>
                  <Badge variant={getStatusBadgeVariant(revision.status)} className="capitalize">
                    {revision.status.replace('_', ' ')}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Expiration Warning */}
                  {isExpired && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-800">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium">Revision Expired</span>
                      </div>
                      <p className="text-sm text-red-600 mt-1">
                        This revision request expired on {new Date(revision.expires_at!).toLocaleDateString()}.
                        Please contact our support team if you need assistance.
                      </p>
                    </div>
                  )}

                  {revision.expires_at && !isExpired && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-2 text-amber-800">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">Response Required</span>
                      </div>
                      <p className="text-sm text-amber-600 mt-1">
                        Please respond by {new Date(revision.expires_at).toLocaleDateString()} at{' '}
                        {new Date(revision.expires_at).toLocaleTimeString()}.
                      </p>
                    </div>
                  )}

                  {/* Revision Type */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Revision Type:</span>
                      <Badge variant="outline" className="ml-2 capitalize">
                        {revision.revision_type}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <span className="ml-2 font-medium">
                        {new Date(revision.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Message */}
            {revision.customer_message && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="w-5 h-5 text-gray-600" />
                    <span>Your Original Request</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">{revision.customer_message}</p>
                </CardContent>
              </Card>
            )}

            {/* Admin Response */}
            {revision.admin_message && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-blue-800">
                    <MessageSquare className="w-5 h-5" />
                    <span>Our Response</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-blue-700 leading-relaxed">{revision.admin_message}</p>
                </CardContent>
              </Card>
            )}

            {/* Changes Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Edit className="w-5 h-5 text-green-600" />
                  <span>Proposed Changes</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revision.requested_changes.map((change, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">{change.reason}</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Original:</span>
                          <div className="mt-1">
                            {Object.entries(change.original_value).map(([key, value]) => (
                              <p key={key} className="text-red-600 line-through">
                                {key.replace('_', ' ')}: {formatCurrency(value as number)}
                              </p>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">New:</span>
                          <div className="mt-1">
                            {Object.entries(change.requested_value).map(([key, value]) => (
                              <p key={key} className="text-green-600 font-medium">
                                {key.replace('_', ' ')}: {formatCurrency(value as number)}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {revision.status === 'pending' && !isExpired && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      onClick={() => setApprovalDialogOpen(true)}
                      className="bg-green-600 hover:bg-green-700 flex-1"
                      disabled={approveRevisionMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setChangesRequestDialogOpen(true)}
                      className="flex-1"
                      disabled={requestChangesMutation.isPending}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Request Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setRejectionDialogOpen(true)}
                      className="border-red-300 text-red-600 hover:bg-red-50 flex-1"
                      disabled={rejectRevisionMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quote Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ShoppingBag className="w-5 h-5 text-gray-600" />
                  <span>Quote Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Quote ID:</span>
                  <span className="font-mono">{revision.quote_data?.display_id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Items:</span>
                  <span>{revision.quote_data?.items.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>New Total:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(revision.quote_data?.total_amount || 0, revision.quote_data?.currency)}
                  </span>
                </div>
                <Separator />
                <div className="text-xs text-gray-500">
                  Updated: {new Date(revision.updated_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-gray-600" />
                  <span>Customer Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium">{revision.quote_data?.customer_info.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium flex items-center">
                    <Mail className="w-4 h-4 mr-1 text-gray-500" />
                    {revision.quote_data?.customer_info.email}
                  </p>
                </div>
                {revision.quote_data?.customer_info.phone && (
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium flex items-center">
                      <Phone className="w-4 h-4 mr-1 text-gray-500" />
                      {revision.quote_data?.customer_info.phone}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Country</p>
                  <Badge variant="outline">{revision.quote_data?.customer_info.country}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Help Section */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Need Help?</h4>
                <p className="text-sm text-blue-700 mb-3">
                  If you have questions about this revision, our support team is here to help.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Approve Revision
            </DialogTitle>
            <DialogDescription>
              You are about to approve the proposed changes to your quote. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="approval-message" className="text-sm font-medium">
                Optional Message
              </label>
              <Textarea
                id="approval-message"
                placeholder="Add any comments or notes about your approval..."
                value={customerMessage}
                onChange={(e) => setCustomerMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                approveRevisionMutation.mutate({ message: customerMessage });
                setApprovalDialogOpen(false);
                setCustomerMessage('');
              }}
              className="bg-green-600 hover:bg-green-700"
              disabled={approveRevisionMutation.isPending}
            >
              {approveRevisionMutation.isPending ? 'Approving...' : 'Approve Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Reject Revision
            </DialogTitle>
            <DialogDescription>
              You are about to reject the proposed changes. Your original quote will remain unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="rejection-message" className="text-sm font-medium">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="rejection-message"
                placeholder="Please explain why you are rejecting these changes..."
                value={customerMessage}
                onChange={(e) => setCustomerMessage(e.target.value)}
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (customerMessage.trim()) {
                  rejectRevisionMutation.mutate({ message: customerMessage });
                  setRejectionDialogOpen(false);
                  setCustomerMessage('');
                }
              }}
              disabled={!customerMessage.trim() || rejectRevisionMutation.isPending}
            >
              {rejectRevisionMutation.isPending ? 'Rejecting...' : 'Reject Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Changes Dialog */}
      <Dialog open={changesRequestDialogOpen} onOpenChange={setChangesRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              Request Changes
            </DialogTitle>
            <DialogDescription>
              Request modifications to the proposed changes. Our team will review and respond.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="change-message" className="text-sm font-medium">
                Your Message <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="change-message"
                placeholder="Describe what changes you would like to see..."
                value={customerMessage}
                onChange={(e) => setCustomerMessage(e.target.value)}
                rows={3}
                required
              />
            </div>
            <div>
              <label htmlFor="specific-changes" className="text-sm font-medium">
                Specific Changes Requested
              </label>
              <Textarea
                id="specific-changes"
                placeholder="List specific changes you'd like (e.g., different pricing, shipping options, etc.)..."
                value={requestedChanges}
                onChange={(e) => setRequestedChanges(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangesRequestDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (customerMessage.trim()) {
                  requestChangesMutation.mutate({ 
                    message: customerMessage, 
                    changes: requestedChanges 
                  });
                  setCustomerMessage('');
                  setRequestedChanges('');
                }
              }}
              disabled={!customerMessage.trim() || requestChangesMutation.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              {requestChangesMutation.isPending ? 'Sending...' : 'Send Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerRevisionApprovalPage;