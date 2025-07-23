/**
 * Common date formatting utilities for the admin interface
 * Extracted from duplicate implementations in quote components
 */

/**
 * Format a date string into a human-readable relative time
 * Shows "X days ago" format with fallback to formatted date
 */
export const formatDateRelative = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return `${diffDays} days ago`;
  
  // For older dates, show formatted date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

/**
 * Format a date string for admin displays
 * Consistent formatting across admin interface
 */
export const formatDateAdmin = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format a date string for compact displays (quote cards, etc.)
 * Prioritizes space efficiency while maintaining readability
 */
export const formatDateCompact = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Less than 24 hours - show hours
  if (diffHours < 24) {
    if (diffHours === 0) return 'Now';
    return `${diffHours}h ago`;
  }

  // Less than 7 days - show days
  if (diffDays <= 7) return `${diffDays}d ago`;
  
  // Older dates - show compact format
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? '2-digit' : undefined
  });
};