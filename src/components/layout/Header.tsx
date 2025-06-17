import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Bell, MessageSquare, ShoppingCart, LayoutDashboard, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useHomePageSettings } from "@/hooks/useHomePageSettings";

const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: hasAdminRole } = useAdminRole();
  const { formData: homePageSettings } = useHomePageSettings();

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
    <header className="border-b border-black/10 bg-[#00c3cf]" style={{ color: '#052a2e' }}>
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/" className="flex items-center">
            {homePageSettings?.website_logo_url ? (
              <img src={homePageSettings.website_logo_url} alt="Logo" className="h-10 w-auto object-contain" />
            ) : (
              <span className="font-bold text-xl text-[#052a2e]">{homePageSettings?.company_name || "WishBag"}</span>
            )}
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button variant="ghost" size="icon" className="relative text-[#052a2e] hover:bg-black/10" onClick={() => navigate('/cart')}>
                <ShoppingCart className="h-5 w-5" />
                {approvedQuotesCount && approvedQuotesCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0 rounded-full text-xs">
                    {approvedQuotesCount}
                  </Badge>
                )}
                <span className="sr-only">Cart</span>
              </Button>
              <Button variant="ghost" size="icon" className="relative text-[#052a2e] hover:bg-black/10" onClick={() => navigate('/notifications')}>
                <Bell className="h-5 w-5" />
                {unreadNotificationsCount && unreadNotificationsCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0 rounded-full text-xs">
                    {unreadNotificationsCount}
                  </Badge>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
              <Button variant="ghost" size="icon" className="relative text-[#052a2e] hover:bg-black/10" onClick={() => navigate('/messages')}>
                <MessageSquare className="h-5 w-5" />
                 {unreadMessagesCount && unreadMessagesCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0 rounded-full text-xs">
                    {unreadMessagesCount}
                  </Badge>
                )}
                <span className="sr-only">Messages</span>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="px-2 sm:px-4 text-left text-[#052a2e] hover:bg-black/10">
                    <span className="hidden sm:inline">Hello, </span>{getDisplayName()}
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
          ) : (
            <>
              <Button asChild variant="secondary">
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
