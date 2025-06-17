
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";
import { Info } from "lucide-react";

type QuoteWithItems = Tables<'quotes'> & { quote_items: Tables<'quote_items'>[] };
type CountrySetting = Tables<'country_settings'>;

interface QuoteCurrencySummaryProps {
  quote: QuoteWithItems;
  countries: CountrySetting[];
}

export const QuoteCurrencySummary = ({ quote, countries }: QuoteCurrencySummaryProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Currency Information
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-3">
        <div>
          <p className="font-semibold">System Currency: <span className="font-normal">USD</span></p>
          <p className="text-xs text-muted-foreground">All prices are calculated and displayed in USD for consistency.</p>
        </div>
        <div>
          <p className="font-semibold">Quote Currency: <span className="font-normal">USD</span></p>
          <p className="text-xs text-muted-foreground">Final quote will be provided in USD.</p>
        </div>
      </CardContent>
    </Card>
  );
};
