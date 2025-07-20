import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  LogOut,
  MessageSquare,
  ShoppingCart,
  LayoutDashboard,
  User,
  Menu,
  MoreVertical,
  Building,
  Home,
  Package,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { useAdminRole } from '@/hooks/useAdminRole';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { useSidebar } from '@/hooks/use-sidebar';
import { AdminSearch } from '@/components/admin/AdminSearch';
import { useState } from 'react';
import { cn } from '@/lib/design-system';

const Header = () => {
  const { user, signOut, isAnonymous } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleSidebar } = useSidebar();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const { data: hasAdminRole } = useAdminRole();

  // Default homepage settings
  const homePageSettings = {
    website_logo_url: 'https://res.cloudinary.com/dto2xew5c/image/upload/v1749986458/iWishBag-india-logo_p7nram.png',
    company_name: 'iwishBag',
  };

  // Check if we're in admin area
  const isAdminArea = location.pathname.startsWith('/admin');

  const { data: unreadMessagesCount } = useQuery({
    queryKey: ['unreadMessagesCount', user?.id, hasAdminRole],
    queryFn: async () => {
      if (!user) return 0;
      let query = supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', user.id);
      if (hasAdminRole) {
        query = query.is('recipient_id', null);
      } else {
        query = query.eq('recipient_id', user.id);
      }
      const { count, error } = await query;
      if (error) {
        console.error('Error fetching unread messages count:', error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  const { data: _approvedQuotesCount } = useQuery({
    queryKey: ['approved-quotes-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'approved');

      if (error) {
        console.error('Error fetching approved quotes count:', error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getDisplayName = () => {
    // Check for name in user metadata (from sign-up)
    if (user?.user_metadata?.name) {
      return user.user_metadata.name;
    }
    // Check for full_name (from OAuth providers like Google)
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    // Fallback to email prefix
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Customer';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container flex h-16 items-center justify-between max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Left Section - Logo and Navigation */}
        <div className="flex items-center space-x-4 md:space-x-6 lg:space-x-8 min-w-0 flex-1">
          {/* Mobile menu toggle for admin area */}
          {isAdminArea && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden hover:bg-gray-50 flex-shrink-0 h-9 w-9 transition-colors"
              onClick={toggleSidebar}
            >
              <Menu className="h-4 w-4" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          )}

          {/* Logo */}
          <Link to="/" className="flex items-center min-w-0 flex-shrink-0">
            {homePageSettings?.website_logo_url ? (
              <img
                src={homePageSettings.website_logo_url}
                alt="Logo"
                className="h-10 sm:h-12 w-auto object-contain transition-transform hover:scale-105"
              />
            ) : (
              <span className="font-semibold text-lg sm:text-xl lg:text-2xl text-gray-900">
                {homePageSettings?.company_name || 'WishBag'}
              </span>
            )}
          </Link>

          {/* Desktop Navigation - Only show for authenticated users */}
          {user && !isAdminArea && (
            <nav className="hidden md:flex items-center space-x-2 lg:space-x-3">
              <Button
                variant={location.pathname === '/quote' ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  "h-8 px-3 text-sm font-medium transition-colors",
                  location.pathname === '/quote' 
                    ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600" 
                    : "text-gray-700 hover:bg-gray-50"
                )}
                onClick={() => navigate('/quote')}
              >
                <Package className="h-4 w-4 mr-2" />
                Get Quote
              </Button>
              <Button
                variant={location.pathname === '/quote-auto' ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  "h-8 px-3 text-sm font-medium transition-colors",
                  location.pathname === '/quote-auto' 
                    ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600" 
                    : "text-gray-700 hover:bg-gray-50"
                )}
                onClick={() => navigate('/quote-auto')}
              >
                <Package className="h-4 w-4 mr-2" />
                Instant Quote
              </Button>
            </nav>
          )}

          {/* Admin Navigation */}
          {user && isAdminArea && (
            <nav className="hidden md:flex items-center space-x-2 lg:space-x-3">
              <Button
                variant={location.pathname.includes('/admin/quotes') ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  "h-8 px-3 text-sm font-medium transition-colors",
                  location.pathname.includes('/admin/quotes') 
                    ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600" 
                    : "text-gray-700 hover:bg-gray-50"
                )}
                onClick={() => navigate('/admin/quotes')}
              >
                <Package className="h-4 w-4 mr-2" />
                Quotes
              </Button>
              <Button
                variant={location.pathname.includes('/admin/orders') ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  "h-8 px-3 text-sm font-medium transition-colors",
                  location.pathname.includes('/admin/orders') 
                    ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600" 
                    : "text-gray-700 hover:bg-gray-50"
                )}
                onClick={() => navigate('/admin/orders')}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Orders
              </Button>
            </nav>
          )}
        </div>

        {/* Right Section - Actions and User Menu */}
        <div className="flex items-center space-x-2 md:space-x-3 lg:space-x-4 min-w-0">
          {/* Admin Search - only show in admin area */}
          {isAdminArea && (
            <div className="hidden sm:block">
              <AdminSearch />
            </div>
          )}

          {user && !isAnonymous ? (
            <div className="flex items-center space-x-2 md:space-x-3 lg:space-x-4">
              {/* Desktop View - Show all actions */}
              <div className="hidden sm:flex items-center space-x-1 md:space-x-2 lg:space-x-3">
                <CartDrawer />

                {/* Messages with improved badge */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative hover:bg-gray-50 flex-shrink-0 h-9 w-9 transition-colors"
                  onClick={() => navigate('/messages')}
                >
                  <MessageSquare className="h-4 w-4" />
                  {unreadMessagesCount && unreadMessagesCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0 rounded-full text-xs font-medium bg-red-500 text-white border-2 border-white"
                    >
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </Badge>
                  )}
                </Button>

                {/* Separator */}
                <div className="h-6 w-px bg-gray-200 mx-1 md:mx-2 lg:mx-3" />
              </div>

              {/* Mobile View - Only show Cart and More menu */}
              <div className="flex sm:hidden items-center space-x-1">
                <CartDrawer />
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative hover:bg-gray-50 flex-shrink-0 h-9 w-9 transition-colors"
                    >
                      <MoreVertical className="h-4 w-4" />
                      {unreadMessagesCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-1 -right-1 h-2 w-2 p-0 rounded-full bg-red-500"
                        />
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[80vh]">
                    <SheetHeader>
                      <SheetTitle>Menu</SheetTitle>
                    </SheetHeader>
                    <div className="py-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          variant="outline"
                          className="flex flex-col items-center justify-center h-24"
                          onClick={() => {
                            navigate('/dashboard');
                            setIsSheetOpen(false);
                          }}
                        >
                          <LayoutDashboard className="h-6 w-6 mb-2" />
                          <span className="text-sm">Dashboard</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="flex flex-col items-center justify-center h-24 relative"
                          onClick={() => {
                            navigate('/messages');
                            setIsSheetOpen(false);
                          }}
                        >
                          <MessageSquare className="h-6 w-6 mb-2" />
                          <span className="text-sm">Messages</span>
                          {unreadMessagesCount > 0 && (
                            <Badge variant="destructive" className="absolute top-2 right-2">
                              {unreadMessagesCount}
                            </Badge>
                          )}
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {/* Account Section */}
                        <div className="mb-1 mt-2 text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                          Account
                        </div>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => {
                            navigate('/profile');
                            setIsSheetOpen(false);
                          }}
                        >
                          <Settings className="mr-3 h-4 w-4" />
                          <div className="flex flex-col items-start">
                            <span className="font-medium">Profile Settings</span>
                          </div>
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => {
                            navigate('/profile/address');
                            setIsSheetOpen(false);
                          }}
                        >
                          <Home className="mr-3 h-4 w-4" />
                          <div className="flex flex-col items-start">
                            <span className="font-medium">Shipping Address</span>
                          </div>
                        </Button>
                        <div className="border-t border-gray-200 my-3" />
                        {/* Orders & Quotes Section */}
                        <div className="mb-1 text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                          Orders & Quotes
                        </div>
                        <Button
                          variant="default"
                          className="w-full justify-start"
                          onClick={() => {
                            navigate('/dashboard');
                            setIsSheetOpen(false);
                          }}
                        >
                          <LayoutDashboard className="mr-3 h-4 w-4" />
                          <div className="flex flex-col items-start">
                            <span className="font-medium">Dashboard</span>
                          </div>
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start relative"
                          onClick={() => {
                            navigate('/messages');
                            setIsSheetOpen(false);
                          }}
                        >
                          <MessageSquare className="mr-3 h-4 w-4" />
                          <div className="flex flex-col items-start">
                            <span className="font-medium">Messages</span>
                          </div>
                          {unreadMessagesCount > 0 && (
                            <Badge variant="destructive" className="absolute top-2 right-2">
                              {unreadMessagesCount}
                            </Badge>
                          )}
                        </Button>
                        {/* Admin Section */}
                        {hasAdminRole && (
                          <>
                            <div className="border-t border-gray-200 my-3" />
                            <div className="mb-1 text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                              Admin
                            </div>
                            <Button
                              variant="outline"
                              className="w-full justify-start"
                              onClick={() => {
                                navigate('/admin');
                                setIsSheetOpen(false);
                              }}
                            >
                              <Building className="mr-3 h-4 w-4" />
                              <div className="flex flex-col items-start">
                                <span className="font-medium">Admin Dashboard</span>
                              </div>
                            </Button>
                          </>
                        )}
                        <div className="border-t border-gray-200 my-3" />
                        {/* Information Section */}
                        <div className="mb-1 text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                          Information
                        </div>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => {
                            navigate('/blog');
                            setIsSheetOpen(false);
                          }}
                        >
                          <MessageSquare className="mr-3 h-4 w-4" />
                          <div className="flex flex-col items-start">
                            <span className="font-medium">Blog</span>
                          </div>
                        </Button>
                        <div className="border-t border-gray-200 my-3" />
                        {/* Settings Section */}
                        <div className="mb-1 text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                          Settings
                        </div>
                        {/* Sign Out at the bottom */}
                        <div className="border-t border-gray-200 my-3" />
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-destructive font-semibold"
                          onClick={() => {
                            handleSignOut();
                            setIsSheetOpen(false);
                          }}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Desktop User Menu - Enhanced with better styling */}
              <div className="hidden sm:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="px-2 md:px-3 py-2 text-left hover:bg-gray-50 min-w-0 h-9 rounded-md transition-colors"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="h-6 w-6 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                          <User className="h-3 w-3 text-teal-600" />
                        </div>
                        <div className="flex flex-col items-start min-w-0">
                          <span className="text-sm font-medium truncate text-gray-900">{getDisplayName()}</span>
                          <span className="text-xs text-gray-500 truncate hidden lg:block">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60 md:w-64 p-2 bg-white border border-gray-200 shadow-lg">
                    <DropdownMenuLabel className="font-semibold text-gray-900">My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="cursor-pointer rounded-md hover:bg-gray-50">
                      <Link to="/dashboard" className="flex items-center w-full">
                        <LayoutDashboard className="mr-3 h-4 w-4" />
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">Dashboard</span>
                          <span className="text-xs text-gray-500">
                            View your quotes and orders
                          </span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer rounded-md hover:bg-gray-50">
                      <Link to="/profile" className="flex items-center w-full">
                        <Settings className="mr-3 h-4 w-4" />
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">Profile Settings</span>
                          <span className="text-xs text-gray-500">Manage your account</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer rounded-md hover:bg-gray-50">
                      <Link to="/profile/address" className="flex items-center w-full">
                        <Home className="mr-3 h-4 w-4" />
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">Shipping Address</span>
                          <span className="text-xs text-gray-500">
                            Manage your shipping addresses
                          </span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer rounded-md hover:bg-gray-50">
                      <Link to="/blog" className="flex items-center w-full">
                        <MessageSquare className="mr-3 h-4 w-4" />
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">Blog</span>
                          <span className="text-xs text-gray-500">Tips and guides</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    {hasAdminRole && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild className="cursor-pointer rounded-md hover:bg-gray-50">
                          <Link to="/admin" className="flex items-center w-full">
                            <Building className="mr-3 h-4 w-4" />
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">Admin Dashboard</span>
                              <span className="text-xs text-gray-500">
                                Manage the platform
                              </span>
                            </div>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="cursor-pointer rounded-md text-red-600 focus:text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      <div className="flex flex-col">
                        <span className="font-medium">Sign Out</span>
                        <span className="text-xs text-red-500">End your session</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ) : (
            /* Anonymous/Guest User Actions - Enhanced styling */
            <div className="flex items-center space-x-2 md:space-x-3">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex h-8 px-3 md:px-4 text-sm font-medium hover:bg-gray-50 text-gray-700"
              >
                <Link to="/blog">Blog</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex h-8 px-3 md:px-4 text-sm font-medium hover:bg-gray-50 text-gray-700"
              >
                <Link to="/quote">Get Quote</Link>
              </Button>
              <Button
                asChild
                variant="default"
                size="sm"
                className="h-8 px-3 md:px-4 text-sm font-medium bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600"
              >
                <Link to="/auth">Sign In</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
