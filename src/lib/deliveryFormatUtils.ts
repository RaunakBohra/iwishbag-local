/**
 * Delivery Formatting Utilities
 * 
 * Smart utilities for parsing and displaying enhanced delivery day strings
 * that include both day counts and actual dates.
 * 
 * Handles formats like:
 * - Simple: "7-10"
 * - Enhanced: "7-10 days (Jul 25th-Aug 1st)"
 * - Single: "7 days (by Jul 25th)"
 */

export interface ParsedDeliveryDays {
  minDays: number;
  maxDays: number;
  dateRange?: string;
  hasDateInfo: boolean;
  originalString: string;
}

/**
 * Parse enhanced delivery day strings into structured data
 */
export function parseDeliveryDays(daysString: string): ParsedDeliveryDays {
  if (!daysString) {
    return {
      minDays: 0,
      maxDays: 0,
      hasDateInfo: false,
      originalString: daysString,
    };
  }

  // Extract date info if present (text in parentheses)
  const dateMatch = daysString.match(/\((.*?)\)/);
  const dateRange = dateMatch ? dateMatch[1] : undefined;
  const hasDateInfo = !!dateRange;

  // Clean the string to extract just the numeric parts
  const cleanString = daysString.replace(/\s*\(.*?\)\s*/, '').replace(/\s*days?\s*/gi, '').trim();

  // Parse day ranges
  let minDays = 0;
  let maxDays = 0;

  if (cleanString.includes('-')) {
    // Range format: "7-10"
    const parts = cleanString.split('-').map(p => parseInt(p.trim()));
    minDays = parts[0] || 0;
    maxDays = parts[1] || minDays;
  } else {
    // Single value: "7"
    const singleDay = parseInt(cleanString);
    minDays = maxDays = isNaN(singleDay) ? 0 : singleDay;
  }

  return {
    minDays,
    maxDays,
    dateRange,
    hasDateInfo,
    originalString: daysString,
  };
}

/**
 * Format delivery days for different display contexts
 */
export function formatDeliveryDays(
  daysString: string,
  context: 'compact' | 'detailed' | 'admin' | 'customer' = 'detailed'
): string {
  const parsed = parseDeliveryDays(daysString);
  
  if (parsed.minDays === 0 && parsed.maxDays === 0) {
    return 'TBD';
  }

  const dayText = parsed.minDays === parsed.maxDays 
    ? `${parsed.minDays} day${parsed.minDays === 1 ? '' : 's'}`
    : `${parsed.minDays}-${parsed.maxDays} days`;

  switch (context) {
    case 'compact':
      // Ultra-short format for tight spaces
      return parsed.minDays === parsed.maxDays ? `${parsed.minDays}d` : `${parsed.minDays}-${parsed.maxDays}d`;

    case 'customer':
      // Customer-friendly with dates when available
      if (parsed.hasDateInfo && parsed.dateRange) {
        if (parsed.dateRange.startsWith('by ')) {
          return `${dayText} (${parsed.dateRange})`;
        } else {
          return `${dayText} (${parsed.dateRange})`;
        }
      }
      return dayText;

    case 'admin':
      // Admin view with full details
      if (parsed.hasDateInfo && parsed.dateRange) {
        return `${dayText} (${parsed.dateRange})`;
      }
      return `${dayText}`;

    case 'detailed':
    default:
      // Full information when space allows
      if (parsed.hasDateInfo && parsed.dateRange) {
        return `${dayText} (${parsed.dateRange})`;
      }
      return dayText;
  }
}

/**
 * Get numeric value for sorting delivery options
 */
export function getDeliveryDaysForSorting(daysString: string): number {
  const parsed = parseDeliveryDays(daysString);
  // Use minimum days for sorting (fastest first)
  return parsed.minDays;
}

/**
 * Get average days for calculations
 */
export function getAverageDeliveryDays(daysString: string): number {
  const parsed = parseDeliveryDays(daysString);
  return (parsed.minDays + parsed.maxDays) / 2;
}

/**
 * Check if delivery is express (fast)
 */
export function isExpressDelivery(daysString: string): boolean {
  const parsed = parseDeliveryDays(daysString);
  return parsed.minDays <= 3;
}

/**
 * Check if delivery is economy (slow)
 */
export function isEconomyDelivery(daysString: string): boolean {
  const parsed = parseDeliveryDays(daysString);
  return parsed.minDays > 7;
}

/**
 * Get delivery speed category
 */
export function getDeliverySpeedCategory(daysString: string): 'express' | 'standard' | 'economy' {
  const parsed = parseDeliveryDays(daysString);
  
  if (parsed.minDays <= 3) return 'express';
  if (parsed.minDays <= 7) return 'standard';
  return 'economy';
}

/**
 * Format for display in tables or lists (consistent width)
 */
export function formatDeliveryDaysTableCell(daysString: string): string {
  const parsed = parseDeliveryDays(daysString);
  
  if (parsed.minDays === 0 && parsed.maxDays === 0) {
    return 'TBD';
  }
  
  const dayText = parsed.minDays === parsed.maxDays 
    ? `${parsed.minDays} day${parsed.minDays === 1 ? '' : 's'}`
    : `${parsed.minDays}-${parsed.maxDays} days`;
    
  return dayText;
}

/**
 * Get just the date range part if available
 */
export function getDateRangeFromDeliveryDays(daysString: string): string | null {
  const parsed = parseDeliveryDays(daysString);
  return parsed.hasDateInfo ? parsed.dateRange || null : null;
}

/**
 * Legacy compatibility: extract just the day count as string
 */
export function extractDayCountString(daysString: string): string {
  const parsed = parseDeliveryDays(daysString);
  
  if (parsed.minDays === 0 && parsed.maxDays === 0) {
    return '0';
  }
  
  return parsed.minDays === parsed.maxDays 
    ? parsed.minDays.toString()
    : `${parsed.minDays}-${parsed.maxDays}`;
}