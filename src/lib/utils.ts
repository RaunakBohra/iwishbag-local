// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge'; // Correctly imported as twMerge

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs)); // <<< CHANGE THIS LINE: from twxMerge to twMerge
}

export function formatCurrency(amount: number, currencyCode: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,  // Consistent with admin rounding
  }).format(amount);
}

/**
 * Safely parse JSON data that might be a string or already an object
 */
export function safeJsonParse<T = Record<string, unknown>>(
  data: unknown,
  defaultValue: T = {} as T,
): T {
  if (!data) return defaultValue;

  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (error) {
      console.warn('Failed to parse JSON string:', error);
      return defaultValue;
    }
  }

  if (typeof data === 'object') {
    return data;
  }

  return defaultValue;
}
