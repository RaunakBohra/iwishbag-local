import { Outlet } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SidebarProvider } from "@/components/ui/sidebar";

const Layout = () => {
  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen w-full bg-background">
        <Header />
        <main className="flex-grow bg-background">
          <Outlet />
        </main>
        <Footer />
      </div>
    </SidebarProvider>
  );
};

export default Layout;
