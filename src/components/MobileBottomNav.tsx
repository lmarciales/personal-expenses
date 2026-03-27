import { useAuth } from "@/hooks/useAuth";
import { CreditCard, Home, Receipt, Shield, TrendingUp, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

export const MobileBottomNav = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { userRole } = useAuth();

  const navItems = [
    { icon: Home, label: t("nav.overview"), path: "/dashboard" },
    { icon: Wallet, label: t("nav.accounts"), path: "/accounts" },
    { icon: Receipt, label: t("nav.transactions"), path: "/transactions" },
    { icon: TrendingUp, label: t("nav.analytics"), path: "/analytics" },
    { icon: CreditCard, label: t("nav.debts"), path: "/debts" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden shell-mobile-nav px-2 py-2">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (location.pathname === "/" && item.path === "/dashboard");
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors focus-ring ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        {userRole === "admin" &&
          (() => {
            const isActive = location.pathname === "/admin";
            return (
              <Link
                to="/admin"
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors focus-ring ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Shield className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                <span className="text-[10px] font-medium">{t("nav.admin")}</span>
              </Link>
            );
          })()}
      </div>
    </nav>
  );
};
