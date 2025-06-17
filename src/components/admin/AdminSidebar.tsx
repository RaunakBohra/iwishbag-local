import { NavLink } from "react-router-dom";
import { BarChart3, Users, FileText, Globe, Settings, Moon, Sun, Building, Package, TrendingDown, FileCog, Landmark, UserCheck } from "lucide-react";
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

const menuItems = [
  {
    title: "Analytics",
    url: "/admin/analytics",
    icon: BarChart3,
  },
  {
    title: "Rejection Analytics",
    url: "/admin/rejection-analytics",
    icon: TrendingDown,
  },
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
];

export const AdminSidebar = () => {
  const { state } = useSidebar();
  const { theme, setTheme } = useTheme();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin Panel</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive ? "bg-accent text-accent-foreground" : ""
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Button
                    variant="ghost"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="w-full justify-start"
                  >
                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {!isCollapsed && <span>Toggle Theme</span>}
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
