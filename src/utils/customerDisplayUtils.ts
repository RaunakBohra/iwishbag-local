// ============================================================================
// CUSTOMER DISPLAY UTILITIES
// Central utilities for displaying customer information consistently
// Handles registered users, guests, admin-created quotes, and OAuth users
// ============================================================================

interface CustomerDisplayData {
  name: string;
  email: string;
  phone?: string;
  displayName: string;
  initials: string;
  isGuest: boolean;
  isOAuth: boolean;
}

interface Profile {
  id?: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface Quote {
  customer_data?: any;
  shipping_address?: any;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  email?: string;
  user?: any;
  profiles?: Profile;
}

export const customerDisplayUtils = {
  /**
   * Get standardized customer display data from various sources
   * Priority: shipping_address > customer_data > profile > fallbacks
   */
  getCustomerDisplayData(quote: Quote, profile?: Profile | null): CustomerDisplayData {
    // Extract from various sources
    const fromShipping = {
      name: quote.shipping_address?.fullName || quote.shipping_address?.name || '',
      email: quote.shipping_address?.email || '',
      phone: quote.shipping_address?.phone || '',
    };

    const fromCustomerData = {
      name: quote.customer_data?.info?.name || quote.customer_data?.name || '',
      email: quote.customer_data?.info?.email || quote.customer_data?.email || '',
      phone: quote.customer_data?.info?.phone || quote.customer_data?.phone || '',
    };

    const fromProfile = {
      name: profile?.full_name || quote.profiles?.full_name || '',
      email: profile?.email || quote.profiles?.email || '',
      phone: profile?.phone || quote.profiles?.phone || '',
    };

    const fromQuote = {
      name: quote.customer_name || quote.user?.full_name || '',
      email: quote.customer_email || quote.email || quote.user?.email || '',
      phone: quote.customer_phone || quote.user?.phone || '',
    };

    // Determine final values with priority
    const name = fromShipping.name || fromCustomerData.name || fromProfile.name || fromQuote.name || 'Guest User';
    const email = fromShipping.email || fromCustomerData.email || fromProfile.email || fromQuote.email || '';
    const phone = fromShipping.phone || fromCustomerData.phone || fromProfile.phone || fromQuote.phone || '';

    // Determine user type
    const isGuest = !profile?.id && !quote.user?.id;
    const isOAuth = email.includes('@oauth.') || name.includes('OAuth User');

    // Generate display name and initials
    const displayName = this.formatDisplayName(name, email, isGuest);
    const initials = this.generateInitials(displayName);

    return {
      name,
      email,
      phone: phone || undefined,
      displayName,
      initials,
      isGuest,
      isOAuth,
    };
  },

  /**
   * Format display name with fallbacks
   */
  formatDisplayName(name: string, email: string, isGuest: boolean): string {
    if (name && name !== 'Guest User') {
      return name;
    }

    if (email) {
      const emailName = email.split('@')[0];
      // Clean up email-based names
      return emailName
        .replace(/[._-]/g, ' ')
        .replace(/\d+/g, '')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .trim() || 'Guest User';
    }

    return isGuest ? 'Guest User' : 'Anonymous User';
  },

  /**
   * Generate initials from display name
   */
  generateInitials(displayName: string): string {
    const parts = displayName.split(' ').filter(Boolean);
    
    if (parts.length === 0) return 'GU';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  },

  /**
   * Format customer info for display in a compact way
   */
  formatCompactInfo(data: CustomerDisplayData): string {
    if (data.isGuest) {
      return data.email || 'Guest Checkout';
    }
    
    return `${data.displayName}${data.email ? ` • ${data.email}` : ''}`;
  },

  /**
   * Get customer type label
   */
  getCustomerTypeLabel(data: CustomerDisplayData): string {
    if (data.isGuest) return 'Guest';
    if (data.isOAuth) return 'Social Login';
    return 'Registered';
  },

  /**
   * Get customer avatar color based on initials
   */
  getAvatarColor(initials: string): string {
    const colors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // violet
      '#EC4899', // pink
      '#14B8A6', // teal
      '#F97316', // orange
    ];

    const charCode = initials.charCodeAt(0) + initials.charCodeAt(1);
    return colors[charCode % colors.length];
  },

  /**
   * Check if customer data is complete
   */
  isCustomerDataComplete(data: CustomerDisplayData): boolean {
    return !!(data.name && data.email && data.name !== 'Guest User');
  },

  /**
   * Format customer data for forms
   */
  getFormData(data: CustomerDisplayData) {
    return {
      name: data.name === 'Guest User' ? '' : data.name,
      email: data.email,
      phone: data.phone || '',
    };
  },
};