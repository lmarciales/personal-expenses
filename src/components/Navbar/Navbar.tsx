import { signOut } from "@/supabase/auth";
import { LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";

const Navbar = () => {
  const navigate = useNavigate();

  const handleSignOut = () => signOut().then(() => navigate("/"));

  return (
    <nav className="border-b">
      <div className="container flex items-center justify-between px-4 py-2 mx-auto">
        <h1 className="text-lg font-semibold">Personal Expenses Dashboard</h1>
        <div className="flex items-center space-x-4">
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
