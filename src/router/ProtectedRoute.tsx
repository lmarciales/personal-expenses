import { AuthContext } from "@/store/authContext.tsx";
import type React from "react";
import { useContext } from "react";
import { Navigate } from "react-router-dom";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { session } = useContext(AuthContext);

  if (!session) {
    return <Navigate to={"/"} />;
  }

  return <>{children}</>;
};
