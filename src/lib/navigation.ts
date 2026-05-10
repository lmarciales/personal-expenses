import { CreditCard, Home, type LucideIcon, Receipt, Shield, TrendingUp, User, Wallet } from "lucide-react";

export interface NavItem {
  icon: LucideIcon;
  labelKey: string;
  path: string;
}

export const primaryNavItems: NavItem[] = [
  { icon: Home, labelKey: "nav.overview", path: "/dashboard" },
  { icon: Wallet, labelKey: "nav.accounts", path: "/accounts" },
  { icon: Receipt, labelKey: "nav.transactions", path: "/transactions" },
  { icon: TrendingUp, labelKey: "nav.analytics", path: "/analytics" },
  { icon: CreditCard, labelKey: "nav.debts", path: "/debts" },
];

export const adminNavItem: NavItem = { icon: Shield, labelKey: "nav.admin", path: "/admin" };
export const profileNavItem: NavItem = { icon: User, labelKey: "nav.profile", path: "/profile" };

export function isActivePath(currentPath: string, itemPath: string) {
  return currentPath === itemPath || (currentPath === "/" && itemPath === "/dashboard");
}
