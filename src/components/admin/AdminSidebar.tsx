import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  FileText,
  Globe,
  Settings,
  Landmark,
  UserCheck,
  LayoutDashboard,
  ChevronDown,
  Route,
  Edit,
  Ticket,
  MessageSquare,
  Zap,
  Calculator,
  RotateCcw,
  Users,
  Tag,
  Mail,
  MessageCircle,
  Shield,
  Brain,
  Package,
  Database,
  LogOut,
  User,
  Menu,
  X,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel 
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import React from 'react';

// Smart grouped menu structure - reduced from 23 to 6 main categories
const menuGroups = [
  {
    title: 'Dashboard',
    items: [
      {
        title: 'Overview',
        url: '/admin',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: 'Orders & Quotes',
    items: [
      {
        title: 'All Quotes',
        url: '/admin/quotes',
        icon: FileText,
      },
      {
        title: 'Reminder Settings',
        url: '/admin/quote-reminders',
        icon: Mail,
      },
    ],
  },
  {
    title: 'Customers',
    items: [
      {
        title: 'All Customers',
        url: '/admin/customers',
        icon: UserCheck,
      },
      {
        title: 'Messages',
        url: '/messages',
        icon: MessageSquare,
      },
      {
        title: 'Support Tickets',
        url: '/admin/support-tickets',
        icon: Ticket,
      },
      {
        title: 'Email Dashboard',
        url: '/admin/emails',
        icon: Mail,
      },
      {
        title: 'SMS Center',
        url: '/admin/sms',
        icon: MessageCircle,
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        title: 'Returns Management',
        url: '/admin/returns',
        icon: RotateCcw,
      },
      {
        title: 'Auto Assignment',
        url: '/admin/auto-assignment',
        icon: Zap,
      },
      {
        title: 'Discounts & Promotions',
        url: '/admin/discounts',
        icon: Tag,
      },
      {
        title: 'Abuse Monitoring',
        url: '/admin/abuse-monitoring',
        icon: Shield,
      },
      {
        title: 'Memberships',
        url: '/admin/memberships',
        icon: Users,
      },
      {
        title: 'Blog Management',
        url: '/admin/blog',
        icon: Edit,
      },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      {
        title: 'AI Dashboard',
        url: '/admin/smart-intelligence',
        icon: Brain,
      },
      {
        title: 'Product Classifications',
        url: '/admin/product-classifications',
        icon: Package,
      },
      {
        title: 'Country Intelligence',
        url: '/admin/country-settings',
        icon: Globe,
      },
      {
        title: 'AI Settings',
        url: '/admin/intelligence-settings',
        icon: Settings,
      },
      {
        title: 'Data Management',
        url: '/admin/data-management',
        icon: Database,
      },
    ],
  },
  {
    title: 'System Settings',
    items: [
      {
        title: 'Countries & Regions',
        url: '/admin/countries',
        icon: Globe,
      },
      {
        title: 'Shipping Routes',
        url: '/admin/shipping-routes',
        icon: Route,
      },
      {
        title: 'Status Workflows',
        url: '/admin/status-management',
        icon: Settings,
      },
      {
        title: 'Bank Accounts',
        url: '/admin/bank-accounts',
        icon: Landmark,
      },
    ],
  },
];

export const AdminSidebar = () => {
  const { state } = useSidebar();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isCollapsed = state === 'collapsed';
  const [openGroups, setOpenGroups] = useState<string[]>(['Dashboard', 'Orders & Quotes']); // Keep Dashboard and Orders & Quotes open by default

  const toggleGroup = (groupTitle: string) => {
    setOpenGroups((prev) =>
      prev.includes(groupTitle) ? prev.filter((g) => g !== groupTitle) : [...prev, groupTitle],
    );
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: 'Signed out successfully',
        description: 'You have been logged out.',
        duration: 4000,
      });
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: 'Sign out failed',
        description: 'There was an issue signing you out. Please try again.',
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  const getDisplayName = () => {
    if (user?.user_metadata?.name) {
      return user.user_metadata.name;
    }
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email && !user.email.includes('@phone.iwishbag.com')) {
      return user.email.split('@')[0];
    }
    return 'Admin User';
  };

  const getAvatarUrl = () => {
    if (user?.user_metadata?.avatar_url) {
      return user.user_metadata.avatar_url;
    }
    if (user?.user_metadata?.picture) {
      return user.user_metadata.picture;
    }
    return null;
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <TooltipProvider>
      <Sidebar className="border-r bg-card" collapsible="icon">
        {/* Header with Logo and Toggle */}
        <SidebarHeader className="border-b">
          {!isCollapsed ? (
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-sm">
                  <Zap className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-bold text-lg text-foreground tracking-tight">iWishBag</h1>
                  <p className="text-xs text-muted-foreground">Admin Panel</p>
                </div>
              </div>
              <SidebarTrigger className="h-8 w-8 hover:bg-accent/60 transition-colors" />
            </div>
          ) : (
            <div className="flex flex-col items-center py-4 px-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-sm mb-3">
                    <Zap className="w-5 h-5 text-primary-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>iWishBag Admin</p>
                </TooltipContent>
              </Tooltip>
              <SidebarTrigger className="h-8 w-8 hover:bg-accent/60 transition-colors" />
            </div>
          )}
        </SidebarHeader>

        <SidebarContent className="py-4 bg-card">
        {menuGroups.map((group) => (
          <SidebarGroup key={group.title}>
            {!isCollapsed && (
              <SidebarGroupLabel className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.title}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.length === 1 ? (
                  // Single item groups don't need collapsible
                  <SidebarMenuItem key={group.items[0].title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={group.items[0].url}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                            isActive ? 'bg-accent text-accent-foreground font-medium' : ''
                          }`
                        }
                      >
                        {isCollapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center justify-center w-full">
                                {React.createElement(group.items[0].icon, {
                                  className: 'h-4 w-4 shrink-0',
                                })}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p>{group.items[0].title}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <>
                            {React.createElement(group.items[0].icon, {
                              className: 'h-4 w-4 shrink-0',
                            })}
                            <span>{group.items[0].title}</span>
                          </>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : (
                  // Multiple items - different behavior for collapsed vs expanded
                  <>
                    {isCollapsed ? (
                      // In collapsed state, show all items as individual icons
                      group.items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuButton asChild>
                                <NavLink
                                  to={item.url}
                                  className={({ isActive }) =>
                                    `flex items-center justify-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                                      isActive ? 'bg-accent text-accent-foreground font-medium' : ''
                                    }`
                                  }
                                >
                                  <div className="flex items-center justify-center w-full">
                                    {React.createElement(item.icon, {
                                      className: 'h-4 w-4 shrink-0',
                                    })}
                                  </div>
                                </NavLink>
                              </SidebarMenuButton>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p>{item.title}</p>
                            </TooltipContent>
                          </Tooltip>
                        </SidebarMenuItem>
                      ))
                    ) : (
                      // In expanded state, use collapsible groups
                      <Collapsible
                        key={group.title}
                        open={openGroups.includes(group.title)}
                        onOpenChange={() => toggleGroup(group.title)}
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-between px-4 py-2 h-auto text-sm font-normal"
                          >
                            <span className="flex items-center gap-3">
                              <BarChart3 className="h-4 w-4" />
                              {group.title}
                            </span>
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                openGroups.includes(group.title) ? 'rotate-180' : ''
                              }`}
                            />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-1">
                            {group.items.map((item) => (
                              <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild>
                                  <NavLink
                                    to={item.url}
                                    className={({ isActive }) =>
                                      `flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                                        isActive ? 'bg-accent text-accent-foreground font-medium' : ''
                                      }`
                                    }
                                  >
                                    {React.createElement(item.icon, {
                                      className: 'h-4 w-4 shrink-0',
                                    })}
                                    <span>{item.title}</span>
                                  </NavLink>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        </SidebarContent>

        {/* Footer with User Profile */}
        <SidebarFooter className="border-t p-4">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-10 h-10 p-0 rounded-full">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={getAvatarUrl()} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{getDisplayName()}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email || 'admin@iwishbag.com'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-10 h-10 p-0" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Sign Out</p>
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="space-y-3">
              {/* User Profile Section */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={getAvatarUrl()} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {getDisplayName()}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email || 'admin@iwishbag.com'}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      Profile Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* Sign Out Button */}
              <Button 
                variant="ghost" 
                className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
};
