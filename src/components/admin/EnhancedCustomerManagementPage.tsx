import { useState, useMemo } from "react";
import { useCustomerManagement } from "@/hooks/useCustomerManagement";
import { CustomerTable } from "./CustomerTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Users, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Mail, 
  TrendingUp, 
  DollarSign,
  MapPin,
  Calendar,
  Activity,
  Star,
  UserCheck,
  UserX,
  RefreshCw
} from "lucide-react";
import { CustomerStats } from "./CustomerStats";
import { CustomerActivityTimeline } from "./CustomerActivityTimeline";

import { CustomerEmailDialog } from "./CustomerEmailDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const EnhancedCustomerManagementPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  
  const { toast } = useToast();
  
  const { 
    customers, 
    isLoading, 
    updateCodMutation,
    updateNotesMutation,
    updateProfileMutation
  } = useCustomerManagement();

  // Handler for COD updates
  const handleUpdateCod = (userId: string, codEnabled: boolean) => {
    updateCodMutation.mutate({ userId, codEnabled });
  };

  // Enhanced filtering
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    
    return customers.filter(customer => {
      // Search filter
      const matchesSearch = 
        (customer.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;
      
      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "active" && !customer.cod_enabled) return false;
        if (statusFilter === "inactive" && customer.cod_enabled) return false;
        if (statusFilter === "vip" && !customer.internal_notes?.includes("VIP")) return false;
      }
      
      // Country filter
      if (countryFilter !== "all") {
        const customerCountry = customer.user_addresses[0]?.country;
        if (customerCountry !== countryFilter) return false;
      }
      
      // Date filter
      if (dateFilter !== "all") {
        const customerDate = new Date(customer.created_at);
        const now = new Date();
        let startDate = new Date();
        
        switch (dateFilter) {
          case "7d":
            startDate.setDate(now.getDate() - 7);
            break;
          case "30d":
            startDate.setDate(now.getDate() - 30);
            break;
          case "90d":
            startDate.setDate(now.getDate() - 90);
            break;
        }
        
        if (customerDate < startDate) return false;
      }
      
      return true;
    });
  }, [customers, searchQuery, statusFilter, countryFilter, dateFilter]);

  // Get customer analytics
  const { data: customerAnalytics } = useQuery({
    queryKey: ['customer-analytics'],
    queryFn: async () => {
      const { data: quotes, error } = await supabase
        .from('quotes')
        .select('*')
        .not('final_total', 'is', null);

      if (error) throw error;

      // Calculate customer metrics
      const customerMetrics = customers?.map(customer => {
        const customerQuotes = quotes?.filter(q => q.user_id === customer.id) || [];
        const totalSpent = customerQuotes.reduce((sum, q) => sum + (q.final_total || 0), 0);
        const orderCount = customerQuotes.filter(q => ['paid', 'ordered', 'shipped', 'completed'].includes(q.status)).length;
        const quoteCount = customerQuotes.length;
        const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;
        
        return {
          customerId: customer.id,
          totalSpent,
          orderCount,
          quoteCount,
          avgOrderValue,
          lastActivity: customerQuotes.length > 0 ? 
            new Date(Math.max(...customerQuotes.map(q => new Date(q.created_at).getTime()))) : 
            new Date(customer.created_at)
        };
      }) || [];

      return customerMetrics;
    },
    enabled: !!customers
  });

  // Export functionality
  const exportCustomers = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Name,Email,Location,Join Date,Total Spent,Orders,Avg Order Value,Status\n"
      + filteredCustomers.map(customer => {
        const analytics = customerAnalytics?.find(a => a.customerId === customer.id);
        const status = customer.internal_notes?.includes("VIP") ? "VIP" : 
                      customer.cod_enabled ? "Active" : "Inactive";
        return `${customer.id},"${customer.full_name || 'N/A'}","${customer.email}","${customer.user_addresses[0]?.city || 'N/A'}, ${customer.user_addresses[0]?.country || 'N/A'}","${new Date(customer.created_at).toLocaleDateString()}","${analytics?.totalSpent || 0}","${analytics?.orderCount || 0}","${analytics?.avgOrderValue || 0}","${status}"`;
      }).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "customers_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Successful",
      description: `${filteredCustomers.length} customers exported to CSV`,
    });
  };

  // Get unique countries for filter
  const uniqueCountries = useMemo(() => {
    if (!customers) return [];
    const countries = new Set<string>();
    customers.forEach(customer => {
      customer.user_addresses.forEach(address => {
        if (address.country) countries.add(address.country);
      });
    });
    return Array.from(countries).sort();
  }, [customers]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {filteredCustomers.length} filtered
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers?.filter(c => c.cod_enabled).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              COD enabled
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VIP Customers</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers?.filter(c => c.internal_notes?.includes("VIP")).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              High-value customers
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers?.filter(c => {
                const customerDate = new Date(c.created_at);
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return customerDate >= monthAgo;
              }).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list">Customer List</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Customer Management
              </CardTitle>
              <CardDescription>
                View, search, and manage your customers. Currently managing {customers?.length || 0} users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Enhanced Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {uniqueCountries.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button onClick={exportCustomers} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
              
              <CustomerTable 
                customers={filteredCustomers}
                customerAnalytics={customers?.map(customer => {
                  // Calculate basic analytics from available data
                  return {
                    customerId: customer.id,
                    totalSpent: 0, // We'll need to calculate this from quotes
                    orderCount: 0, // We'll need to calculate this from quotes
                    quoteCount: 0, // We'll need to calculate this from quotes
                    avgOrderValue: 0,
                    lastActivity: new Date(customer.created_at)
                  };
                })}
                onUpdateCod={handleUpdateCod}
                onUpdateNotes={updateNotesMutation.mutate}
                onUpdateName={(userId, name) => updateProfileMutation.mutate({ userId, fullName: name })}
                onCustomerSelect={setSelectedCustomer}
                isUpdating={updateCodMutation.isPending || updateNotesMutation.isPending || updateProfileMutation.isPending}
              />
              
              {filteredCustomers.length === 0 && !isLoading && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No customers found matching your search criteria.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <CustomerStats 
            customers={customers} 
            customerAnalytics={customers?.map(customer => {
              // Calculate basic analytics from available data
              return {
                customerId: customer.id,
                totalSpent: 0, // We'll need to calculate this from quotes
                orderCount: 0, // We'll need to calculate this from quotes
                quoteCount: 0, // We'll need to calculate this from quotes
                avgOrderValue: 0,
                lastActivity: new Date(customer.created_at)
              };
            })}
          />
        </TabsContent>
        
        <TabsContent value="activity" className="space-y-4">
          {selectedCustomer ? (
            <CustomerActivityTimeline customerId={selectedCustomer} />
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Select a customer to view their activity timeline</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}; 