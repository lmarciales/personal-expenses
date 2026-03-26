import "./App.css";
import { AccountsView } from "@/pages/Accounts";
import { Dashboard } from "@/pages/Dashboard";
import { DebtsView } from "@/pages/Debts";
import { LoginForm } from "@/pages/Login";
import { Profile } from "@/pages/Profile";
import { TransactionsView } from "@/pages/Transactions";
import { ProtectedRoute } from "@/router/ProtectedRoute.tsx";
import { AuthContext } from "@/store/authContext.tsx";
import { SpeedInsights } from "@vercel/speed-insights/react";
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
    <>
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
          path="/accounts"
          element={
            <ProtectedRoute>
              <AccountsView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/debts"
          element={
            <ProtectedRoute>
              <DebtsView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <TransactionsView />
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
      <SpeedInsights />
    </>
  );
}

export default App;
