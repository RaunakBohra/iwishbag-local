/**
 * Customer Satisfaction Survey Component
 * Displays and collects customer feedback for resolved tickets
 */

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, ThumbsUp, ThumbsDown, MessageSquare, Send, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { slaService, type CreateSatisfactionSurveyData, type CustomerSatisfactionSurvey } from '@/services/SLAService';

interface CustomerSatisfactionSurveyProps {
  ticketId: string;
  ticketSubject: string;
  existingSurvey?: CustomerSatisfactionSurvey;
  onSurveySubmitted?: (survey: CustomerSatisfactionSurvey) => void;
  className?: string;
}

interface RatingInputProps {
  label: string;
  description: string;
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}

const RatingInput: React.FC<RatingInputProps> = ({ label, description, value, onChange, disabled }) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <label className="text-sm font-medium text-gray-700">{label}</label>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              disabled={disabled}
              onClick={() => onChange(rating)}
              className={`p-1 rounded transition-colors ${
                disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-100'
              }`}
            >
              <Star 
                className={`h-5 w-5 ${
                  rating <= value 
                    ? 'fill-yellow-400 text-yellow-400' 
                    : 'text-gray-300 hover:text-yellow-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export const CustomerSatisfactionSurvey: React.FC<CustomerSatisfactionSurveyProps> = ({
  ticketId,
  ticketSubject,
  existingSurvey,
  onSurveySubmitted,
  className
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreateSatisfactionSurveyData>({
    ticketId,
    rating: existingSurvey?.rating || 0,
    responseTimeRating: existingSurvey?.responseTimeRating || 0,
    experienceRating: existingSurvey?.experienceRating || 0,
    resolutionRating: existingSurvey?.resolutionRating || 0,
    wouldRecommend: existingSurvey?.wouldRecommend || false,
    feedback: existingSurvey?.feedback || '',
    additionalComments: existingSurvey?.additionalComments || '',
  });

  const submitSurveyMutation = useMutation({
    mutationFn: (data: CreateSatisfactionSurveyData) => slaService.createSatisfactionSurvey(data),
    onSuccess: (result) => {
      if (result) {
        queryClient.invalidateQueries({ queryKey: ['sla-dashboard-metrics'] });
        queryClient.invalidateQueries({ queryKey: ['ticket-satisfaction', ticketId] });
        onSurveySubmitted?.(result);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required ratings
    if (
      formData.rating === 0 ||
      formData.responseTimeRating === 0 ||
      formData.experienceRating === 0 ||
      formData.resolutionRating === 0
    ) {
      alert('Please provide ratings for all categories');
      return;
    }

    submitSurveyMutation.mutate(formData);
  };

  const isReadOnly = !!existingSurvey;
  const isSubmitting = submitSurveyMutation.isPending;

  const averageRating = existingSurvey
    ? (existingSurvey.rating + existingSurvey.responseTimeRating + 
       existingSurvey.experienceRating + existingSurvey.resolutionRating) / 4
    : 0;

  if (existingSurvey) {
    // Display existing survey results
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Customer Feedback Received
          </CardTitle>
          <CardDescription>
            Survey completed for: {ticketSubject}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Score */}
          <div className="text-center py-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-gray-800 mb-1">
              {averageRating.toFixed(1)}/5.0
            </div>
            <div className="flex justify-center items-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.round(averageRating) 
                      ? 'fill-yellow-400 text-yellow-400' 
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <Badge variant="outline" className={slaService.getSatisfactionRatingColor(averageRating)}>
              {averageRating >= 4 ? 'Excellent' : 
               averageRating >= 3.5 ? 'Very Good' :
               averageRating >= 3 ? 'Good' : 
               averageRating >= 2 ? 'Fair' : 'Poor'}
            </Badge>
          </div>

          {/* Detailed Ratings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Overall Rating</span>
                <div className="flex items-center gap-1">
                  {slaService.formatRatingStars(existingSurvey.rating)}
                  <span className="text-sm text-gray-500 ml-1">({existingSurvey.rating})</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Response Time</span>
                <div className="flex items-center gap-1">
                  {slaService.formatRatingStars(existingSurvey.responseTimeRating)}
                  <span className="text-sm text-gray-500 ml-1">({existingSurvey.responseTimeRating})</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Experience Rating</span>
                <div className="flex items-center gap-1">
                  {slaService.formatRatingStars(existingSurvey.experienceRating)}
                  <span className="text-sm text-gray-500 ml-1">({existingSurvey.experienceRating})</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Resolution Quality</span>
                <div className="flex items-center gap-1">
                  {slaService.formatRatingStars(existingSurvey.resolutionRating)}
                  <span className="text-sm text-gray-500 ml-1">({existingSurvey.resolutionRating})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Would recommend our service?</span>
            <div className="flex items-center gap-2">
              {existingSurvey.wouldRecommend ? (
                <>
                  <ThumbsUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600 font-medium">Yes</span>
                </>
              ) : (
                <>
                  <ThumbsDown className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600 font-medium">No</span>
                </>
              )}
            </div>
          </div>

          {/* Feedback Text */}
          {existingSurvey.feedback && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Customer Feedback:</h4>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-700">{existingSurvey.feedback}</p>
              </div>
            </div>
          )}

          {/* Additional Comments */}
          {existingSurvey.additionalComments && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Additional Comments:</h4>
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-gray-700">{existingSurvey.additionalComments}</p>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 text-center">
            Survey completed on {new Date(existingSurvey.createdAt).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render survey form for new submissions
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Rate Your Support Experience
        </CardTitle>
        <CardDescription>
          Help us improve by rating your support experience for: {ticketSubject}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating Categories */}
          <div className="space-y-4">
            <RatingInput
              label="Overall Rating"
              description="How would you rate your overall support experience?"
              value={formData.rating}
              onChange={(rating) => setFormData({ ...formData, rating })}
              disabled={isSubmitting}
            />

            <Separator />

            <RatingInput
              label="Response Time"
              description="How satisfied are you with how quickly we responded?"
              value={formData.responseTimeRating}
              onChange={(rating) => setFormData({ ...formData, responseTimeRating: rating })}
              disabled={isSubmitting}
            />

            <Separator />

            <RatingInput
              label="Experience Quality"
              description="How was your overall experience with our service?"
              value={formData.experienceRating}
              onChange={(rating) => setFormData({ ...formData, experienceRating: rating })}
              disabled={isSubmitting}
            />

            <Separator />

            <RatingInput
              label="Resolution Quality"
              description="How well did we resolve your issue?"
              value={formData.resolutionRating}
              onChange={(rating) => setFormData({ ...formData, resolutionRating: rating })}
              disabled={isSubmitting}
            />
          </div>

          {/* Recommendation */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Would you recommend our service to others?
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setFormData({ ...formData, wouldRecommend: true })}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  formData.wouldRecommend === true
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <ThumbsUp className="h-4 w-4" />
                Yes
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setFormData({ ...formData, wouldRecommend: false })}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  formData.wouldRecommend === false
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <ThumbsDown className="h-4 w-4" />
                No
              </button>
            </div>
          </div>

          {/* Additional Feedback */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Additional Feedback (Optional)
            </label>
            <Textarea
              placeholder="Tell us more about your experience..."
              value={formData.feedback}
              onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          {/* Additional Comments */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Additional Comments (Optional)
            </label>
            <Textarea
              placeholder="Share any additional thoughts or suggestions..."
              value={formData.additionalComments}
              onChange={(e) => setFormData({ ...formData, additionalComments: e.target.value })}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || 
              formData.rating === 0 || 
              formData.responseTimeRating === 0 || 
              formData.experienceRating === 0 || 
              formData.resolutionRating === 0
            }
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Send className="h-4 w-4 mr-2 animate-spin" />
                Submitting Survey...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Survey
              </>
            )}
          </Button>
        </form>

        {submitSurveyMutation.isError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">
              Failed to submit survey. Please try again or contact support.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};