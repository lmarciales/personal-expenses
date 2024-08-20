import { Button } from "@/components/ui/button.tsx";
import { AuthContext } from "@/store/authContext.tsx";
import { signOut } from "@/supabase/auth.ts";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";

export const Dashboard = () => {
  const navigate = useNavigate();
  const { session } = useContext(AuthContext);

  const handleSignOut = () => signOut().then(() => navigate("/"));

  return (
    <div>
      <h1>Dashboard</h1>
      <p>
        User: <pre>{JSON.stringify(session, null, 2)}</pre>
      </p>
      <Button onClick={() => handleSignOut()}>Sign out</Button>
    </div>
  );
};
