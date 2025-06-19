import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { AdminBottomNav } from "./AdminBottomNav";
import { ErrorBoundary, AdminErrorFallback } from "@/components/ui/ErrorBoundary";
import Header from "@/components/layout/Header";

export const AdminLayout = () => {
  return (
    <ErrorBoundary fallback={AdminErrorFallback}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full overflow-hidden">
          <AdminSidebar />
          <div className="flex flex-1 flex-col min-w-0">
            <Header />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 md:pb-6 overflow-x-hidden">
              <div className="max-w-7xl mx-auto w-full">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
        <AdminBottomNav />
      </SidebarProvider>
    </ErrorBoundary>
  );
};
