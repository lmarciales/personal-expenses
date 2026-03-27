import { AuthContext } from "@/store/authContext";
import { useContext } from "react";

export function useAuth() {
  return useContext(AuthContext);
}
