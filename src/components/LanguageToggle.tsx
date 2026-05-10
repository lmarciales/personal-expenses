import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

export function LanguageToggle() {
  const { t, i18n } = useTranslation("common");
  const isSpanish = (i18n.resolvedLanguage || i18n.language).startsWith("es");

  const toggleLanguage = () => {
    const nextLanguage = isSpanish ? "en" : "es";
    localStorage.setItem("lumina-language", nextLanguage);
    i18n.changeLanguage(nextLanguage);
  };

  const currentLanguage = isSpanish ? "ES" : "EN";
  const nextLanguageLabel = isSpanish ? t("language.english") : t("language.spanish");
  const label = t("language.switchTo", { language: nextLanguageLabel });

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full hover:bg-secondary"
      onClick={toggleLanguage}
      title={label}
      aria-label={label}
    >
      <div className="relative">
        <Languages className="w-5 h-5" />
        <span className="absolute -bottom-1 -right-1.5 text-[9px] font-bold leading-none">{currentLanguage}</span>
      </div>
    </Button>
  );
}
