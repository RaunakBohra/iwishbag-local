import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Clock, User, MessageCircle, CheckCircle, X, Edit, DollarSign, Package, Truck, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ReviewRequestCardProps {
  quote: any;
  onReviewCompleted?: () => void;
}

const ReviewRequestCard: React.FC<ReviewRequestCardProps> = ({
  quote,
  onReviewCompleted
}) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('sent');
  const [adminNotes, setAdminNotes] = useState('');

  if (!quote.review_request_data) {
    return null;
  }

  const reviewData = quote.review_request_data;
  const reviewRequestedAt = new Date(quote.review_requested_at);
  const hoursAgo = Math.round((Date.now() - reviewRequestedAt.getTime()) / (1000 * 60 * 60));
  
  const urgencyColors = {
    high: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-orange-100 text-orange-800 border-orange-200',
    low: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  };

  const categoryIcons = {
    pricing: DollarSign,
    items: Package,
    shipping: Truck,
    timeline: Calendar,
    other: MessageCircle
  };

  const CategoryIcon = categoryIcons[reviewData.category] || MessageCircle;

  const handleCompleteReview = async () => {
    try {
      setIsCompleting(true);

      const { data, error } = await supabase.rpc('complete_quote_review', {
        p_quote_id: quote.id,
        p_admin_notes: adminNotes.trim() || null,
        p_new_status: newStatus
      });

      if (error) throw error;

      if (data && !data.success) {
        throw new Error(data.message || 'Failed to complete review');
      }

      toast({
        title: "Review Completed",
        description: `Quote has been updated to ${newStatus} status.`,
      });

      setCompletionModalOpen(false);
      setAdminNotes('');
      
      if (onReviewCompleted) {
        onReviewCompleted();
      }

    } catch (error) {
      console.error('Error completing review:', error);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <>
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-xl text-amber-900">Customer Review Request</CardTitle>
                <Badge className={`${urgencyColors[reviewData.urgency]} font-medium`}>
                  {reviewData.urgency?.toUpperCase()} PRIORITY
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-amber-700">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{hoursAgo}h ago</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{quote.customer_name || quote.customer_email}</span>
                </div>
                <div className="flex items-center gap-1">
                  <CategoryIcon className="w-4 h-4" />
                  <span>{reviewData.category?.replace('_', ' ')?.toUpperCase()}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCompletionModalOpen(true)}
                className="bg-white hover:bg-gray-50"
              >
                <Edit className="w-4 h-4 mr-2" />
                Complete Review
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Customer Description */}
          <div>
            <h4 className="font-medium text-amber-900 mb-2">What the customer wants changed:</h4>
            <div className="p-3 bg-white rounded-lg border">
              <p className="text-gray-700 whitespace-pre-wrap">{reviewData.description}</p>
            </div>
          </div>

          {/* Expected Changes */}
          {reviewData.expected_changes && (
            <div>
              <h4 className="font-medium text-amber-900 mb-2">Expected outcome:</h4>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-gray-700 whitespace-pre-wrap">{reviewData.expected_changes}</p>
              </div>
            </div>
          )}

          {/* Budget Constraint */}
          {reviewData.budget_constraint && (
            <div>
              <h4 className="font-medium text-amber-900 mb-2">Target budget:</h4>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-gray-700 font-medium">
                  ${parseFloat(reviewData.budget_constraint).toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* Specific Items */}
          {reviewData.specific_items && reviewData.specific_items.length > 0 && (
            <div>
              <h4 className="font-medium text-amber-900 mb-2">Items mentioned:</h4>
              <div className="flex flex-wrap gap-2">
                {reviewData.specific_items.map((itemId: string, index: number) => {
                  const item = quote.items?.find((i: any) => i.id === itemId) || 
                               quote.items?.[parseInt(itemId)] ||
                               { name: `Item ${index + 1}` };
                  return (
                    <Badge key={index} variant="outline" className="bg-white">
                      {item.name || `Item ${index + 1}`}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Required Banner */}
          <div className="p-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <p className="font-medium">Action Required</p>
                <p className="text-sm opacity-90">
                  Review the customer's feedback and update the quote accordingly. 
                  Click "Complete Review" when you've made the necessary changes.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Complete Review Modal */}
      <Dialog open={completionModalOpen} onOpenChange={setCompletionModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complete Quote Review</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Review Summary:</strong> Customer requested changes to {reviewData.category?.replace('_', ' ')} 
                with {reviewData.urgency} priority {hoursAgo} hours ago.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">What's the next step?</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose the updated quote status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sent">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Send Updated Quote - Changes made, ready for customer review</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="rejected">
                    <div className="flex items-center gap-2">
                      <X className="w-4 h-4 text-red-600" />
                      <span>Reject Quote - Cannot fulfill customer's requirements</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="expired">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-600" />
                      <span>Mark as Expired - Quote is no longer valid</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Admin notes for customer (optional)
              </label>
              <Textarea
                placeholder="Explain what changes were made or why the request couldn't be fulfilled..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                These notes will be added to the quote and may be visible to the customer.
              </p>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Completing this review will update the quote status and notify the customer. 
                Make sure you've made all necessary changes to the quote before proceeding.
              </p>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setCompletionModalOpen(false)}
                disabled={isCompleting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCompleteReview}
                disabled={isCompleting || !newStatus}
                className="flex-1"
              >
                {isCompleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete Review
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReviewRequestCard;