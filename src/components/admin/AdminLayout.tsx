import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { AdminBottomNav } from './AdminBottomNav';
import { ErrorBoundary, AdminErrorFallback } from '@/components/ui/ErrorBoundary';

export const AdminLayout = () => {
  return (
    <ErrorBoundary fallback={AdminErrorFallback}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full overflow-hidden">
          <AdminSidebar />
          <div className="flex flex-1 flex-col min-w-0">
            <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-12 py-8 pb-20 md:pb-6 overflow-x-hidden">
              <div className="w-full">
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

export default AdminLayout;