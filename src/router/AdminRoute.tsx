import { useAuth } from "@/hooks/useAuth";
import type React from "react";
import { Navigate } from "react-router-dom";

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, userRole } = useAuth();

  if (!session) {
    return <Navigate to="/" />;
  }

  if (userRole === null) {
    return null; // still loading role
  }

  if (userRole !== "admin") {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
};
