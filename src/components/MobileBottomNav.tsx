import { Home, CreditCard, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "@/supabase/auth";

const navItems = [
  { icon: Home, label: "Overview", path: "/dashboard" },
  { icon: CreditCard, label: "Debts", path: "/debts" },
];

export const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = () => signOut().then(() => navigate("/"));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-sidebar border-t border-border/50 px-2 py-2">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (location.pathname === "/" && item.path === "/dashboard");
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors focus-ring ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={handleSignOut}
          className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl text-muted-foreground hover:text-destructive transition-colors focus-ring"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-medium">Log out</span>
        </button>
      </div>
    </nav>
  );
};
