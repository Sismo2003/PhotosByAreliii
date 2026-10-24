import { Link } from "react-router";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="caps text-ink-muted">404</p>
      <h1 className="text-title text-ink">{t("notFound.title")}</h1>
      <Link to="/client" className="caps text-ink underline underline-offset-4">
        {t("notFound.back")}
      </Link>
    </div>
  );
}
