import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calculator,
  Eye,
  Save,
  Settings,
  AlertCircle
} from 'lucide-react';
import { QuoteBreakdownV2 } from '@/components/quotes-v2/QuoteBreakdownV2';
import { QuoteDetailsAnalysis } from '@/components/quotes-v2/QuoteDetailsAnalysis';
import { QuoteSendEmailSimple } from '@/components/admin/QuoteSendEmailSimple';
import { ShippingRouteDebug } from '@/components/admin/ShippingRouteDebug';
import QuoteReminderControls from '@/components/admin/QuoteReminderControls';
import { getOriginCurrency } from '@/utils/originCurrency';

interface QuoteItem {
  id: string;
  name: string;
  quantity: number;
  unit_price_origin: number;
  weight_kg?: number;
}

interface BreakdownSectionProps {
  // Quote data
  items: QuoteItem[];
  customerEmail: string;
  customerName: string;
  customerCurrency: string;
  originCountry: string;
  destinationCountry: string;
  
  // Calculation state
  calculating: boolean;
  calculationResult: any;
  onCalculate: () => void;
  
  // Save state
  loading: boolean;
  isEditMode: boolean;
  onSave: () => void;
  
  // Preview state
  showPreview: boolean;
  onTogglePreview: () => void;
  
  // Email state (edit mode)
  quoteId?: string;
  currentQuoteStatus?: string;
  emailSent?: boolean;
  showEmailSection?: boolean;
  onShowEmailSection?: (show: boolean) => void;
  onEmailSent?: () => void;
  
  // Reminder controls (edit mode)
  reminderCount?: number;
  lastReminderAt?: string | null;
  expiresAt?: string | null;
  shareToken?: string;
  onLoadQuote?: (id: string) => void;
  
  // Shipping error
  shippingError?: string | null;
  onNavigateToShippingRoutes?: () => void;
}

export const BreakdownSection: React.FC<BreakdownSectionProps> = ({
  items,
  customerEmail,
  customerName,
  customerCurrency,
  originCountry,
  destinationCountry,
  calculating,
  calculationResult,
  onCalculate,
  loading,
  isEditMode,
  onSave,
  showPreview,
  onTogglePreview,
  quoteId,
  currentQuoteStatus,
  emailSent,
  showEmailSection,
  onShowEmailSection,
  onEmailSent,
  reminderCount,
  lastReminderAt,
  expiresAt,
  shareToken,
  onLoadQuote,
  shippingError,
  onNavigateToShippingRoutes
}) => {
  const hasValidItems = items.some(item => item.unit_price_origin > 0);

  const generateQuoteData = () => ({
    id: quoteId || 'temp-' + Date.now(),
    quote_number: quoteId ? undefined : 'PREVIEW',
    status: isEditMode ? currentQuoteStatus : 'draft',
    customer_email: customerEmail || 'preview@example.com',
    customer_name: customerName,
    origin_country: originCountry,
    destination_country: destinationCountry,
    items: items.filter(item => item.unit_price_origin > 0),
    calculation_data: {
      ...calculationResult,
      // Ensure origin_currency is set based on origin_country
      origin_currency: calculationResult?.origin_currency || getOriginCurrency(originCountry)
    },
    // Use origin currency total instead of USD total
    total_origin_currency: calculationResult?.calculation_steps?.total_origin_currency || calculationResult?.calculation_steps?.total_usd || 0,
    // Keep legacy fields for backward compatibility but don't prioritize them
    total_usd: calculationResult?.calculation_steps?.total_usd,
    total_customer_currency: calculationResult?.calculation_steps?.total_customer_currency,
    customer_currency: customerCurrency,
    created_at: new Date().toISOString(),
    calculated_at: calculationResult?.calculation_timestamp
  });

  const getTotalWeight = () => {
    return items.reduce((sum, item) => sum + (item.weight_kg || 0.5) * item.quantity, 0);
  };

  const getTotalValue = () => {
    return items.reduce((sum, item) => sum + item.unit_price_origin * item.quantity, 0);
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <Button 
            onClick={onCalculate} 
            className="w-full"
            disabled={calculating || !hasValidItems}
          >
            <Calculator className="w-4 h-4 mr-2" />
            {calculating ? 'Calculating...' : 'Calculate Quote'}
          </Button>
          
          {calculationResult && (
            <>
              <Button 
                onClick={onTogglePreview} 
                variant="outline"
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? 'Hide' : 'Show'} Breakdown
              </Button>
              
              <Button 
                onClick={onSave} 
                variant="default"
                className="w-full"
                disabled={loading}
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : (isEditMode ? 'Update Quote' : 'Save Quote')}
              </Button>
              
              {/* Email sending for edit mode */}
              {isEditMode && calculationResult && currentQuoteStatus === 'calculated' && !emailSent && onShowEmailSection && (
                <Button 
                  onClick={() => onShowEmailSection(true)} 
                  variant="secondary"
                  className="w-full"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Send Quote Email
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Shipping Route Error */}
      {shippingError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-red-800 mb-1">
                  Shipping Route Missing
                </div>
                <div className="text-sm text-red-700 mb-3">
                  {shippingError}
                </div>
                {onNavigateToShippingRoutes && (
                  <Button 
                    onClick={onNavigateToShippingRoutes} 
                    variant="outline" 
                    size="sm"
                    className="text-red-700 border-red-300 hover:bg-red-100"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Configure Shipping Route
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Breakdown using proper component - First in order */}
      {calculationResult && showPreview && calculationResult.calculation_steps && (
        <QuoteBreakdownV2 quote={generateQuoteData()} />
      )}

      {/* Quote Details & Analysis - Second in order */}
      {calculationResult && calculationResult.calculation_steps && (
        <QuoteDetailsAnalysis quote={generateQuoteData()} />
      )}

      {/* Shipping Route Debug Component - Third in order */}
      {calculationResult && calculationResult.calculation_steps && (
        <ShippingRouteDebug
          routeCalculations={calculationResult.route_calculations}
          originCountry={originCountry}
          destinationCountry={destinationCountry}
          weight={getTotalWeight()}
          itemValueOrigin={getTotalValue()}
          fallbackUsed={!calculationResult.route_calculations}
        />
      )}

      {/* Email Sending Section */}
      {isEditMode && showEmailSection && quoteId && onEmailSent && (
        <Card>
          <CardHeader>
            <CardTitle>Send Quote Email</CardTitle>
          </CardHeader>
          <CardContent>
            <QuoteSendEmailSimple
              quoteId={quoteId}
              onEmailSent={onEmailSent}
              isV2={true}
            />
          </CardContent>
        </Card>
      )}

      {/* Reminder Controls - Only show in edit mode for saved quotes */}
      {isEditMode && quoteId && emailSent && onLoadQuote && (
        <QuoteReminderControls
          quoteId={quoteId}
          status={currentQuoteStatus || 'draft'}
          reminderCount={reminderCount || 0}
          lastReminderAt={lastReminderAt}
          customerEmail={customerEmail}
          expiresAt={expiresAt}
          shareToken={shareToken}
          onUpdate={() => onLoadQuote(quoteId)}
        />
      )}
    </div>
  );
};