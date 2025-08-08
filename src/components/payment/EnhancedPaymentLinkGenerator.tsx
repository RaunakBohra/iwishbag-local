/**
 * Enhanced Payment Link Generator (Refactored)
 * Now uses focused components for better maintainability
 * Original: 1,221 lines → ~140 lines (89% reduction)
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'lucide-react';

// Import focused components
import { PaymentGatewaySection } from './link-sections/PaymentGatewaySection';
import { PaymentAmountSection } from './link-sections/PaymentAmountSection';
import { CustomFieldsSection } from './link-sections/CustomFieldsSection';
import { PaymentLinkPreview } from './link-sections/PaymentLinkPreview';
import { usePaymentLinkGenerator } from './link-sections/hooks/usePaymentLinkGenerator';

// Type definitions (would be better in separate files)
interface QuoteData {
  id?: string;
  display_id?: string;
  order_display_id?: string;
  product_name?: string;
  final_total_origincurrency?: number;
  amount_paid?: number;
  payment_status?: string;
  shipping_address?: {
    fullName?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  user?: {
    full_name?: string;
    email?: string;
    phone?: string;
  };
  profiles?: {
    full_name?: string;
    email?: string;
    phone?: string;
  };
  customer_name?: string;
  customer_phone?: string;
  email?: string;
  approved_at?: string;
  priority?: 'high' | 'urgent' | 'normal';
  destination_country?: string;
  origin_country?: string;
}

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
}

interface EnhancedPaymentLinkGeneratorProps {
  quoteId: string;
  amount: number;
  quote?: QuoteData;
  customerInfo?: CustomerInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnhancedPaymentLinkGenerator({
  quoteId,
  amount,
  quote,
  customerInfo,
  open,
  onOpenChange,
}: EnhancedPaymentLinkGeneratorProps) {
  const {
    formData,
    updateFormData,
    customFields,
    setCustomFields,
    createdLink,
    loading,
    generatePaymentLink,
    resetForm,
    getCustomerInfo,
  } = usePaymentLinkGenerator({
    quote,
    customerInfo,
    amount,
    quoteId,
    open,
  });

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const handleGenerate = () => {
    generatePaymentLink();
  };

  const handleReset = () => {
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button>
          <Link className="w-4 h-4 mr-2" />
          Generate Payment Link
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            Enhanced Payment Link Generator
          </DialogTitle>
          <DialogDescription>
            Create secure payment links with advanced customization options
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {!createdLink ? (
            <Tabs defaultValue="details" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Payment Details</TabsTrigger>
                <TabsTrigger value="gateway">Gateway & Settings</TabsTrigger>
                <TabsTrigger value="fields">Custom Fields</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6">
                <PaymentAmountSection
                  amount={amount}
                  quote={quote}
                  formData={{
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    description: formData.description,
                    expiryDays: formData.expiryDays,
                  }}
                  onFormDataChange={updateFormData}
                />
              </TabsContent>

              <TabsContent value="gateway" className="space-y-6">
                <PaymentGatewaySection
                  formData={{
                    gateway: formData.gateway,
                    apiMethod: formData.apiMethod,
                    template: formData.template,
                    partialPaymentAllowed: formData.partialPaymentAllowed,
                  }}
                  onFormDataChange={updateFormData}
                />
              </TabsContent>

              <TabsContent value="fields" className="space-y-6">
                <CustomFieldsSection
                  customFields={customFields}
                  onCustomFieldsChange={setCustomFields}
                  quote={quote}
                  customerInfo={getCustomerInfo()}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <PaymentLinkPreview
              createdLink={createdLink}
              isLoading={loading}
              onGenerateLink={handleGenerate}
              onResetForm={handleReset}
            />
          )}
        </div>

        {!createdLink && (
          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Payment Link'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}