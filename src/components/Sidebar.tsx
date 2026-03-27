import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/store/sidebarContext";
import { ChevronsLeft, ChevronsRight, CreditCard, Home, Receipt, Shield, TrendingUp, Wallet } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

const navItems = [
  { icon: Home, label: "Overview", path: "/dashboard" },
  { icon: Wallet, label: "Accounts", path: "/accounts" },
  { icon: Receipt, label: "Transactions", path: "/transactions" },
  { icon: TrendingUp, label: "Analytics", path: "/analytics" },
  { icon: CreditCard, label: "Debts", path: "/debts" },
];

const Sidebar = () => {
  const location = useLocation();
  const { collapsed, toggleCollapsed } = useSidebar();
  const { userRole } = useAuth();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={`sticky top-0 hidden md:flex flex-col h-screen shrink-0 shell-sidebar z-10 transition-[width] duration-300 ease-in-out ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        {/* Branding */}
        <div className={`flex items-center p-6 mb-4 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-glow-lg shrink-0">
            <span className="font-bold text-primary-foreground text-xl">L</span>
          </div>
          {!collapsed && (
            <span className="font-bold text-2xl tracking-tight ml-3 whitespace-nowrap overflow-hidden">Lumina</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {!collapsed && (
            <div className="mb-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
              Main Menu
            </div>
          )}
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path || (location.pathname === "/" && item.path === "/dashboard");

            const linkContent = (
              <Link key={item.path} to={item.path} className="block focus-ring rounded-xl">
                <span
                  className={`flex items-center w-full px-3 py-3 rounded-xl transition-all duration-200 group ${
                    collapsed ? "justify-center" : ""
                  } ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-glow font-medium"
                      : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  <item.icon
                    className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                    }`}
                  />
                  {!collapsed && <span className="ml-3 whitespace-nowrap overflow-hidden">{item.label}</span>}
                </span>
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
          {userRole === "admin" && (
            <>
              {!collapsed && (
                <div className="mt-6 mb-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
                  Admin
                </div>
              )}
              {(() => {
                const isActive = location.pathname === "/admin";
                const linkContent = (
                  <Link to="/admin" className="block focus-ring rounded-xl">
                    <span
                      className={`flex items-center w-full px-3 py-3 rounded-xl transition-all duration-200 group ${
                        collapsed ? "justify-center" : ""
                      } ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-glow font-medium"
                          : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                      }`}
                    >
                      <Shield
                        className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                          isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                        }`}
                      />
                      {!collapsed && <span className="ml-3 whitespace-nowrap overflow-hidden">Administración</span>}
                    </span>
                  </Link>
                );

                if (collapsed) {
                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        Administración
                      </TooltipContent>
                    </Tooltip>
                  );
                }
                return linkContent;
              })()}
            </>
          )}
        </nav>

        {/* Bottom Section */}
        <div className="p-3 mt-auto space-y-1">
          {/* Collapse Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={toggleCollapsed}
                className={`w-full rounded-xl text-muted-foreground hover:bg-surface-hover hover:text-foreground ${
                  collapsed ? "justify-center px-0" : "justify-start"
                }`}
              >
                {collapsed ? (
                  <ChevronsRight className="w-5 h-5 shrink-0" />
                ) : (
                  <>
                    <ChevronsLeft className="w-5 h-5 shrink-0" />
                    <span className="ml-3 whitespace-nowrap overflow-hidden">Collapse</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" className="font-medium">
                Expand sidebar
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
};

export default Sidebar;
