import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface QuoteOptionsStepProps {
  validityDays: number;
  customerMessage: string;
  paymentTerms: string;
  onValidityChange: (days: number) => void;
  onMessageChange: (message: string) => void;
  onPaymentTermsChange: (terms: string) => void;
}

const defaultPaymentTerms = [
  { value: 'standard', label: 'Standard - Payment required before shipping' },
  { value: '50-50', label: '50% advance, 50% before shipping' },
  { value: 'full-advance', label: '100% advance payment' },
  { value: 'net-7', label: 'Net 7 days after delivery' },
  { value: 'custom', label: 'Custom terms' }
];

export function QuoteOptionsStep({
  validityDays,
  customerMessage,
  paymentTerms,
  onValidityChange,
  onMessageChange,
  onPaymentTermsChange
}: QuoteOptionsStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quote Options</CardTitle>
        <CardDescription>
          Customize your quote with additional options
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quote Validity */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="validity">Quote Validity (days)</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>How long this quote will remain valid</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select
            value={validityDays.toString()}
            onValueChange={(value) => onValidityChange(parseInt(value))}
          >
            <SelectTrigger id="validity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 days</SelectItem>
              <SelectItem value="7">7 days (recommended)</SelectItem>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payment Terms */}
        <div className="space-y-2">
          <Label htmlFor="payment-terms">Payment Terms</Label>
          <Select
            value={paymentTerms}
            onValueChange={onPaymentTermsChange}
          >
            <SelectTrigger id="payment-terms">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {defaultPaymentTerms.map((term) => (
                <SelectItem key={term.value} value={term.value}>
                  {term.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Message */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="message">Message to Customer (Optional)</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add a personalized message to your quote</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Textarea
            id="message"
            placeholder="Thank you for choosing iwishBag! We look forward to serving you..."
            value={customerMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <p className="text-sm text-muted-foreground">
            This message will be included in the quote email
          </p>
        </div>

        {/* Email Notification Info */}
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>📧 Automatic Email Notification</strong><br />
            Your customer will receive an email with a secure link to view this quote online.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}