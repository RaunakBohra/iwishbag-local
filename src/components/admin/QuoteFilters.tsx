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
        { value: "medium", label: "Medium Priority" },
        { value: "high", label: "High Priority" },
        { value: "urgent", label: "Urgent" },
    ];

    // Build dynamic country options
    const dynamicCountryOptions = [
        { value: 'all', label: 'All Countries' },
        ...(allCountries ? allCountries.map((c: any) => ({ value: c.code, label: c.name })) : [])
    ];

    return (
        <Card>
            <CardHeader className="pb-3 border-b">
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
            <CardContent className="space-y-4">
                {/* Basic Filters - Always Visible */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by QT#, Product, Email, or Country..."
                            value={searchTerm}
                            onChange={(e) => onSearchTermChange(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    {/* Status Filter */}
                    <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Statuses" />
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
                        <SelectTrigger>
                            <Calendar className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="All Time" />
                        </SelectTrigger>
                        <SelectContent>
                            {dateRangeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Advanced Filters - Collapsible */}
                {isAdvancedOpen && (
                    <div className="pt-4 border-t space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Purchase Country Filter */}
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Purchase Country</label>
                                <Select value={purchaseCountryFilter || 'all'} onValueChange={onPurchaseCountryFilterChange} disabled={countriesLoading}>
                                    <SelectTrigger>
                                        <MapPin className="h-4 w-4 mr-2" />
                                        <SelectValue placeholder="Purchase Country" />
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
                            {/* Country Filter */}
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Country</label>
                                <Select value={countryFilter} onValueChange={onCountryFilterChange}>
                                    <SelectTrigger>
                                        <MapPin className="h-4 w-4 mr-2" />
                                        <SelectValue placeholder="All Countries" />
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
                            {/* Priority Filter */}
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Priority</label>
                                <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
                                    <SelectTrigger>
                                        <Clock className="h-4 w-4 mr-2" />
                                        <SelectValue placeholder="All Priorities" />
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
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
