import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardQuotesTab } from "@/components/dashboard/DashboardQuotesTab";
import { DashboardOrdersTab } from "@/components/dashboard/DashboardOrdersTab";
import { useDashboardState } from "@/hooks/useDashboardState";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { CustomerDashboardSummary } from "@/components/dashboard/CustomerDashboardSummary";
import { UserPreferences } from "@/components/profile/UserPreferences";

const Dashboard = () => {
  const {
    quotes,
    orders,
    isLoading,
    selectedQuoteIds,
    setSelectedQuoteIds,
    handleSelectQuote,
    handleSelectAll,
    handleBulkAction,
    searchTerm,
    handleSearchChange,
    isSearching,
    filteredQuotes,
  } = useDashboardState();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CustomerDashboardSummary quotes={quotes || []} orders={orders || []} />
        </div>
        <div>
          <UserPreferences compact={true} />
        </div>
      </div>
      
      <Tabs defaultValue="quotes" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="quotes">Quotes ({filteredQuotes?.length || 0})</TabsTrigger>
          <TabsTrigger value="orders">Orders ({orders?.length || 0})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="quotes" className="space-y-4">
          <DashboardQuotesTab
            quotes={filteredQuotes || []}
            selectedQuoteIds={selectedQuoteIds}
            onSelectQuote={handleSelectQuote}
            onSelectAll={handleSelectAll}
            onBulkAction={handleBulkAction}
            setSelectedQuoteIds={setSelectedQuoteIds}
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            isSearching={isSearching}
          />
        </TabsContent>
        
        <TabsContent value="orders" className="space-y-4">
          <DashboardOrdersTab orders={orders || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
