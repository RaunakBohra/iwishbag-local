
import React from "react";
import { QuotesTable } from "./QuotesTable";
import { Tables } from "@/integrations/supabase/types";
import { DashboardBulkActions } from "./DashboardBulkActions";
import { QuotesSearch } from "./QuotesSearch";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAllCountries } from "@/hooks/useAllCountries";
import { useDashboardBulkActions } from "@/hooks/useDashboardBulkActions";

type Quote = Tables<'quotes'>;

interface DashboardQuotesTabProps {
  quotes: Quote[];
  selectedQuoteIds: string[];
  onSelectQuote: (quoteId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onBulkAction: (action: string) => void;
  setSelectedQuoteIds: (ids: string[]) => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  isSearching?: boolean;
}

export const DashboardQuotesTab = ({
  quotes,
  selectedQuoteIds,
  onSelectQuote,
  onSelectAll,
  onBulkAction,
  setSelectedQuoteIds,
  searchTerm = "",
  onSearchChange,
  isSearching = false,
}: DashboardQuotesTabProps) => {
  const { data: userProfile } = useUserProfile();
  const { data: allCountries } = useAllCountries();

  const {
    handleBulkAddToCart,
    handleBulkRemoveFromCart,
    isAddingBulk,
    isRemovingBulk,
  } = useDashboardBulkActions({
    quotes,
    selectedQuoteIds,
    setSelectedQuoteIds,
  });

  return (
    <div className="space-y-4">
      {onSearchChange && (
        <QuotesSearch
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          isSearching={isSearching}
        />
      )}
      
      <DashboardBulkActions
        selectedQuoteIds={selectedQuoteIds}
        onBulkAction={onBulkAction}
        userProfile={userProfile}
        allCountries={allCountries}
      />
      
      <QuotesTable
        quotes={quotes}
        selectedQuoteIds={selectedQuoteIds}
        onSelectQuote={onSelectQuote}
        onSelectAll={onSelectAll}
        userProfile={userProfile}
        allCountries={allCountries}
      />
    </div>
  );
};
