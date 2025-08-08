/**
 * AccountDropdown - Simplified account menu inspired by Shopify
 * 
 * Features:
 * - Only 5 key menu items (Dashboard, Cart, Profile, Help, Sign Out)
 * - Clean visual design with clear hierarchy
 * - Keyboard accessible
 * - Performance optimized
 */

import React, { memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard,
  ShoppingCart,
  Settings,
  HelpCircle,
  LogOut,
  User,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCartCount } from '@/stores/cartStore';
import { useToast } from '@/hooks/use-toast';

interface AccountDropdownProps {
  user: any;
  displayName: string;
  avatarUrl: string | null;
}

export const AccountDropdown = memo<AccountDropdownProps>(({ 
  user, 
  displayName, 
  avatarUrl 
}) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const cartCount = useCartCount();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: 'Signed out successfully',
        description: 'Come back soon!',
        duration: 3000,
      });
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: 'Sign out failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getInitials = () => {
    return displayName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserEmail = () => {
    if (user.email && !user.email.includes('@phone.iwishbag.com')) {
      return user.email;
    }
    if (user.phone) {
      return `Phone: ${user.phone}`;
    }
    return 'Account';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 h-9 px-2 hover:bg-gray-50 rounded-md"
        >
          {avatarUrl ? (
            <Avatar className="h-7 w-7">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="text-xs">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
          )}
          <span className="hidden sm:inline-block text-sm font-medium truncate max-w-24">
            {displayName}
          </span>
          <ChevronDown className="h-3 w-3 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-56 p-2 bg-white border shadow-lg"
      >
        {/* User Info Header */}
        <DropdownMenuLabel className="pb-2">
          <div className="flex flex-col">
            <span className="font-semibold text-gray-900">{displayName}</span>
            <span className="text-xs text-gray-500 truncate">
              {getUserEmail()}
            </span>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />

        {/* Dashboard */}
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/dashboard" className="flex items-center gap-3 px-2 py-2 rounded-md">
            <LayoutDashboard className="h-4 w-4 text-blue-600" />
            <div className="flex flex-col">
              <span className="font-medium">Dashboard</span>
              <span className="text-xs text-gray-500">Orders & quotes</span>
            </div>
          </Link>
        </DropdownMenuItem>

        {/* Cart */}
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/cart" className="flex items-center gap-3 px-2 py-2 rounded-md">
            <ShoppingCart className="h-4 w-4 text-green-600" />
            <div className="flex flex-col flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Cart</span>
                {cartCount > 0 && (
                  <Badge variant="secondary" className="text-xs h-5 px-2">
                    {cartCount}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-gray-500">
                {cartCount > 0 ? `${cartCount} item${cartCount === 1 ? '' : 's'}` : 'Empty'}
              </span>
            </div>
          </Link>
        </DropdownMenuItem>

        {/* Profile Settings */}
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/profile" className="flex items-center gap-3 px-2 py-2 rounded-md">
            <Settings className="h-4 w-4 text-gray-600" />
            <div className="flex flex-col">
              <span className="font-medium">Profile Settings</span>
              <span className="text-xs text-gray-500">Account & addresses</span>
            </div>
          </Link>
        </DropdownMenuItem>

        {/* Help & Support */}
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/support/my-tickets" className="flex items-center gap-3 px-2 py-2 rounded-md">
            <HelpCircle className="h-4 w-4 text-purple-600" />
            <div className="flex flex-col">
              <span className="font-medium">Help & Support</span>
              <span className="text-xs text-gray-500">Get assistance</span>
            </div>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Sign Out */}
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <div className="flex items-center gap-3 px-2 py-1">
            <LogOut className="h-4 w-4" />
            <span className="font-medium">Sign Out</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

AccountDropdown.displayName = 'AccountDropdown';

export default AccountDropdown;