/**
 * Payment UI Service
 * Handles UI state management, filtering, pagination, and interface logic
 * Decomposed from PaymentManagementPage for focused UI management
 * 
 * RESPONSIBILITIES:
 * - Filter state management and validation
 * - Pagination state and calculations
 * - UI preferences and settings
 * - Search query processing and optimization
 * - Date range validation and formatting
 * - Export functionality and formatting
 * - UI interaction logging and analytics
 */

import { logger } from '@/utils/logger';

export interface FilterState {
  statusFilter: 'all' | 'pending' | 'verified' | 'rejected';
  paymentMethodFilter: 'all' | 'bank_transfer' | 'payu' | 'stripe' | 'esewa';
  searchQuery: string;
  dateRange: {
    from: Date;
    to: Date;
  };
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  filteredCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface UIPreferences {
  defaultPageSize: number;
  defaultDateRange: 'week' | 'month' | 'quarter' | 'year' | 'custom';
  autoRefreshInterval: number; // in seconds, 0 = disabled
  showAdvancedFilters: boolean;
  compactView: boolean;
  sortBy: 'created_at' | 'amount' | 'status' | 'customer';
  sortDirection: 'asc' | 'desc';
}

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'pdf';
  includeColumns: string[];
  dateFormat: 'us' | 'iso' | 'local';
  includeFilters: boolean;
  includeStats: boolean;
}

export interface SearchSuggestion {
  type: 'order_id' | 'customer' | 'email' | 'amount' | 'transaction_id';
  value: string;
  display: string;
  count?: number;
}

export interface UINotification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  duration?: number; // auto-dismiss after ms, 0 = manual dismiss
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary';
  }>;
}

export class PaymentUIService {
  private static instance: PaymentUIService;
  private uiState = new Map<string, any>();
  private preferences: UIPreferences;
  private notifications: UINotification[] = [];
  private searchHistory: string[] = [];
  private readonly maxSearchHistory = 10;

  constructor() {
    this.preferences = this.loadDefaultPreferences();
    logger.info('PaymentUIService initialized');
  }

  static getInstance(): PaymentUIService {
    if (!PaymentUIService.instance) {
      PaymentUIService.instance = new PaymentUIService();
    }
    return PaymentUIService.instance;
  }

  /**
   * Initialize default filter state
   */
  getDefaultFilterState(): FilterState {
    const now = new Date();
    const defaultDateRange = this.calculateDefaultDateRange(this.preferences.defaultDateRange);

    return {
      statusFilter: 'all',
      paymentMethodFilter: 'all',
      searchQuery: '',
      dateRange: defaultDateRange
    };
  }

  /**
   * Initialize default pagination state
   */
  getDefaultPaginationState(): PaginationState {
    return {
      currentPage: 1,
      pageSize: this.preferences.defaultPageSize,
      totalCount: 0,
      filteredCount: 0,
      hasNextPage: false,
      hasPreviousPage: false
    };
  }

  /**
   * Validate and sanitize filter state
   */
  validateFilterState(filters: Partial<FilterState>): FilterState {
    const defaultState = this.getDefaultFilterState();
    
    return {
      statusFilter: this.isValidStatusFilter(filters.statusFilter) ? filters.statusFilter! : defaultState.statusFilter,
      paymentMethodFilter: this.isValidPaymentMethodFilter(filters.paymentMethodFilter) ? 
        filters.paymentMethodFilter! : defaultState.paymentMethodFilter,
      searchQuery: this.sanitizeSearchQuery(filters.searchQuery || ''),
      dateRange: this.validateDateRange(filters.dateRange) || defaultState.dateRange
    };
  }

  /**
   * Update pagination state with new data
   */
  updatePaginationState(
    currentState: PaginationState,
    totalCount: number,
    filteredCount: number
  ): PaginationState {
    const totalPages = Math.ceil(filteredCount / currentState.pageSize);
    const currentPage = Math.min(currentState.currentPage, Math.max(1, totalPages));

    return {
      ...currentState,
      currentPage,
      totalCount,
      filteredCount,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1
    };
  }

  /**
   * Calculate page navigation
   */
  getPageInfo(pagination: PaginationState): {
    startIndex: number;
    endIndex: number;
    totalPages: number;
    showingText: string;
    pageNumbers: number[];
  } {
    const totalPages = Math.ceil(pagination.filteredCount / pagination.pageSize);
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize + 1;
    const endIndex = Math.min(pagination.currentPage * pagination.pageSize, pagination.filteredCount);
    
    // Generate page numbers for pagination UI
    const pageNumbers = this.generatePageNumbers(pagination.currentPage, totalPages);
    
    const showingText = pagination.filteredCount === 0 
      ? 'No payments found'
      : `Showing ${startIndex}-${endIndex} of ${pagination.filteredCount} payments`;

    return {
      startIndex,
      endIndex,
      totalPages,
      showingText,
      pageNumbers
    };
  }

