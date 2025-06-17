
import { Link, useSearchParams } from "react-router-dom";
import { useOrderMutations } from "@/hooks/useOrderMutations";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const PaymentConfirmer = ({ quoteId }: { quoteId: string }) => {
  const { confirmPayment, isConfirmingPayment, isSuccess, isError } = useOrderMutations(quoteId);
  const effectRan = useRef(false);

  useEffect(() => {
    if (quoteId && !effectRan.current) {
      confirmPayment();
      effectRan.current = true;
    }
  }, [quoteId, confirmPayment]);

  return (
    <div className="flex items-center justify-between p-2 border-b">
      <p className="text-sm text-muted-foreground">Confirming order for quote <span className="font-mono text-xs">{quoteId.substring(0,8)}...</span></p>
      {isConfirmingPayment && <Loader2 className="w-4 h-4 animate-spin" />}
      {isSuccess && <CheckCircle className="w-4 h-4 text-green-600" />}
      {isError && <XCircle className="w-4 h-4 text-destructive" />}
    </div>
  );
};


export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const quoteIdsStr = searchParams.get("quote_ids");
  const quoteIds = quoteIdsStr ? quoteIdsStr.split(',') : [];

  if (quoteIds.length === 0) {
    return (
        <div className="container py-20 flex flex-col items-center text-center">
            <XCircle className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-destructive text-3xl font-bold mb-6">Invalid Request</h1>
            <p className="mb-8">No quote identifier was provided for payment confirmation.</p>
            <Link to="/dashboard" className="underline text-primary text-lg">
                Back to Dashboard
            </Link>
        </div>
    );
  }

  return (
    <div className="container py-20 flex flex-col items-center text-center">
        <h1 className="text-2xl font-bold mb-2">Processing Your Order</h1>
        <p className="text-muted-foreground mb-6">Please wait while we confirm your payment(s).</p>
        <div className="w-full max-w-md space-y-2 border rounded-lg p-4 bg-muted/40">
            {quoteIds.map((id) => (
                <PaymentConfirmer key={id} quoteId={id} />
            ))}
        </div>
        <div className="mt-8">
            <p className="mb-4">Once all items are confirmed, your order will be complete.</p>
             <Link to="/dashboard" className="underline text-primary text-lg">
                Back to Dashboard
            </Link>
        </div>
    </div>
  );
}
