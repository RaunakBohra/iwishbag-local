import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Star, Heart, ThumbsUp, ThumbsDown, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { TicketWithDetails, CreateSurveyData } from '@/types/ticket';
import { cn } from '@/lib/utils';

const surveySchema = z.object({
  rating: z.number().min(1, 'Please rate your experience').max(5),
  feedback: z.string().max(500, 'Feedback must be less than 500 characters').optional(),
  experience_rating: z.number().min(1).max(5),
  response_time_rating: z.number().min(1).max(5),
  resolution_rating: z.number().min(1).max(5),
  would_recommend: z.boolean(),
  additional_comments: z.string().max(1000, 'Comments must be less than 1000 characters').optional(),
});

type SurveyForm = z.infer<typeof surveySchema>;

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  description?: string;
}

const StarRating: React.FC<StarRatingProps> = ({ value, onChange, label, description }) => {
  const [hoveredValue, setHoveredValue] = useState<number>(0);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {description && (
        <p className="text-xs text-gray-600">{description}</p>
      )}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={cn(
              "p-1 transition-colors",
              (hoveredValue >= star || value >= star)
                ? "text-yellow-400"
                : "text-gray-300"
            )}
            onMouseEnter={() => setHoveredValue(star)}
            onMouseLeave={() => setHoveredValue(0)}
            onClick={() => onChange(star)}
          >
            <Star className="h-6 w-6 fill-current" />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {value > 0 ? `${value}/5` : 'Click to rate'}
        </span>
      </div>
    </div>
  );
};

interface RecommendationToggleProps {
  value: boolean | null;
  onChange: (value: boolean) => void;
}

const RecommendationToggle: React.FC<RecommendationToggleProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Would you recommend iwishBag to others?</Label>
      <div className="flex items-center gap-4">
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
            value === true
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
          )}
          onClick={() => onChange(true)}
        >
          <ThumbsUp className="h-4 w-4" />
          Yes, I would recommend
        </button>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
            value === false
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
          )}
          onClick={() => onChange(false)}
        >
          <ThumbsDown className="h-4 w-4" />
          No, I would not
        </button>
      </div>
    </div>
  );
};

interface CustomerSatisfactionSurveyProps {
  ticket: TicketWithDetails;
  onSubmit: (surveyData: CreateSurveyData) => Promise<void>;
  onSkip?: () => void;
  isLoading?: boolean;
}

export const CustomerSatisfactionSurvey: React.FC<CustomerSatisfactionSurveyProps> = ({
  ticket,
  onSubmit,
  onSkip,
  isLoading = false,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SurveyForm>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      rating: 0,
      feedback: '',
      experience_rating: 0,
      response_time_rating: 0,
      resolution_rating: 0,
      would_recommend: true,
      additional_comments: '',
    },
  });

  const handleSubmit = async (values: SurveyForm) => {
    if (values.rating === 0 || values.experience_rating === 0 || 
        values.response_time_rating === 0 || values.resolution_rating === 0) {
      toast({
        title: 'Incomplete Survey',
        description: 'Please provide ratings for all sections.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        ticket_id: ticket.id,
        ...values,
      });

      toast({
        title: 'Thank You!',
        description: 'Your feedback has been submitted successfully.',
      });
    } catch (error) {
      console.error('Error submitting survey:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <Heart className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <CardTitle className="text-xl">How was your support experience?</CardTitle>
        <p className="text-gray-600 mt-2">
          Your feedback helps us improve our service. This survey takes less than 2 minutes.
        </p>
      </CardHeader>

      <CardContent>
        <div className="space-y-2 mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900">Ticket Summary</h3>
          <p className="text-sm text-gray-600">
            <strong>Subject:</strong> {ticket.subject}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Ticket ID:</strong> #{ticket.id.slice(0, 8)}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Status:</strong> {ticket.status}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Overall Rating */}
            <div>
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <StarRating
                      value={field.value}
                      onChange={field.onChange}
                      label="Overall Experience Rating"
                      description="How satisfied are you with our support overall?"
                    />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Detailed Ratings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="response_time_rating"
                render={({ field }) => (
                  <FormItem>
                    <StarRating
                      value={field.value}
                      onChange={field.onChange}
                      label="Response Time"
                      description="How quickly we responded"
                    />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="resolution_rating"
                render={({ field }) => (
                  <FormItem>
                    <StarRating
                      value={field.value}
                      onChange={field.onChange}
                      label="Resolution Quality"
                      description="How well we solved your issue"
                    />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="experience_rating"
                render={({ field }) => (
                  <FormItem>
                    <StarRating
                      value={field.value}
                      onChange={field.onChange}
                      label="Support Experience"
                      description="Quality of communication"
                    />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Recommendation */}
            <FormField
              control={form.control}
              name="would_recommend"
              render={({ field }) => (
                <FormItem>
                  <RecommendationToggle
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormItem>
              )}
            />

            {/* Feedback */}
            <FormField
              control={form.control}
              name="feedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What did we do well? (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us what you liked about our support..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Additional Comments */}
            <FormField
              control={form.control}
              name="additional_comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How can we improve? (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share any suggestions for improvement..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex items-center justify-between pt-6">
              {onSkip && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onSkip}
                  disabled={isSubmitting}
                >
                  Skip Survey
                </Button>
              )}
              
              <div className="flex gap-3 ml-auto">
                <Button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CustomerSatisfactionSurvey;