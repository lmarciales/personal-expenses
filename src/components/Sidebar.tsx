import {
  BarChart2,
  CreditCard,
  FileText,
  Folder,
  Home,
  LayoutDashboard,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { signOut } from "@/supabase/auth";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = () => signOut().then(() => navigate('/'));
  const navItems = [
    { icon: Home, label: "Overview", path: "/dashboard" },
    { icon: BarChart2, label: "Activity", path: "/activity" },
    { icon: CreditCard, label: "Manage", path: "/manage" },
    { icon: LayoutDashboard, label: "Program", path: "/program" },
    { icon: Folder, label: "Folders", path: "/folders" },
    { icon: FileText, label: "Documents", path: "/documents" },
  ];

  return (
    <aside className="sticky top-0 flex flex-col h-screen shrink-0 w-20 md:w-64 glass-panel border-r-0 z-10 transition-all duration-300">
      {/* Subtle Background Glow for Sidebar */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/5 to-transparent -z-10 pointer-events-none" />

      <div className="flex items-center p-6 mb-4">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center mr-3 shadow-[0_0_15px_rgba(212,255,0,0.4)]">
          <span className="font-bold text-primary-foreground text-xl">L</span>
        </div>
        <span className="font-bold text-2xl hidden md:inline tracking-tight">Lumina</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        <div className="mb-4 hidden md:block text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
          Main Menu
        </div>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (location.pathname === '/' && item.path === '/dashboard');
          const isImplemented = item.path === '/dashboard';
          // Using a conditional rendering approach based on if the item is implemented 
          return isImplemented ? (
            <Link key={item.path} to={item.path} className="block">
              <span
                className={`flex items-center w-full px-3 py-3 rounded-xl transition-all duration-200 group ${isActive
                  ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(212,255,0,0.15)] font-medium"
                  : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                  }`}
              >
                <item.icon
                  className={`w-5 h-5 mr-3 transition-transform group-hover:scale-110 ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                    }`}
                />
                <span className="hidden md:inline">{item.label}</span>
              </span>
            </Link>
          ) : (
            <div key={item.path} className="block cursor-not-allowed opacity-50 relative group">
              <span className="flex items-center w-full px-3 py-3 rounded-xl text-muted-foreground">
                <item.icon className="w-5 h-5 mr-3" />
                <span className="hidden md:inline">{item.label}</span>
              </span>
              <div className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-surface-overlay-heavy backdrop-blur-sm rounded-xl">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider backdrop-blur-md px-2 py-0.5 rounded-sm border border-primary/30">Soon</span>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="p-4 mt-auto space-y-2">
        <div className="mb-2 hidden md:block text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
          General
        </div>

        <div className="cursor-not-allowed opacity-50 relative group block">
          <Button variant="ghost" disabled className="w-full justify-start rounded-xl text-muted-foreground hover:bg-surface-hover hover:text-foreground hover:shadow-none pointer-events-none">
            <Settings className="w-5 h-5 mr-3" />
            <span className="hidden md:inline">Settings</span>
          </Button>
          <div className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-surface-overlay-heavy backdrop-blur-sm rounded-xl">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider backdrop-blur-md px-2 py-0.5 rounded-sm border border-primary/30">Soon</span>
          </div>
        </div>

        <div className="cursor-not-allowed opacity-50 relative group block">
          <Button variant="ghost" disabled className="w-full justify-start rounded-xl text-muted-foreground hover:bg-surface-hover hover:text-foreground hover:shadow-none pointer-events-none">
            <User className="w-5 h-5 mr-3" />
            <span className="hidden md:inline">Profile</span>
          </Button>
          <div className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-surface-overlay-heavy backdrop-blur-sm rounded-xl">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider backdrop-blur-md px-2 py-0.5 rounded-sm border border-primary/30">Soon</span>
          </div>
        </div>

        <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive hover:shadow-none mt-4">
          <LogOut className="w-5 h-5 mr-3" />
          <span className="hidden md:inline">Log out</span>
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
