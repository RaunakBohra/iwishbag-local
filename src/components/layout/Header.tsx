import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, MessageSquare, ShoppingCart, LayoutDashboard, User, Menu, Search, Sun, Moon, MoreVertical, Building, Home, Package, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useHomePageSettings } from "@/hooks/useHomePageSettings";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { useSidebar } from "@/components/ui/sidebar";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { useTheme } from "next-themes";
import { useState } from "react";

const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleSidebar } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const { data: hasAdminRole } = useAdminRole();
  const { settings: homePageSettings } = useHomePageSettings();

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

  const { data: approvedQuotesCount } = useQuery({
    queryKey: ['approved-quotes-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('approval_status', 'approved');
      
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
    navigate("/");
  };

  const getDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Customer';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex h-16 items-center justify-between max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Left Section - Logo and Navigation */}
        <div className="flex items-center space-x-4 md:space-x-6 lg:space-x-8 min-w-0 flex-1">
          {/* Mobile menu toggle for admin area */}
          {isAdminArea && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden hover:bg-accent flex-shrink-0 h-9 w-9"
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
                className="h-8 sm:h-9 w-auto object-contain transition-transform hover:scale-105" 
              />
            ) : (
              <span className="font-bold text-lg sm:text-xl lg:text-2xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {homePageSettings?.company_name || "WishBag"}
              </span>
            )}
          </Link>

          {/* Desktop Navigation - Only show for authenticated users */}
          {user && !isAdminArea && (
            <nav className="hidden md:flex items-center space-x-2 lg:space-x-3">
              <Button
                variant={location.pathname === '/quote' ? "default" : "ghost"}
                size="sm"
                className="h-8 px-3 text-sm font-medium"
                onClick={() => navigate('/quote')}
              >
                <Package className="h-4 w-4 mr-2" />
                Get Quote
              </Button>
              <Button
                variant={location.pathname === '/quote-auto' ? "default" : "ghost"}
                size="sm"
                className="h-8 px-3 text-sm font-medium"
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
                variant={location.pathname.includes('/admin/quotes') ? "default" : "ghost"}
                size="sm"
                className="h-8 px-3 text-sm font-medium"
                onClick={() => navigate('/admin/quotes')}
              >
                <Package className="h-4 w-4 mr-2" />
                Quotes
              </Button>
              <Button
                variant={location.pathname.includes('/admin/orders') ? "default" : "ghost"}
                size="sm"
                className="h-8 px-3 text-sm font-medium"
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
          
          {user ? (
            <div className="flex items-center space-x-2 md:space-x-3 lg:space-x-4">
              {/* Desktop View - Show all actions */}
              <div className="hidden sm:flex items-center space-x-1 md:space-x-2 lg:space-x-3">
                <CartDrawer />
                
                {/* Messages with improved badge */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative hover:bg-accent flex-shrink-0 h-9 w-9 transition-colors" 
                  onClick={() => navigate('/messages')}
                >
                  <MessageSquare className="h-4 w-4" />
                  {unreadMessagesCount && unreadMessagesCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0 rounded-full text-xs font-medium animate-pulse"
                    >
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </Badge>
                  )}
                </Button>

                {/* Theme toggle for admin users */}
                {hasAdminRole && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="hover:bg-accent flex-shrink-0 h-9 w-9 transition-colors"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              )}
              
                {/* Separator */}
                <div className="h-6 w-px bg-border mx-1 md:mx-2 lg:mx-3" />
              </div>

              {/* Mobile View - Only show Cart and More menu */}
              <div className="flex sm:hidden items-center space-x-1">
                <CartDrawer />
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative hover:bg-accent flex-shrink-0 h-9 w-9">
                      <MoreVertical className="h-4 w-4" />
                      {unreadMessagesCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-2 w-2 p-0 rounded-full" />
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
                        {hasAdminRole && (
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => {
                              navigate('/admin');
                              setIsSheetOpen(false);
                            }}
                          >
                            <Building className="h-4 w-4 mr-2" />
                            Admin Dashboard
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => {
                            navigate('/profile');
                            setIsSheetOpen(false);
                          }}
                        >
                          <User className="h-4 w-4 mr-2" />
                          Profile Settings
                        </Button>
                        {hasAdminRole && (
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                          >
                            {theme === "dark" ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                            {theme === "dark" ? "Light Mode" : "Dark Mode"}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          className="w-full justify-start text-destructive"
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
                      className="px-2 md:px-3 py-2 text-left hover:bg-accent min-w-0 h-9 rounded-md transition-colors"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-3 w-3 text-primary" />
                        </div>
                        <div className="flex flex-col items-start min-w-0">
                          <span className="text-sm font-medium truncate">{getDisplayName()}</span>
                          <span className="text-xs text-muted-foreground truncate hidden lg:block">
                            {user.email}
                          </span>
                        </div>
                      </div>
                  </Button>
                </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60 md:w-64 p-2">
                    <DropdownMenuLabel className="font-semibold">My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="cursor-pointer rounded-md">
                      <Link to="/dashboard" className="flex items-center w-full">
                        <LayoutDashboard className="mr-3 h-4 w-4" />
                        <div className="flex flex-col">
                          <span className="font-medium">Dashboard</span>
                          <span className="text-xs text-muted-foreground">View your quotes and orders</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer rounded-md">
                      <Link to="/profile" className="flex items-center w-full">
                        <Settings className="mr-3 h-4 w-4" />
                        <div className="flex flex-col">
                          <span className="font-medium">Profile Settings</span>
                          <span className="text-xs text-muted-foreground">Manage your account</span>
                        </div>
                    </Link>
                  </DropdownMenuItem>
                    {hasAdminRole && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild className="cursor-pointer rounded-md">
                          <Link to="/admin" className="flex items-center w-full">
                            <Building className="mr-3 h-4 w-4" />
                            <div className="flex flex-col">
                              <span className="font-medium">Admin Dashboard</span>
                              <span className="text-xs text-muted-foreground">Manage the platform</span>
                            </div>
                    </Link>
                  </DropdownMenuItem>
                      </>
                    )}
                  <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleSignOut} 
                      className="cursor-pointer rounded-md text-destructive focus:text-destructive"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      <div className="flex flex-col">
                        <span className="font-medium">Sign Out</span>
                        <span className="text-xs text-muted-foreground">End your session</span>
                      </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            </div>
          ) : (
            /* Guest User Actions - Enhanced styling */
            <div className="flex items-center space-x-2 md:space-x-3">
              <Button 
                asChild 
                variant="ghost" 
                size="sm"
                className="hidden sm:inline-flex h-8 px-3 md:px-4 text-sm font-medium hover:bg-accent"
              >
                <Link to="/quote">Get Quote</Link>
              </Button>
              <Button 
                asChild 
                variant="default"
                size="sm"
                className="h-8 px-3 md:px-4 text-sm font-medium"
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
