import { AddTransactionModal } from "@/components/Transactions/AddTransactionModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { signOut } from "@/supabase/auth";
import { supabase } from "@/supabase/client";
import { Bell, LogOut, Monitor, Moon, Plus, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { theme, setTheme } = useTheme();

  const [accounts, setAccounts] = useState<{ id: string; name: string; balance: number }[]>([]);

  useEffect(() => {
    const fetchAccounts = async () => {
      if (!session?.user?.id) return;
      const { data } = await supabase.from("accounts").select("id, name, balance").eq("user_id", session.user.id);
      if (data) setAccounts(data);
    };
    fetchAccounts();

    const handleRefresh = () => fetchAccounts();
    window.addEventListener("transaction-added", handleRefresh);
    return () => window.removeEventListener("transaction-added", handleRefresh);
  }, [session]);

  const handleSignOut = () => signOut().then(() => navigate("/"));

  const handleTransactionSuccess = () => {
    window.dispatchEvent(new Event("transaction-added"));
  };

  const cycleTheme = () => {
    if (theme === "dark") setTheme("light");
    else if (theme === "light") setTheme("system");
    else setTheme("dark");
  };

  return (
    <header className="sticky top-0 z-20 shell-navbar px-4 md:px-8 h-14 flex items-center justify-end shrink-0">
      <div className="flex items-center gap-2">
        {/* Add Transaction */}
        {accounts.length > 0 ? (
          <AddTransactionModal accounts={accounts} onSuccess={handleTransactionSuccess}>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow transition-all"
            >
              <Plus className="w-4 h-4 md:mr-1.5" />
              <span className="hidden md:inline">Add Transaction</span>
            </Button>
          </AddTransactionModal>
        ) : (
          <Button size="sm" disabled className="bg-primary/50 text-primary-foreground/50 cursor-not-allowed">
            <Plus className="w-4 h-4 md:mr-1.5" />
            <span className="hidden md:inline">Add Transaction</span>
          </Button>
        )}

        {/* Theme Toggle */}
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-secondary" onClick={cycleTheme}>
          {theme === "light" ? (
            <Sun className="w-5 h-5" />
          ) : theme === "dark" ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Monitor className="w-5 h-5" />
          )}
        </Button>

        {/* Notifications */}
        <div className="hidden sm:block">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-secondary relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 glass-panel border-border p-4" align="end">
              <h4 className="font-semibold text-sm mb-2 text-primary">Notifications</h4>
              <p className="text-sm text-muted-foreground">You have no new notifications.</p>
            </PopoverContent>
          </Popover>
        </div>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-9 h-9 rounded-full bg-primary/20 border-2 border-transparent hover:border-primary transition-colors focus:outline-none ml-1 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{session?.user?.email?.[0]?.toUpperCase() ?? "U"}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 glass-panel rounded-xl mt-2 border-border">
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive rounded-lg cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span>Cerrar sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
