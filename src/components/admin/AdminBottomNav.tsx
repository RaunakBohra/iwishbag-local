import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  Package, 
  Users, 
  ShoppingCart,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin",
  },
  {
    title: "Quotes",
    icon: FileText,
    href: "/admin/quotes",
  },
  {
    title: "Orders",
    icon: Package,
    href: "/admin/orders",
  },
  {
    title: "Customers",
    icon: Users,
    href: "/admin/customers",
  },
  {
    title: "Analytics",
    icon: BarChart3,
    href: "/admin/cart-analytics",
  },
];

export const AdminBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden">
      <div className="flex justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <button
              key={item.title}
              onClick={() => navigate(item.href)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 min-w-0 flex-1 transition-colors",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium truncate">{item.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}; 