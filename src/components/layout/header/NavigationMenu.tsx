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
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Package,
  Truck,
  HelpCircle,
  Search,
  FileText,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationMenuProps {
  className?: string;
}

export const NavigationMenu = memo<NavigationMenuProps>(({ className = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Navigation items configuration
  const navigationItems = [
    // Shop section
    {
      id: 'shop',
      label: 'Shop',
      icon: Package,
      items: [
        {
          label: 'Get Quote',
          path: '/quote',
          description: 'Get pricing for your products',
          showFor: 'all' // all, user, guest
        },
        {
          label: 'How It Works',
          path: '/how-it-works',
          description: 'Learn about our process',
          showFor: 'all'
        }
      ]
    },
    // Track section
    {
      id: 'track',
      label: 'Track',
      icon: Truck,
      items: [
        {
          label: 'Track Orders',
          path: '/track',
          description: 'Check your order status',
          showFor: 'all'
        },
        {
          label: 'My Orders',
          path: '/dashboard/orders',
          description: 'View order history',
          showFor: 'user'
        }
      ]
    },
    // Help section
    {
      id: 'help',
      label: 'Help',
      icon: HelpCircle,
      items: [
        {
          label: 'Help Center',
          path: '/help',
          description: 'Get answers to common questions',
          showFor: 'all'
        },
        {
          label: 'Contact Support',
          path: '/support/my-tickets',
          description: 'Get personalized help',
          showFor: 'user'
        },
        {
          label: 'Contact Us',
          path: '/contact',
          description: 'Get in touch with us',
          showFor: 'guest'
        }
      ]
    }
  ];

  const shouldShowItem = (showFor: string) => {
    if (showFor === 'all') return true;
    if (showFor === 'user') return !!user;
    if (showFor === 'guest') return !user;
    return false;
  };

  const isActiveItem = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // For now, create simple button navigation
  // Later can be enhanced with dropdown menus using shadcn NavigationMenu
  return (
    <nav className={`flex items-center space-x-1 ${className}`}>
      
      {/* Shop */}
      <Button
        variant={isActiveItem('/quote') || isActiveItem('/how-it-works') ? 'default' : 'ghost'}
        size="sm"
        className={cn(
          'h-9 px-3 font-medium transition-all',
          isActiveItem('/quote') || isActiveItem('/how-it-works')
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
        )}
        onClick={() => navigate('/quote')}
      >
        <Package className="h-4 w-4 mr-2" />
        Get Quote
      </Button>

      {/* Track */}
      <Button
        variant={isActiveItem('/track') || isActiveItem('/dashboard/orders') ? 'default' : 'ghost'}
        size="sm"
        className={cn(
          'h-9 px-3 font-medium transition-all',
          isActiveItem('/track') || isActiveItem('/dashboard/orders')
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
        )}
        onClick={() => navigate('/track')}
      >
        <Truck className="h-4 w-4 mr-2" />
        Track
      </Button>

      {/* Help */}
      <Button
        variant={isActiveItem('/help') || isActiveItem('/support') || isActiveItem('/contact') ? 'default' : 'ghost'}
        size="sm"
        className={cn(
          'h-9 px-3 font-medium transition-all',
          isActiveItem('/help') || isActiveItem('/support') || isActiveItem('/contact')
            ? 'bg-purple-600 text-white hover:bg-purple-700'
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
        )}
        onClick={() => navigate(user ? '/support/my-tickets' : '/help')}
      >
        <HelpCircle className="h-4 w-4 mr-2" />
        Help
      </Button>

      {/* Blog - Additional item for content */}
      <Button
        variant={isActiveItem('/blog') ? 'default' : 'ghost'}
        size="sm"
        className={cn(
          'h-9 px-3 font-medium transition-all',
          isActiveItem('/blog')
            ? 'bg-gray-600 text-white hover:bg-gray-700'
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
        )}
        onClick={() => navigate('/blog')}
      >
        <FileText className="h-4 w-4 mr-2" />
        Blog
      </Button>
    </nav>
  );
});

NavigationMenu.displayName = 'NavigationMenu';

export default NavigationMenu;