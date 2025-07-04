import React from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "./StatusBadge";
import { Tables } from "@/integrations/supabase/types";
import { useUserCurrency } from "@/hooks/useUserCurrency";

type Quote = Tables<'quotes'>;
type CountrySetting = Tables<'country_settings'>;
type Profile = Tables<'profiles'>;

interface QuotesTableProps {
  quotes: Quote[];
  selectedQuoteIds: string[];
  onSelectQuote: (quoteId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  userProfile?: Profile | null;
  allCountries?: CountrySetting[] | null;
}

export const QuotesTable = ({ 
  quotes, 
  selectedQuoteIds, 
  onSelectQuote, 
  onSelectAll,
  userProfile,
  allCountries 
}: QuotesTableProps) => {
  const allSelected = quotes.length > 0 && selectedQuoteIds.length === quotes.length;
  const { formatAmount } = useUserCurrency();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox
              checked={allSelected}
              onCheckedChange={onSelectAll}
            />
          </TableHead>
          <TableHead>Quote ID</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {quotes.map((quote) => {
          return (
            <TableRow key={quote.id}>
              <TableCell>
                <Checkbox
                  checked={selectedQuoteIds.includes(quote.id)}
                  onCheckedChange={(checked) => onSelectQuote(quote.id, checked as boolean)}
                />
              </TableCell>
              <TableCell>
                <Link
                  to={`/quote/${quote.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {quote.display_id || quote.id.substring(0, 8)}
                </Link>
              </TableCell>
              <TableCell className="max-w-xs truncate">
                {quote.product_name || "N/A"}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <StatusBadge status={quote.status} category="quote" />
                  {quote.status !== 'pending' && (
                    <Badge variant={quote.status === 'approved' ? 'default' : 'destructive'}>
                      {quote.status}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div>{formatAmount(quote.final_total)}</div>
              </TableCell>
              <TableCell>
                {format(new Date(quote.created_at), "MMM d, yyyy")}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
