import { isActivePath, primaryNavItems } from "@/lib/navigation";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

export const MobileBottomNav = () => {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden shell-mobile-nav px-2 py-2">
      <div className="flex items-center justify-around">
        {primaryNavItems.map((item) => {
          const label = t(item.labelKey);
          const isActive = isActivePath(location.pathname, item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={label}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors focus-ring ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
