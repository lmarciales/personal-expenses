import i18n from "@/i18n";
import { enUS } from "date-fns/locale/en-US";
import { es } from "date-fns/locale/es";

export function getDateLocale() {
  return i18n.language === "en" ? enUS : es;
}
