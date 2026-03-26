import { createContext, useCallback, useContext, useEffect, useState } from "react";

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const STORAGE_KEY = "sidebar-collapsed";

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsedState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === "true";
    // No saved preference — use responsive default
    return window.innerWidth < 1280; // collapsed below xl
  });

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
    localStorage.setItem(STORAGE_KEY, String(v));
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  // Set responsive default on first load only (when no saved preference)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return; // User has explicit preference, respect it

    const xlQuery = window.matchMedia("(min-width: 1280px)");
    const handler = (e: MediaQueryListEvent) => {
      // Only auto-adjust if user hasn't manually toggled yet
      if (localStorage.getItem(STORAGE_KEY) === null) {
        setCollapsedState(!e.matches);
      }
    };

    xlQuery.addEventListener("change", handler);
    return () => xlQuery.removeEventListener("change", handler);
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