  /**
   * Add search query to history
   */
  addToSearchHistory(query: string): void {
    if (!query.trim()) return;

    // Remove existing occurrence
    this.searchHistory = this.searchHistory.filter(q => q !== query);
    
    // Add to beginning
    this.searchHistory.unshift(query);
    
    // Keep only recent searches
    this.searchHistory = this.searchHistory.slice(0, this.maxSearchHistory);
    
    this.saveSearchHistory();
  }

  /**
   * Get search suggestions based on query
   */
  getSearchSuggestions(query: string): SearchSuggestion[] {
    if (!query.trim()) {
      return this.searchHistory.map(q => ({
        type: 'order_id',
        value: q,
        display: q
      }));
    }

    const suggestions: SearchSuggestion[] = [];
    const lowerQuery = query.toLowerCase().trim();

    // Order ID pattern (IWB followed by numbers)
    if (/^iwb\d*$/i.test(lowerQuery)) {
      suggestions.push({
        type: 'order_id',
        value: query.toUpperCase(),
        display: `Search by Order ID: ${query.toUpperCase()}`
      });
    }

    // Email pattern
    if (lowerQuery.includes('@') || /^[a-z0-9._-]+$/i.test(lowerQuery)) {
      suggestions.push({
        type: 'email',
        value: query,
        display: `Search by Email: ${query}`
      });
    }

    // Amount pattern (numbers with optional currency symbols)
    if (/^\$?[\d,]+\.?\d*$/.test(lowerQuery.replace(/\s/g, ''))) {
      suggestions.push({
        type: 'amount',
        value: query,
        display: `Search by Amount: ${query}`
      });
    }

    // Transaction ID pattern (alphanumeric with dashes/underscores)
    if (/^[a-z0-9_-]{6,}$/i.test(lowerQuery)) {
      suggestions.push({
        type: 'transaction_id',
        value: query,
        display: `Search by Transaction ID: ${query}`
      });
    }

    // Customer name (if it contains spaces or is longer)
    if (lowerQuery.includes(' ') || lowerQuery.length > 3) {
      suggestions.push({
        type: 'customer',
        value: query,
        display: `Search by Customer Name: ${query}`
      });
    }

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  /**
   * Create export configuration
   */
  createExportConfig(
    filters: FilterState,
    options: Partial<ExportOptions> = {}
  ): ExportOptions {
    const defaultOptions: ExportOptions = {
      format: 'csv',
      includeColumns: [
        'order_id',
        'customer_name',
        'customer_email',
        'payment_method',
        'amount',
        'status',
        'created_at',
        'verified_at'
      ],
      dateFormat: 'local',
      includeFilters: true,
      includeStats: true
    };

    return { ...defaultOptions, ...options };
  }

  /**
   * Format filters for display/export
   */
  formatFiltersForDisplay(filters: FilterState): Record<string, string> {
    return {
      'Status': this.formatStatusFilter(filters.statusFilter),
      'Payment Method': this.formatPaymentMethodFilter(filters.paymentMethodFilter),
      'Search': filters.searchQuery || 'None',
      'Date Range': this.formatDateRange(filters.dateRange)
    };
  }

  /**
   * Add UI notification
   */
  addNotification(notification: Omit<UINotification, 'id'>): string {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullNotification: UINotification = {
      id,
      duration: 5000, // Default 5 seconds
      ...notification
    };

    this.notifications.push(fullNotification);

    // Auto-dismiss if duration is set
    if (fullNotification.duration && fullNotification.duration > 0) {
      setTimeout(() => {
        this.removeNotification(id);
      }, fullNotification.duration);
    }

    logger.debug(`Added UI notification: ${notification.type} - ${notification.title}`);
    return id;
  }

  /**
   * Remove notification
   */
  removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  /**
   * Get all notifications
   */
  getNotifications(): UINotification[] {
    return [...this.notifications];
  }

  /**
   * Clear all notifications
   */
  clearNotifications(): void {
    this.notifications = [];
  }

  /**
   * Update UI preferences
   */
  updatePreferences(updates: Partial<UIPreferences>): void {
    this.preferences = { ...this.preferences, ...updates };
    this.savePreferences();
    logger.info('UI preferences updated:', updates);
  }

  /**
   * Get current preferences
   */
  getPreferences(): UIPreferences {
    return { ...this.preferences };
  }

  /**
   * Save UI state
   */
  saveUIState(key: string, state: any): void {
    this.uiState.set(key, state);
  }

  /**
   * Load UI state
   */
  loadUIState<T>(key: string, defaultValue: T): T {
    return this.uiState.get(key) || defaultValue;
  }

  /**
   * Private helper methods
   */
  private loadDefaultPreferences(): UIPreferences {
    try {
      const stored = localStorage.getItem('payment-ui-preferences');
      if (stored) {
        return { ...this.getSystemDefaultPreferences(), ...JSON.parse(stored) };
      }
    } catch (error) {
      logger.warn('Failed to load UI preferences from localStorage:', error);
    }
    
    return this.getSystemDefaultPreferences();
  }

  private getSystemDefaultPreferences(): UIPreferences {
    return {
      defaultPageSize: 25,
      defaultDateRange: 'month',
      autoRefreshInterval: 0, // Disabled by default
      showAdvancedFilters: false,
      compactView: false,
      sortBy: 'created_at',
      sortDirection: 'desc'
    };
  }

  private savePreferences(): void {
    try {
      localStorage.setItem('payment-ui-preferences', JSON.stringify(this.preferences));
    } catch (error) {
      logger.warn('Failed to save UI preferences to localStorage:', error);
    }
  }

  private saveSearchHistory(): void {
    try {
      localStorage.setItem('payment-search-history', JSON.stringify(this.searchHistory));
    } catch (error) {
      logger.warn('Failed to save search history:', error);
    }
  }

  private loadSearchHistory(): void {
    try {
      const stored = localStorage.getItem('payment-search-history');
      if (stored) {
        this.searchHistory = JSON.parse(stored).slice(0, this.maxSearchHistory);
      }
    } catch (error) {
      logger.warn('Failed to load search history:', error);
      this.searchHistory = [];
    }
  }

  private calculateDefaultDateRange(range: string): { from: Date; to: Date } {
    const now = new Date();
    const from = new Date();

    switch (range) {
      case 'week':
        from.setDate(now.getDate() - 7);
        break;
      case 'month':
        from.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        from.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        from.setFullYear(now.getFullYear() - 1);
        break;
      default:
        from.setDate(now.getDate() - 30); // Default to 30 days
    }

    return { from, to: now };
  }

  private isValidStatusFilter(status: any): boolean {
    return ['all', 'pending', 'verified', 'rejected'].includes(status);
  }

  private isValidPaymentMethodFilter(method: any): boolean {
    return ['all', 'bank_transfer', 'payu', 'stripe', 'esewa'].includes(method);
  }

  private sanitizeSearchQuery(query: string): string {
    return query.trim().slice(0, 100); // Limit length and trim
  }

  private validateDateRange(range: any): { from: Date; to: Date } | null {
    if (!range || !range.from || !range.to) return null;

    try {
      const from = new Date(range.from);
      const to = new Date(range.to);

      if (isNaN(from.getTime()) || isNaN(to.getTime())) return null;
      if (from > to) return null;

      // Limit to reasonable range (e.g., not more than 2 years)
      const maxRangeDays = 2 * 365;
      const rangeDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
      
      if (rangeDays > maxRangeDays) return null;

      return { from, to };
    } catch {
      return null;
    }
  }

  private generatePageNumbers(currentPage: number, totalPages: number): number[] {
    const delta = 2; // Pages to show on each side of current page
    const numbers: number[] = [];

    // Always show first page
    numbers.push(1);

    // Calculate range around current page
    const start = Math.max(2, currentPage - delta);
    const end = Math.min(totalPages - 1, currentPage + delta);

    // Add ellipsis if needed
    if (start > 2) {
      numbers.push(-1); // Represents ellipsis
    }

    // Add pages around current
    for (let i = start; i <= end; i++) {
      numbers.push(i);
    }

    // Add ellipsis if needed
    if (end < totalPages - 1) {
      numbers.push(-1); // Represents ellipsis
    }

    // Always show last page if more than 1 page
    if (totalPages > 1) {
      numbers.push(totalPages);
    }

    // Remove duplicates and sort
    return [...new Set(numbers)].sort((a, b) => a - b);
  }

  private formatStatusFilter(status: string): string {
    const statusMap = {
      'all': 'All Statuses',
      'pending': 'Pending',
      'verified': 'Verified',
      'rejected': 'Rejected'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  }

  private formatPaymentMethodFilter(method: string): string {
    const methodMap = {
      'all': 'All Methods',
      'bank_transfer': 'Bank Transfer',
      'payu': 'PayU',
      'stripe': 'Stripe',
      'esewa': 'eSewa'
    };
    return methodMap[method as keyof typeof methodMap] || method;
  }

  private formatDateRange(range: { from: Date; to: Date }): string {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    
    return `${range.from.toLocaleDateString(undefined, options)} - ${range.to.toLocaleDateString(undefined, options)}`;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.clearNotifications();
    this.uiState.clear();
    logger.info('PaymentUIService disposed');
  }
}

export default PaymentUIService;