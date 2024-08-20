import "./App.css";
import { Dashboard } from "@/pages/Dashboard";
import { LoginForm } from "@/pages/Login";
import { Profile } from "@/pages/Profile";
import { ProtectedRoute } from "@/router/ProtectedRoute.tsx";
import { AuthContext } from "@/store/authContext.tsx";
import { useContext, useEffect } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";

function App() {
  const { session } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (session && location.pathname === "/") {
      navigate("/dashboard");
    }
  }, [location.pathname, navigate, session]);

  return (
    <Routes>
      <Route index element={<LoginForm />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
