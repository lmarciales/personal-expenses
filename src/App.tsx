import "./App.css";
import { AppLayout } from "@/components/Layout";
import { AccountsView } from "@/pages/Accounts";
import { AdminDashboard } from "@/pages/Admin";
import { AnalyticsView } from "@/pages/Analytics";
import { Dashboard } from "@/pages/Dashboard";
import { DebtsView } from "@/pages/Debts";
import { LoginForm } from "@/pages/Login";
import { Profile } from "@/pages/Profile";
import { ResetPassword } from "@/pages/ResetPassword";
import { TransactionsView } from "@/pages/Transactions";
import { AdminRoute } from "@/router/AdminRoute";
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
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/accounts" element={<AccountsView />} />
          <Route path="/debts" element={<DebtsView />} />
          <Route path="/transactions" element={<TransactionsView />} />
          <Route path="/analytics" element={<AnalyticsView />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        </Route>
      </Routes>
      <SpeedInsights />
    </>
  );
}

export default App;
