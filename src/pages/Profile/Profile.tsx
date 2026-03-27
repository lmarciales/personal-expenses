import { useTranslation } from "react-i18next";

export const Profile = () => {
  const { t } = useTranslation();
  return <div>{t("nav.profile")}</div>;
};
