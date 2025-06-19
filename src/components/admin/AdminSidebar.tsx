import { NavLink } from "react-router-dom";
import { BarChart3, Users, FileText, Globe, Settings, Moon, Sun, Building, Package, TrendingDown, FileCog, Landmark, UserCheck, LayoutDashboard, ShoppingCart, Mail, BookText, ChevronDown } from "lucide-react";
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
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import React from "react";

// Group menu items by category
const menuGroups = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/admin",
        icon: LayoutDashboard,
      },
    ]
  },
  {
    title: "Analytics",
    items: [
      {
        title: "Cart Analytics",
        url: "/admin/cart-analytics",
        icon: ShoppingCart,
      },
      {
        title: "Cart Recovery",
        url: "/admin/cart-recovery",
        icon: Mail,
      },
      {
        title: "Rejection Analytics",
        url: "/admin/rejection-analytics",
        icon: TrendingDown,
      },
    ]
  },
  {
    title: "Management",
    items: [
      {
        title: "Quote Management",
        url: "/admin/quotes",
        icon: FileText,
      },
      {
        title: "Order Management",
        url: "/admin/orders",
        icon: Package,
      },
      {
        title: "Customer Management",
        url: "/admin/customers",
        icon: UserCheck,
      },
    ]
  },
  {
    title: "Settings",
    items: [
      {
        title: "Email Templates",
        url: "/admin/email-templates",
        icon: BookText,
      },
      {
        title: "Quote Templates",
        url: "/admin/templates",
        icon: FileCog,
      },
      {
        title: "Country Settings",
        url: "/admin/countries",
        icon: Globe,
      },
      {
        title: "Customs Categories",
        url: "/admin/customs",
        icon: Settings,
      },
      {
        title: "Bank Accounts",
        url: "/admin/bank-accounts",
        icon: Landmark,
      },
      {
        title: "User Roles",
        url: "/admin/users",
        icon: Users,
      },
      {
        title: "Home Page Settings",
        url: "/admin/footer",
        icon: Building,
      },
    ]
  },
];

export const AdminSidebar = () => {
  const { state } = useSidebar();
  const { theme, setTheme } = useTheme();
  const isCollapsed = state === "collapsed";
  const [openGroups, setOpenGroups] = useState<string[]>(['Overview']); // Keep Overview open by default

  const toggleGroup = (groupTitle: string) => {
    setOpenGroups(prev => 
      prev.includes(groupTitle) 
        ? prev.filter(g => g !== groupTitle)
        : [...prev, groupTitle]
    );
  };

  return (
    <Sidebar className="border-r">
      <SidebarContent className="py-4">
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
                            isActive ? "bg-accent text-accent-foreground font-medium" : ""
                          }`
                        }
                      >
                        {React.createElement(group.items[0].icon, { className: "h-4 w-4 shrink-0" })}
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
                          <ChevronDown className={`h-4 w-4 transition-transform ${
                            openGroups.includes(group.title) ? "rotate-180" : ""
                          }`} />
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
                                    isActive ? "bg-accent text-accent-foreground font-medium" : ""
                                  }`
                                }
                              >
                                {React.createElement(item.icon, { className: "h-4 w-4 shrink-0" })}
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
        
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Button
                    variant="ghost"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="w-full justify-start px-4 py-2"
                  >
                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {!isCollapsed && <span className="ml-3">Toggle Theme</span>}
                  </Button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
