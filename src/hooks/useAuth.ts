import { useContext } from "react";
import { AuthContext } from "@/store/authContext";

export function useAuth() {
  return useContext(AuthContext);
}
