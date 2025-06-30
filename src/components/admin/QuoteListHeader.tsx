import { Checkbox } from "@/components/ui/checkbox";
import { Tables } from "@/integrations/supabase/types";

type QuoteWithItems = Tables<'quotes'> & {
  quote_items: Tables<'quote_items'>[];
};

interface QuoteListHeaderProps {
    quotes: QuoteWithItems[] | undefined;
    selectedQuoteIds: string[];
    onToggleSelectAll: () => void;
}

export const QuoteListHeader = ({ quotes, selectedQuoteIds, onToggleSelectAll }: QuoteListHeaderProps) => {
    return (
        <div className="flex items-center p-4 border-b">
            <Checkbox
                id="select-all"
                checked={
                  (quotes?.length ?? 0) > 0 && selectedQuoteIds.length === quotes?.length
                    ? true
                    : selectedQuoteIds.length > 0 && selectedQuoteIds.length < (quotes?.length ?? 0)
                    ? 'indeterminate'
                    : false
                }
                onCheckedChange={onToggleSelectAll}
            />
            <label htmlFor="select-all" className="ml-2 text-sm font-medium">
                Select All
            </label>
        </div>
    );
};
