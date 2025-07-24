// ============================================================================
// SHIPPING OPTION UTILITIES - Common functions for handling shipping option IDs
// Handles legacy format mismatches and provides consistent option matching
// ============================================================================

/**
 * Normalize shipping option ID to handle legacy format mismatch
 * Converts: "1_delivery_dhl_standard" → "dhl_standard"
 *
 * @param id - The shipping option ID to normalize
 * @returns The normalized ID that matches shipping route delivery options
 */
export const normalizeShippingOptionId = (id: string): string => {
  if (!id) return '';

  // Handle legacy format: "1_delivery_dhl_standard" → "dhl_standard"
  if (id.includes('_delivery_')) {
    return id.split('_delivery_')[1];
  }

  return id;
};

/**
 * Find shipping option by ID with automatic normalization
 * Handles both legacy and current ID formats automatically
 *
 * @param optionId - The shipping option ID to find
 * @param shippingOptions - Array of shipping options to search in
 * @returns The matching shipping option or undefined if not found
 */
export const findShippingOptionById = <T extends { id: string }>(
  optionId: string | undefined,
  shippingOptions: T[],
): T | undefined => {
  if (!optionId || !shippingOptions?.length) return undefined;

  const normalizedId = normalizeShippingOptionId(optionId);
  return shippingOptions.find((opt) => opt.id === normalizedId);
};

/**
 * Check if a shipping option ID is in legacy format
 *
 * @param id - The shipping option ID to check
 * @returns True if the ID is in legacy format
 */
export const isLegacyShippingOptionId = (id: string): boolean => {
  return id?.includes('_delivery_') || false;
};
