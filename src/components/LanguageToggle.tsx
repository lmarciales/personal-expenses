import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

export function LanguageToggle() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === "es" ? "en" : "es");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full hover:bg-secondary"
      onClick={toggleLanguage}
      title={i18n.language === "es" ? "English" : "Español"}
    >
      <div className="relative">
        <Languages className="w-5 h-5" />
        <span className="absolute -bottom-1 -right-1.5 text-[9px] font-bold leading-none">
          {i18n.language === "es" ? "ES" : "EN"}
        </span>
      </div>
    </Button>
  );
}
