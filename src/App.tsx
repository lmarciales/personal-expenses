import { ThemeProvider } from "@/theme/ThemeProvider.tsx";
import "./App.css";
import { LoginForm } from "@/pages/Login";

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <LoginForm />
    </ThemeProvider>
  );
}

export default App;
