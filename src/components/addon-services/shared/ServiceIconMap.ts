/**
 * ServiceIconMap - Shared icon mapping for addon services
 * 
 * Centralized icon definitions used across:
 * - CompactAddonServices (checkout)
 * - RegionalPricingManager (admin)
 * - Any other addon services UI components
 */

import {
  Shield,
  Zap,
  Headphones,
  Gift,
  Camera,
  Package,
} from 'lucide-react';

export const ServiceIconMap: Record<string, React.ComponentType<any>> = {
  'package_protection': Shield,
  'express_processing': Zap,
  'priority_support': Headphones,
  'gift_wrapping': Gift,
  'photo_documentation': Camera,
  // Default fallback
  'default': Package,
};

export const ServiceColors = {
  'package_protection': 'text-green-600 bg-green-50 border-green-200',
  'express_processing': 'text-blue-600 bg-blue-50 border-blue-200', 
  'priority_support': 'text-purple-600 bg-purple-50 border-purple-200',
  'gift_wrapping': 'text-pink-600 bg-pink-50 border-pink-200',
  'photo_documentation': 'text-orange-600 bg-orange-50 border-orange-200',
  // Default fallback
  'default': 'text-gray-600 bg-gray-50 border-gray-200',
};

/**
 * Get icon component for a service
 */
export function getServiceIcon(serviceKey: string): React.ComponentType<any> {
  return ServiceIconMap[serviceKey] || ServiceIconMap.default;
}

/**
 * Get color classes for a service
 */
export function getServiceColors(serviceKey: string): string {
  return ServiceColors[serviceKey as keyof typeof ServiceColors] || ServiceColors.default;
}

export default ServiceIconMap;