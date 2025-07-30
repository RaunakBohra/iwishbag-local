import { NavLink } from 'react-router-dom';
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
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import React from 'react';

// Group menu items by category
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
    title: 'Quotes',
    items: [
      {
        title: 'All Quotes',
        url: '/admin/quotes',
        icon: FileText,
      },
    ],
  },
  {
    title: 'Customer Service',
    items: [
      {
        title: 'Customers',
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
    ],
  },
  {
    title: 'Fulfillment',
    items: [
      {
        title: 'Returns',
        url: '/admin/returns',
        icon: RotateCcw,
      },
      {
        title: 'Auto Assignment',
        url: '/admin/auto-assignment',
        icon: Zap,
      },
    ],
  },
  {
    title: 'Marketing & Sales',
    items: [
      {
        title: 'Discounts',
        url: '/admin/discounts',
        icon: Tag,
      },
      {
        title: 'Memberships',
        url: '/admin/memberships',
        icon: Users,
      },
      {
        title: 'Blog',
        url: '/admin/blog',
        icon: Edit,
      },
    ],
  },
  {
    title: 'Configuration',
    items: [
      {
        title: 'Countries',
        url: '/admin/countries',
        icon: Globe,
      },
      {
        title: 'Shipping Routes',
        url: '/admin/shipping-routes',
        icon: Route,
      },
      {
        title: 'Status Workflow',
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
  const isCollapsed = state === 'collapsed';
  const [openGroups, setOpenGroups] = useState<string[]>(['Dashboard', 'Quotes']); // Keep Dashboard and Quotes open by default

  const toggleGroup = (groupTitle: string) => {
    setOpenGroups((prev) =>
      prev.includes(groupTitle) ? prev.filter((g) => g !== groupTitle) : [...prev, groupTitle],
    );
  };

  return (
    <Sidebar className="border-r bg-card">
      <SidebarContent className="py-4 bg-card">
        {menuGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {!isCollapsed && group.title}
            </SidebarGroupLabel>
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
                        {React.createElement(group.items[0].icon, {
                          className: 'h-4 w-4 shrink-0',
                        })}
                        {!isCollapsed && <span>{group.items[0].title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : (
                  // Multiple items use collapsible
                  <Collapsible
                    key={group.title}
                    open={isCollapsed ? false : openGroups.includes(group.title)}
                    onOpenChange={() => !isCollapsed && toggleGroup(group.title)}
                  >
                    {!isCollapsed && (
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
                    )}
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
                                {!isCollapsed && <span>{item.title}</span>}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
};
