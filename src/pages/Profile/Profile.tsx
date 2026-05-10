import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { formatSystemLabel } from "@/lib/displayLabels";
import { signOut } from "@/supabase/auth";
import { LogOut, Monitor, Moon, Palette, ShieldCheck, Sun, UserCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export const Profile = () => {
  const { t, i18n } = useTranslation("common");
  const { session, userRole, emailConfirmed } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const nextTheme = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
  const themeLabel = t(`theme.${theme}`);
  const nextThemeLabel = t(`theme.${nextTheme}`);
  const isSpanish = (i18n.resolvedLanguage || i18n.language).startsWith("es");
  const languageLabel = isSpanish ? t("language.spanish") : t("language.english");
  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="space-y-6">
      <header className="glass-card p-6 rounded-3xl shadow-xl">
        <h1 className="typo-page-title">{t("profile.title")}</h1>
        <p className="typo-page-subtitle">{t("profile.subtitle")}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="glass-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserCircle className="w-6 h-6 text-primary" />
            </div>
            <h2 className="typo-section-label">{t("profile.account")}</h2>
          </div>

          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wider">{t("profile.email")}</dt>
              <dd className="mt-1 font-medium break-all">{session?.user?.email ?? "-"}</dd>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-muted-foreground uppercase tracking-wider">{t("profile.role")}</dt>
                <dd className="mt-1 inline-flex items-center gap-2 rounded-full bg-surface-hover px-3 py-1 text-sm font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  {formatSystemLabel(userRole ?? "user", (key) => t(key))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase tracking-wider">{t("profile.emailStatus")}</dt>
                <dd className="mt-1 text-sm font-medium">
                  {emailConfirmed ? t("profile.confirmed") : t("profile.notConfirmed")}
                </dd>
              </div>
            </div>
          </dl>
        </section>

        <section className="glass-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <Palette className="w-6 h-6 text-primary" />
            </div>
            <h2 className="typo-section-label">{t("profile.preferences")}</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-hover/40 border border-subtle p-4">
              <div>
                <p className="text-sm font-semibold">{t("profile.language")}</p>
                <p className="text-xs text-muted-foreground">{languageLabel}</p>
              </div>
              <LanguageToggle />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-hover/40 border border-subtle p-4">
              <div>
                <p className="text-sm font-semibold">{t("profile.theme")}</p>
                <p className="text-xs text-muted-foreground">{t("theme.current", { theme: themeLabel })}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTheme(nextTheme)}
                aria-label={t("theme.switchTo", { theme: nextThemeLabel })}
                title={t("theme.switchTo", { theme: nextThemeLabel })}
                className="rounded-full"
              >
                {theme === "light" ? (
                  <Sun className="w-4 h-4" />
                ) : theme === "dark" ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Monitor className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </section>
      </div>

      <section className="glass-card rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="typo-section-label">{t("profile.session")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("profile.signOutHint")}</p>
        </div>
        <Button variant="destructive" onClick={handleSignOut} className="sm:w-auto">
          <LogOut className="w-4 h-4 mr-2" />
          {t("navbar.signOut")}
        </Button>
      </section>
    </div>
  );
};
