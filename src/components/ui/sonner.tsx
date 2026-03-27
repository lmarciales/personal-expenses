import { useTheme } from "@/hooks/useTheme";
import { Toaster as Sonner } from "sonner";

type Theme = "light" | "dark" | "system";

export function Toaster() {
  const { theme } = useTheme();

  return <Sonner theme={theme as Theme} richColors closeButton />;
}
