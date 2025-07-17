/**
 * Convert weight between different units
 * @param weight - The weight value to convert
 * @param fromUnit - The source unit ('kg' or 'lb')
 * @param toUnit - The target unit ('kg' or 'lb')
 * @returns The converted weight value
 */
export const convertWeight = (weight: number, fromUnit: string, toUnit: string): number => {
  if (fromUnit === toUnit) return weight;

  // Use precise conversion factors
  const KG_TO_LB = 2.20462262185;
  const LB_TO_KG = 0.45359237;

  let result: number;

  if (fromUnit === 'kg' && toUnit === 'lb') {
    result = weight * KG_TO_LB;
  } else if (fromUnit === 'lb' && toUnit === 'kg') {
    result = weight * LB_TO_KG;
  } else {
    result = weight;
  }

  // Round to 6 decimal places to avoid floating-point precision issues
  return Math.round(result * 1000000) / 1000000;
};

/**
 * Get display weight information for a given weight and route unit
 * @param weight - The weight in kg (stored value)
 * @param routeWeightUnit - The route's weight unit ('kg' or 'lb')
 * @returns Object with display value, unit, and original values
 */
export const getDisplayWeight = (
  weight: number | null | undefined,
  routeWeightUnit?: string | null,
) => {
  if (!weight) return { value: 0, unit: 'kg', originalValue: 0, originalUnit: 'kg' };

  const originalUnit = 'kg'; // Input is always in kg
  const displayUnit = routeWeightUnit || originalUnit;
  const displayValue = convertWeight(weight, originalUnit, displayUnit);

  return {
    value: displayValue,
    unit: displayUnit,
    originalValue: weight,
    originalUnit: originalUnit,
  };
};

/**
 * Determine the appropriate weight unit based on country and route information
 * @param originCountry - Origin country code (e.g., 'US', 'UK')
 * @param destinationCountry - Destination country code (e.g., 'NP', 'IN')
 * @param routeWeightUnit - Weight unit from shipping route (if available)
 * @returns The appropriate weight unit ('kg' or 'lb')
 */
export const getAppropriateWeightUnit = (
  originCountry?: string | null,
  destinationCountry?: string | null,
  routeWeightUnit?: string | null,
): 'kg' | 'lb' => {
  // If route has a specific weight unit, use it
  if (routeWeightUnit) {
    return routeWeightUnit as 'kg' | 'lb';
  }

  // Countries that typically use pounds
  const lbCountries = ['US', 'UK', 'CA', 'AU', 'NZ'];

  // Check if origin or destination is a pound-using country
  if (originCountry && lbCountries.includes(originCountry.toUpperCase())) {
    return 'lb';
  }

  if (destinationCountry && lbCountries.includes(destinationCountry.toUpperCase())) {
    return 'lb';
  }

  // Default to kg for most of the world
  return 'kg';
};
