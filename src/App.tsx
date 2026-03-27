import "./App.css";
import { AppLayout } from "@/components/Layout";
import { Toaster } from "@/components/ui/sonner";
import { AdminRoute } from "@/router/AdminRoute";
import { AuthContext } from "@/store/authContext.tsx";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Suspense, lazy, useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";

const AccountsView = lazy(() => import("@/pages/Accounts").then((m) => ({ default: m.AccountsView })));
const AdminDashboard = lazy(() => import("@/pages/Admin").then((m) => ({ default: m.AdminDashboard })));
const AnalyticsView = lazy(() => import("@/pages/Analytics").then((m) => ({ default: m.AnalyticsView })));
const Dashboard = lazy(() => import("@/pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const DebtsView = lazy(() => import("@/pages/Debts").then((m) => ({ default: m.DebtsView })));
const LoginForm = lazy(() => import("@/pages/Login").then((m) => ({ default: m.LoginForm })));
const Profile = lazy(() => import("@/pages/Profile").then((m) => ({ default: m.Profile })));
const ResetPassword = lazy(() => import("@/pages/ResetPassword").then((m) => ({ default: m.ResetPassword })));
const TransactionsView = lazy(() => import("@/pages/Transactions").then((m) => ({ default: m.TransactionsView })));

function LoadingFallback() {
  const { t } = useTranslation();
  return (
    <div className="grid place-items-center h-screen">
      <p>{t("loading")}</p>
    </div>
  );
}

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
      <Suspense fallback={<LoadingFallback />}>
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
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
          </Route>
        </Routes>
      </Suspense>
      <Toaster />
      <SpeedInsights />
    </>
  );
}

export default App;
