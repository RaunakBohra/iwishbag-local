import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  Filter, 
  X, 
  Calendar,
  DollarSign,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useStatusManagement } from "@/hooks/useStatusManagement";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAllCountries } from '@/hooks/useAllCountries';

interface QuoteFiltersProps {
    searchTerm: string;
    onSearchTermChange: (value: string) => void;
    statusFilter: string;
    onStatusFilterChange: (value: string) => void;
    // New filter props
    dateRange?: string;
    onDateRangeChange?: (value: string) => void;
    amountRange?: string;
    onAmountRangeChange?: (value: string) => void;
    countryFilter?: string;
    onCountryFilterChange?: (value: string) => void;
    priorityFilter?: string;
    onPriorityFilterChange?: (value: string) => void;
    onClearFilters?: () => void;
    // Add purchase and shipping country filters
    purchaseCountryFilter?: string;
    onPurchaseCountryFilterChange?: (value: string) => void;
    shippingCountryFilter?: string;
    onShippingCountryFilterChange?: (value: string) => void;
}

export const QuoteFilters = ({ 
    searchTerm, 
    onSearchTermChange, 
    statusFilter, 
    onStatusFilterChange,
    dateRange = "all",
    onDateRangeChange,
    amountRange = "all",
    onAmountRangeChange,
    countryFilter = "all",
    onCountryFilterChange,
    priorityFilter = "all",
    onPriorityFilterChange,
    onClearFilters,
    purchaseCountryFilter,
    onPurchaseCountryFilterChange,
    shippingCountryFilter,
    onShippingCountryFilterChange
}: QuoteFiltersProps) => {
    const { quoteStatuses } = useStatusManagement();
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const { data: allCountries, isLoading: countriesLoading } = useAllCountries();

    // Get only quote statuses for filtering
    const availableQuoteStatuses = (quoteStatuses || [])
        .filter(status => status.isActive)
        .sort((a, b) => a.order - b.order);

    const hasActiveFilters = statusFilter !== 'all' || 
                           dateRange !== 'all' || 
                           amountRange !== 'all' || 
                           countryFilter !== 'all' || 
                           priorityFilter !== 'all' ||
                           searchTerm.length > 0;

    const dateRangeOptions = [
        { value: "all", label: "All Time" },
        { value: "today", label: "Today" },
        { value: "yesterday", label: "Yesterday" },
        { value: "7days", label: "Last 7 Days" },
        { value: "30days", label: "Last 30 Days" },
        { value: "90days", label: "Last 90 Days" },
        { value: "thisMonth", label: "This Month" },
        { value: "lastMonth", label: "Last Month" },
    ];

    const amountRangeOptions = [
        { value: "all", label: "All Amounts" },
        { value: "0-100", label: "$0 - $100" },
        { value: "100-500", label: "$100 - $500" },
        { value: "500-1000", label: "$500 - $1,000" },
        { value: "1000-5000", label: "$1,000 - $5,000" },
        { value: "5000+", label: "$5,000+" },
    ];

    const priorityOptions = [
        { value: "all", label: "All Priorities" },
        { value: "low", label: "Low Priority" },
        { value: "normal", label: "Normal Priority" },
        { value: "high", label: "High Priority" },
        { value: "urgent", label: "Urgent" },
    ];

    // Build dynamic country options
    const dynamicCountryOptions = [
        { value: 'all', label: 'All Countries' },
        ...(allCountries ? allCountries.map((c: any) => ({ value: c.code, label: c.name })) : [])
    ];

    return (
        <Card className="shadow-md rounded-xl border border-gray-100">
            <CardHeader className="pb-3 border-b bg-white rounded-t-xl">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filters
                        {hasActiveFilters && (
                            <Badge variant="secondary" className="ml-2">
                                Active
                            </Badge>
                        )}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {hasActiveFilters && onClearFilters && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onClearFilters}
                                className="h-8"
                            >
                                <X className="h-4 w-4 mr-1" />
                                Clear All
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                            className="h-8"
                        >
                            {isAdvancedOpen ? (
                                <ChevronUp className="h-4 w-4" />
                            ) : (
                                <ChevronDown className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 py-6 bg-white rounded-b-xl">
                {/* Basic Filters - Always Visible */}
                <div className="flex flex-col sm:flex-row gap-6 items-stretch">
                    {/* Search - Visually dominant */}
                    <div className="relative flex-[2_2_0%] min-w-0">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Search by QT#, Product, Email, or Country..."
                            value={searchTerm}
                            onChange={(e) => onSearchTermChange(e.target.value)}
                            className="pl-11 h-11 bg-gray-50 border border-gray-200 rounded-lg shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/10 text-base placeholder:text-muted-foreground transition-all"
                        />
                    </div>
                    {/* Other filters */}
                    <div className="flex flex-1 gap-6 min-w-0 items-center">
                        {/* Status Filter */}
                        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                            <SelectTrigger className="w-40 h-11 bg-gray-50 border border-gray-200 rounded-lg shadow-sm text-base text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all">
                                <span className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                    <SelectValue placeholder="All Statuses" className="text-muted-foreground" />
                                </span>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                {availableQuoteStatuses.map((status) => (
                                    <SelectItem key={status.name} value={status.name}>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={status.color} className="text-xs">
                                                {status.label}
                                            </Badge>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {/* Date Range */}
                        <Select value={dateRange} onValueChange={onDateRangeChange}>
                            <SelectTrigger className="w-40 h-11 bg-gray-50 border border-gray-200 rounded-lg shadow-sm text-base text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all">
                                <span className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <SelectValue placeholder="All Time" className="text-muted-foreground" />
                                </span>
                            </SelectTrigger>
                            <SelectContent>
                                {dateRangeOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {/* Purchase Country Filter */}
                        <Select value={purchaseCountryFilter || 'all'} onValueChange={onPurchaseCountryFilterChange} disabled={countriesLoading}>
                            <SelectTrigger className="w-40 h-11 bg-gray-50 border border-gray-200 rounded-lg shadow-sm text-base text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all">
                                <span className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <SelectValue placeholder="Purchase Country" className="text-muted-foreground" />
                                </span>
                            </SelectTrigger>
                            <SelectContent>
                                {dynamicCountryOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {/* Priority Filter */}
                        <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
                            <SelectTrigger className="w-40 h-11 bg-gray-50 border border-gray-200 rounded-lg shadow-sm text-base text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all">
                                <span className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <SelectValue placeholder="All Priorities" className="text-muted-foreground" />
                                </span>
                            </SelectTrigger>
                            <SelectContent>
                                {priorityOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Advanced Filters - Collapsible */}
                {isAdvancedOpen && (
                    <div className="pt-4 border-t space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Shipping Country Filter */}
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Shipping Country</label>
                                <Select value={shippingCountryFilter || 'all'} onValueChange={onShippingCountryFilterChange} disabled={countriesLoading}>
                                    <SelectTrigger>
                                        <MapPin className="h-4 w-4 mr-2" />
                                        <SelectValue placeholder="Shipping Country" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {dynamicCountryOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Amount Range */}
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Amount Range</label>
                                <Select value={amountRange} onValueChange={onAmountRangeChange}>
                                    <SelectTrigger>
                                        <DollarSign className="h-4 w-4 mr-2" />
                                        <SelectValue placeholder="All Amounts" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {amountRangeOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
