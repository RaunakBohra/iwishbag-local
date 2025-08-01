// Customer tag utility functions

import { Customer } from '@/types/customer';

/**
 * Parse tags from comma-separated string
 */
export const parseTags = (tags: string | null | undefined): string[] => {
  if (!tags) return [];
  return tags
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
};

/**
 * Check if customer has a specific tag
 */
export const hasTag = (customer: Customer, tag: string): boolean => {
  const tags = parseTags(customer.tags);
  return tags.some(t => t.toLowerCase() === tag.toLowerCase());
};

/**
 * Check if customer is VIP (has VIP tag)
 */
export const isVIP = (customer: Customer): boolean => {
  return hasTag(customer, 'VIP');
};

/**
 * Format tags for display
 */
export const formatTags = (tags: string | null | undefined): string => {
  const parsedTags = parseTags(tags);
  return parsedTags.join(', ');
};

/**
 * Add tag to existing tags (avoiding duplicates)
 */
export const addTag = (existingTags: string | null | undefined, newTag: string): string => {
  const tags = parseTags(existingTags);
  if (!tags.some(t => t.toLowerCase() === newTag.toLowerCase())) {
    tags.push(newTag.trim());
  }
  return tags.join(', ');
};

/**
 * Remove tag from existing tags
 */
export const removeTag = (existingTags: string | null | undefined, tagToRemove: string): string => {
  const tags = parseTags(existingTags);
  const filtered = tags.filter(t => t.toLowerCase() !== tagToRemove.toLowerCase());
  return filtered.join(', ');
};