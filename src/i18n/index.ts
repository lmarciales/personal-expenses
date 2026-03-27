import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enAccounts from "./locales/en/accounts.json";
import enAdmin from "./locales/en/admin.json";
import enAnalytics from "./locales/en/analytics.json";
import enAuth from "./locales/en/auth.json";
import enCommon from "./locales/en/common.json";
import enDashboard from "./locales/en/dashboard.json";
import enDebts from "./locales/en/debts.json";
import enTransactions from "./locales/en/transactions.json";
import enValidation from "./locales/en/validation.json";

import esAccounts from "./locales/es/accounts.json";
import esAdmin from "./locales/es/admin.json";
import esAnalytics from "./locales/es/analytics.json";
import esAuth from "./locales/es/auth.json";
import esCommon from "./locales/es/common.json";
import esDashboard from "./locales/es/dashboard.json";
import esDebts from "./locales/es/debts.json";
import esTransactions from "./locales/es/transactions.json";
import esValidation from "./locales/es/validation.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: {
        common: esCommon,
        auth: esAuth,
        validation: esValidation,
        dashboard: esDashboard,
        accounts: esAccounts,
        transactions: esTransactions,
        analytics: esAnalytics,
        debts: esDebts,
        admin: esAdmin,
      },
      en: {
        common: enCommon,
        auth: enAuth,
        validation: enValidation,
        dashboard: enDashboard,
        accounts: enAccounts,
        transactions: enTransactions,
        analytics: enAnalytics,
        debts: enDebts,
        admin: enAdmin,
      },
    },
    fallbackLng: "es",
    defaultNS: "common",
    ns: ["common", "auth", "validation", "dashboard", "accounts", "transactions", "analytics", "debts", "admin"],
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "lumina-language",
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
