/**
 * MobileMenu - Clean slide-out mobile navigation
 * 
 * Features:
 * - Slide-in animation from left
 * - Simplified navigation structure
 * - Account section at bottom
 * - Clean visual design
 * - Accessibility focused
 */

import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Package,
  Truck,
  HelpCircle,
  LayoutDashboard,
  ShoppingCart,
  Settings,
  LogOut,
  User,
  FileText,
  MessageSquare,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCartCount } from '@/stores/cartStore';
import { useToast } from '@/hooks/use-toast';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  isAnonymous: boolean;
  isInAdminArea: boolean;
}

export const MobileMenu = memo<MobileMenuProps>(({ 
  isOpen, 
  onClose, 
  user, 
  isAnonymous, 
  isInAdminArea 
}) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const cartCount = useCartCount();

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: 'Signed out successfully',
        description: 'Come back soon!',
        duration: 3000,
      });
      onClose();
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

  const getUserDisplayName = () => {
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

  const getInitials = () => {
    const name = getUserDisplayName();
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-80 p-0 bg-white">
        <div className="flex flex-col h-full">
          
          {/* Header */}
          <SheetHeader className="p-6 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-semibold text-gray-900">
                Menu
              </SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </SheetHeader>

          {/* Navigation Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              
              {/* Main Navigation */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Navigation
                </h3>
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 px-4"
                    onClick={() => handleNavigate('/quote')}
                  >
                    <Package className="h-5 w-5 mr-3 text-blue-600" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Get Quote</span>
                      <span className="text-xs text-gray-500">Price your products</span>
                    </div>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 px-4"
                    onClick={() => handleNavigate('/track')}
                  >
                    <Truck className="h-5 w-5 mr-3 text-green-600" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Track Orders</span>
                      <span className="text-xs text-gray-500">Check order status</span>
                    </div>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 px-4"
                    onClick={() => handleNavigate(user ? '/support/my-tickets' : '/help')}
                  >
                    <HelpCircle className="h-5 w-5 mr-3 text-purple-600" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Help & Support</span>
                      <span className="text-xs text-gray-500">Get assistance</span>
                    </div>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 px-4"
                    onClick={() => handleNavigate('/blog')}
                  >
                    <FileText className="h-5 w-5 mr-3 text-gray-600" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Blog</span>
                      <span className="text-xs text-gray-500">Tips & guides</span>
                    </div>
                  </Button>
                </div>
              </div>

              {/* User Section */}
              {user && !isAnonymous && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Your Account
                    </h3>
                    <div className="space-y-1">
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-12 px-4"
                        onClick={() => handleNavigate('/dashboard')}
                      >
                        <LayoutDashboard className="h-5 w-5 mr-3 text-blue-600" />
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Dashboard</span>
                          <span className="text-xs text-gray-500">Orders & quotes</span>
                        </div>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-12 px-4"
                        onClick={() => handleNavigate('/cart')}
                      >
                        <ShoppingCart className="h-5 w-5 mr-3 text-green-600" />
                        <div className="flex flex-col items-start flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Cart</span>
                            {cartCount > 0 && (
                              <Badge variant="secondary" className="text-xs h-5">
                                {cartCount}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {cartCount > 0 ? `${cartCount} item${cartCount === 1 ? '' : 's'}` : 'Empty'}
                          </span>
                        </div>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-12 px-4"
                        onClick={() => handleNavigate('/profile')}
                      >
                        <Settings className="h-5 w-5 mr-3 text-gray-600" />
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Profile Settings</span>
                          <span className="text-xs text-gray-500">Account & addresses</span>
                        </div>
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Guest Actions */}
              {(!user || isAnonymous) && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full h-12"
                      onClick={() => handleNavigate('/help')}
                    >
                      <HelpCircle className="h-5 w-5 mr-2" />
                      Get Help
                    </Button>
                    <Button
                      variant="default"
                      className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleNavigate('/auth')}
                    >
                      Sign In / Register
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* User Footer */}
          {user && !isAnonymous && (
            <div className="border-t p-6 bg-gray-50">
              <div className="flex items-center gap-3 mb-4">
                {getAvatarUrl() ? (
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={getAvatarUrl()} alt={getUserDisplayName()} />
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {getUserDisplayName()}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {user.email && !user.email.includes('@phone.iwishbag.com') 
                      ? user.email 
                      : user.phone ? `Phone: ${user.phone}` : 'Account'
                    }
                  </p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleSignOut}
              >
                <LogOut className="h-5 w-5 mr-2" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
});

MobileMenu.displayName = 'MobileMenu';

export default MobileMenu;