import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Bell, MessageSquare, ShoppingCart, LayoutDashboard, User, Menu, Search, Sun, Moon, MoreVertical, Building } from "lucide-react";
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
  const { formData: homePageSettings } = useHomePageSettings();

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

  const { data: unreadNotificationsCount } = useQuery({
      queryKey: ['unreadNotificationsCount', user?.id],
      queryFn: async () => {
          if (!user) return 0;
          const { count, error } = await supabase
              .from('notifications')
              .select('*', { count: 'exact', head: true })
              .eq('is_read', false)
              .eq('user_id', user.id);
          if (error) {
              console.error('Error fetching unread notifications count:', error);
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
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 w-full">
      <div className="container flex h-16 items-center justify-between max-w-full px-3 sm:px-4 lg:px-6">
        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
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
          
          <Link to="/" className="flex items-center min-w-0 flex-1">
            {homePageSettings?.website_logo_url ? (
              <img src={homePageSettings.website_logo_url} alt="Logo" className="h-8 sm:h-10 w-auto object-contain" />
            ) : (
              <span className="font-bold text-lg sm:text-xl truncate">{homePageSettings?.company_name || "WishBag"}</span>
            )}
          </Link>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 min-w-0">
          {/* Admin Search - only show in admin area */}
          {isAdminArea && (
            <>
              <div className="hidden sm:block">
                <AdminSearch />
              </div>
              <div className="sm:hidden">
                <AdminSearch />
              </div>
            </>
          )}
          
          {user ? (
            <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-3">
              {/* Desktop View */}
              <div className="hidden sm:flex items-center space-x-2">
                <CartDrawer />
                <Button variant="ghost" size="icon" className="relative hover:bg-accent flex-shrink-0 h-9 w-9" onClick={() => navigate('/notifications')}>
                  <Bell className="h-4 w-4" />
                  {unreadNotificationsCount && unreadNotificationsCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0 rounded-full text-xs">
                      {unreadNotificationsCount}
                    </Badge>
                  )}
                </Button>
                <Button variant="ghost" size="icon" className="relative hover:bg-accent flex-shrink-0 h-9 w-9" onClick={() => navigate('/messages')}>
                  <MessageSquare className="h-4 w-4" />
                  {unreadMessagesCount && unreadMessagesCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0 rounded-full text-xs">
                      {unreadMessagesCount}
                    </Badge>
                  )}
                </Button>
                {hasAdminRole && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="hover:bg-accent flex-shrink-0 h-9 w-9"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  >
                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                )}
              </div>

              {/* Mobile View - Only show Cart and More menu */}
              <div className="flex sm:hidden items-center space-x-1">
                <CartDrawer />
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative hover:bg-accent flex-shrink-0 h-9 w-9">
                      <MoreVertical className="h-4 w-4" />
                      {(unreadNotificationsCount > 0 || unreadMessagesCount > 0) && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-2 w-2 p-0 rounded-full" />
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[80vh]">
                    <SheetHeader>
                      <SheetTitle>Menu</SheetTitle>
                    </SheetHeader>
                    <div className="py-6 space-y-4">
                      <div className="grid grid-cols-3 gap-4">
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
                        <Button
                          variant="outline"
                          className="flex flex-col items-center justify-center h-24 relative"
                          onClick={() => {
                            navigate('/notifications');
                            setIsSheetOpen(false);
                          }}
                        >
                          <Bell className="h-6 w-6 mb-2" />
                          <span className="text-sm">Notifications</span>
                          {unreadNotificationsCount > 0 && (
                            <Badge variant="destructive" className="absolute top-2 right-2">
                              {unreadNotificationsCount}
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

              {/* Desktop User Menu */}
              <div className="hidden sm:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="px-2 sm:px-3 text-left hover:bg-accent min-w-0 h-9">
                      <span className="hidden lg:inline">Hello, </span>
                      <span className="truncate text-sm sm:text-base">{getDisplayName()}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="flex items-center cursor-pointer w-full">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center cursor-pointer w-full">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                      <LogOut className="h-4 w-4 mr-2" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ) : (
            <>
              <Button asChild variant="secondary" className="hidden sm:inline-flex">
                <Link to="/quote">Get Quote</Link>
              </Button>
              <Button asChild variant="destructive">
                <Link to="/auth">Sign In</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
