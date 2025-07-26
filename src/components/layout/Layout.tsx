import { Outlet } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { SidebarProvider } from '@/components/ui/sidebar';
import { CommandPalette } from '@/components/shared/CommandPalette';
import { useCommandPalette } from '@/hooks/useCommandPalette';

const Layout = () => {
  const { isOpen, closePalette } = useCommandPalette({
    enableShortcut: true,
    preventDefaultShortcuts: true,
  });

  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen w-full bg-white">
        <Header />
        <main className="flex-grow bg-white">
          <Outlet />
        </main>
        <Footer />

        {/* Global Command Palette */}
        <CommandPalette isOpen={isOpen} onClose={closePalette} />
      </div>
    </SidebarProvider>
  );
};

export default Layout;
