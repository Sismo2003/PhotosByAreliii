import { useTranslation } from "react-i18next";

import { Button } from "components/ui";

export function ErrorState({ error, onRetry }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex flex-col items-center gap-4 px-4 py-20 text-center">
      <p className="text-body text-ink-muted">{error?.status === 0 ? t("errors.offline") : t("errors.generic")}</p>
      {onRetry && (
        <Button variant="outlined" onClick={onRetry}>
          {t("errors.retry")}
        </Button>
      )}
    </div>
  );
}
