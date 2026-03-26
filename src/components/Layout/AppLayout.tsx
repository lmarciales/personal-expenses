import { Outlet } from "react-router-dom";
import { ProtectedRoute } from "@/router/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import Navbar from "@/components/Navbar/Navbar";

export function AppLayout() {
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-background text-foreground font-sans relative overflow-hidden selection:bg-primary/30">
        {/* Ambient Neon Glows */}
        <div className="bg-glow top-[-10%] left-[-5%] opacity-50" />
        <div className="bg-glow-secondary bottom-[-10%] right-[-5%] opacity-30" />

        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 relative z-10 px-4 py-6 md:px-12 md:py-10 pb-20 md:pb-10 overflow-y-auto overflow-x-hidden">
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Outlet />
            </div>
          </main>
        </div>

        <MobileBottomNav />
      </div>
    </ProtectedRoute>
  );
}
