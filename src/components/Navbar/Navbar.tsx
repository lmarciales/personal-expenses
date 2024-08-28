import { useTheme } from "@/hooks/useTheme";
import { signOut } from "@/supabase/auth";
import { LogOut, Moon, Sun, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";

const Navbar = () => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleSignOut = () => signOut().then(() => navigate("/"));

  return (
    <nav className="border-b">
      <div className="container flex items-center justify-between px-4 py-2 mx-auto">
        <h1 className="text-lg font-semibold">Personal Expenses Dashboard</h1>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "light" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open user menu">
                <User className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSignOut()}>
                <LogOut className="w-4 h-4 mr-2" />
                <span>Cerrar sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
