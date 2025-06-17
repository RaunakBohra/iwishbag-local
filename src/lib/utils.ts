// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge"; // Correctly imported as twMerge

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs)); // <<< CHANGE THIS LINE: from twxMerge to twMerge
}

export function formatCurrency(amount: number, currencyCode: string = "USD") {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
}