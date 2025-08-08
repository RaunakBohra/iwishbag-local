/**
 * SimpleHeader - Clean, Shopify-inspired header design
 * 
 * Features:
 * - Simplified navigation (Shop, Track, Help)
 * - Clean account menu (5 items max)
 * - Mobile-first responsive design
 * - Performance optimized with React.memo
 * - Reduced complexity from 800+ lines to ~300 lines
 */

import React, { memo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCartCount } from '@/stores/cartStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Search,
  Menu
} from 'lucide-react';

// Sub-components (will be created in subsequent phases)
import { AccountDropdown } from './header/AccountDropdown';
import { NavigationMenu } from './header/NavigationMenu'; 
import { MobileMenu } from './header/MobileMenu';

interface SimpleHeaderProps {
  className?: string;
}

export const SimpleHeader = memo<SimpleHeaderProps>(({ className = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAnonymous } = useAuth();
  const cartCount = useCartCount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Header configuration
  const homePageSettings = {
    website_logo_url: 'https://res.cloudinary.com/dto2xew5c/image/upload/v1749986458/iWishBag-india-logo_p7nram.png',
    company_name: 'iwishBag'
  };

  // Check if we're in admin area (simplified)
  const isInAdminArea = location.pathname.startsWith('/admin');

  // User display helpers
  const getDisplayName = () => {
    if (user?.user_metadata?.name) return user.user_metadata.name.split(' ')[0];
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name.split(' ')[0];
    if (user?.email && !user.email.includes('@phone.iwishbag.com')) {
      return user.email.split('@')[0];
    }
    return 'Account';
  };

  const getAvatarUrl = () => {
    return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  };

  return (
    <header className={`sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm ${className}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex h-16 items-center justify-between">
          
          {/* Left Section: Mobile Menu + Logo + Navigation */}
          <div className="flex items-center gap-4">
            
            {/* Mobile Menu Toggle - Only show for guests */}
            {(!user || isAnonymous) && (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9 hover:bg-gray-50 transition-colors"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5 text-gray-700" />
                <span className="sr-only">Open menu</span>
              </Button>
            )}

            {/* Logo */}
            <Link to="/" className="flex items-center flex-shrink-0">
              {homePageSettings.website_logo_url ? (
                <img
                  src={homePageSettings.website_logo_url}
                  alt={homePageSettings.company_name}
                  className="h-8 sm:h-10 w-auto object-contain hover:opacity-90 transition-opacity"
                />
              ) : (
                <span className="text-xl font-bold text-gray-900">
                  {homePageSettings.company_name}
                </span>
              )}
            </Link>

            {/* Desktop Navigation */}
            {!isInAdminArea && (
              <NavigationMenu className="hidden lg:flex" />
            )}
          </div>

          {/* Right Section: Search + Cart + Account */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Search (Admin only, simplified) */}
            {isInAdminArea && user && (
              <Button
                variant="ghost" 
                size="icon"
                className="h-9 w-9 hidden sm:flex"
                onClick={() => navigate('/admin/search')}
              >
                <Search className="h-4 w-4" />
                <span className="sr-only">Search</span>
              </Button>
            )}

            {/* Cart Button */}
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 hover:bg-gray-50 transition-colors"
              onClick={() => navigate('/cart')}
            >
              <ShoppingCart className="h-5 w-5 text-gray-700" />
              {cartCount > 0 && (
                <Badge 
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full text-xs font-bold flex items-center justify-center min-w-[1.25rem] px-1 bg-red-500 text-white border-2 border-white"
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </Badge>
              )}
              <span className="sr-only">Cart ({cartCount} items)</span>
            </Button>

            {/* Account Section */}
            {user && !isAnonymous ? (
              <AccountDropdown
                user={user}
                displayName={getDisplayName()}
                avatarUrl={getAvatarUrl()}
              />
            ) : (
              /* Guest Actions - Simplified */
              <Button
                variant="default"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm hover:shadow-md transition-all"
                onClick={() => navigate('/auth')}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay - Only for guests */}
      {(!user || isAnonymous) && (
        <MobileMenu
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          user={user}
          isAnonymous={isAnonymous}
          isInAdminArea={isInAdminArea}
        />
      )}
    </header>
  );
});

SimpleHeader.displayName = 'SimpleHeader';

export default SimpleHeader;