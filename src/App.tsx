import "./App.css";
import { AccountsView } from "@/pages/Accounts";
import { Dashboard } from "@/pages/Dashboard";
import { DebtsView } from "@/pages/Debts";
import { LoginForm } from "@/pages/Login";
import { Profile } from "@/pages/Profile";
import { TransactionsView } from "@/pages/Transactions";
import { AnalyticsView } from "@/pages/Analytics";
import { AppLayout } from "@/components/Layout";
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
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/accounts" element={<AccountsView />} />
          <Route path="/debts" element={<DebtsView />} />
          <Route path="/transactions" element={<TransactionsView />} />
          <Route path="/analytics" element={<AnalyticsView />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
      <SpeedInsights />
    </>
  );
}

export default App;
