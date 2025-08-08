/**
 * NavigationMenu - Clean desktop navigation inspired by Shopify
 * 
 * Features:
 * - Simplified navigation: Shop, Track, Help
 * - Uses shadcn NavigationMenu for accessibility
 * - Clean visual design with hover states
 * - Progressive disclosure based on user authentication
 */

import React, { memo } from 'react';
// Imports removed as navigation buttons have been simplified

interface NavigationMenuProps {
  className?: string;
}

export const NavigationMenu = memo<NavigationMenuProps>(({ className = '' }) => {

  // Simplified navigation - no buttons in header for cleaner design
  return (
    <nav className={`flex items-center space-x-1 ${className}`}>
      {/* Navigation buttons removed for cleaner header design */}
      {/* Users can access these features through:
          - Get Quote: via CTA buttons on homepage or mobile menu
          - Track: via mobile menu or direct URL
          - Help: via mobile menu or footer
          - Blog: via mobile menu or footer
      */}
    </nav>
  );
});

NavigationMenu.displayName = 'NavigationMenu';

export default NavigationMenu;