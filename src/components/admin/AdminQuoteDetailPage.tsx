import { useParams, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send } from "lucide-react";
import { QuoteDetailForm } from "@/components/admin/QuoteDetailForm";
import { QuoteMessaging } from "@/components/messaging/QuoteMessaging";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAdminQuoteDetail } from "@/hooks/useAdminQuoteDetail";
import { QuoteCalculatedCosts } from "@/components/admin/QuoteCalculatedCosts";
import { QuoteCurrencySummary } from "./QuoteCurrencySummary";
import { Form } from "@/components/ui/form";
import { EditableAdminQuoteItemCard } from "./EditableAdminQuoteItemCard";
import { OrderActions } from "./OrderActions";
import { ShippingInfoForm } from "./ShippingInfoForm";
import { OrderTimeline } from "@/components/dashboard/OrderTimeline";

const AdminQuoteDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const {
    quote,
    quoteLoading,
    error,
    countries,
    shippingCountries,
    customsCategories,
    allCountries,
    sendQuoteEmail,
    isSendingEmail,
    isUpdating,
    form,
    fields,
    onSubmit,
  } = useAdminQuoteDetail(id);

  const isOrder = quote && ['cod_pending', 'bank_transfer_pending', 'paid', 'ordered', 'shipped', 'completed', 'cancelled'].includes(quote.status);
  const canRecalculate = quote && !['shipped', 'completed', 'cancelled'].includes(quote.status);

  if (quoteLoading) return (
    <div className="container py-8 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-12 w-full" />
      <div className="grid md:grid-cols-2 gap-8">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );

  if (error || !quote) return (
      <div className="container py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Quote Not Found</h1>
        <p className="text-muted-foreground">{error?.message || "The quote could not be found."}</p>
        <Button variant="destructive" onClick={() => navigate('/admin/quotes')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quotes
        </Button>
      </div>
  );
  
  return (
    <Form {...form}>
      <div className="container py-8 space-y-6">
          <div>
              <Button variant="destructive" size="sm" onClick={() => navigate(isOrder ? '/admin/orders' : '/admin/quotes')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {isOrder ? 'Back to All Orders' : 'Back to All Quotes'}
              </Button>
          </div>
        <Card>
          <CardHeader>
              <div className="flex justify-between items-center">
                  <div>
                      <CardTitle>{isOrder ? 'Order Details' : 'Quote Details'}</CardTitle>
                      <CardDescription>
                          {isOrder && quote.order_display_id 
                              ? `Order ID: ${quote.order_display_id}` 
                              : `Quote ID: ${quote.display_id || quote.id}`}
                      </CardDescription>
                  </div>
                  <div>Status: <span className="font-semibold">{quote.status}</span></div>
              </div>
          </CardHeader>
          <CardContent className="space-y-4">
               <p><strong>Customer Email:</strong> {quote.email}</p>
               {quote.status === 'cancelled' && quote.rejection_reasons && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                      <h4 className="font-semibold mb-1">Rejection Information</h4>
                      <p><strong>Reason:</strong> {quote.rejection_reasons.reason}</p>
                      {quote.rejection_details && <p className="mt-1"><strong>Details:</strong> {quote.rejection_details}</p>}
                  </div>
               )}
          </CardContent>
        </Card>

        {isOrder && <OrderTimeline currentStatus={quote.status} />}

        <div className="grid md:grid-cols-2 gap-8">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Card>
                  <CardHeader><CardTitle>Products</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                      {fields && fields.length > 0 ? (
                          fields.map((item, index) => (
                              <EditableAdminQuoteItemCard 
                                  key={item.id} 
                                  index={index}
                                  control={form.control}
                                  allCountries={allCountries}
                              />
                          ))
                      ) : (
                          <p>No items in this quote.</p>
                      )}
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader><CardTitle>Costs and Settings</CardTitle></CardHeader>
                  <CardContent>
                      <QuoteDetailForm 
                        control={form.control}
                        customsCategories={customsCategories} 
                      />
                  </CardContent>
              </Card>
              <Button 
                  type="submit"
                  disabled={isUpdating || !canRecalculate}
                  className="w-full"
              >
                  {isUpdating ? 'Updating...' : 'Update & Recalculate'}
              </Button>
              <Button 
                  onClick={() => sendQuoteEmail(quote)}
                  disabled={(quote.status !== 'calculated' && quote.status !== 'sent') || isSendingEmail || isUpdating || !canRecalculate}
                  className="w-full"
                  variant="destructive"
                  type="button"
              >
                  <Send className="h-4 w-4 mr-2" />
                  {quote.status === 'sent' ? 'Resend to Customer' : 'Send to Customer'}
              </Button>
            </form>
            <div className="space-y-4">
              <QuoteCurrencySummary quote={quote} countries={countries} />
              <QuoteCalculatedCosts quote={quote} />
              {isOrder && (
                <>
                  <OrderActions quote={quote} />
                  <ShippingInfoForm quote={quote} />
                </>
              )}
              <div className="overflow-y-auto max-h-[70vh] border rounded-lg">
                <QuoteMessaging quoteId={quote.id} quoteUserId={quote.user_id} />
              </div>
            </div>
        </div>
      </div>
    </Form>
  );
};

export default AdminQuoteDetailPage;
