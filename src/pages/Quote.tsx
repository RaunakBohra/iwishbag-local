
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import QuoteForm from "@/components/forms/QuoteForm";

const Quote = () => {
  return (
    <div className="container py-12 md:py-24">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Request a Free Quote</CardTitle>
            <CardDescription>
              Fill in the details of the item you want, and we'll get back to you with a quote within 24 hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QuoteForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Quote;
