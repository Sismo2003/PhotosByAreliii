// /client/profile · read only for now: who they are, the language, sign out. Editing name, phone and
// Instagram (PATCH /api/client/me) comes next (docs/portal-cliente-plan.md §1, P5).
import { useTranslation } from "react-i18next";

import { useAuth } from "app/auth";
import { Skeleton } from "components/ui";
import { ContactActions } from "components/ContactActions";
import { ErrorState } from "components/ErrorState";
import { LanguageSwitch } from "components/LanguageSwitch";
import { useRequest } from "hooks/useRequest";
import { useDocumentTitle } from "hooks/useDocumentTitle";
import { getMe } from "services/portal";
import { formatDate } from "utils/date";

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter((w) => /\p{L}/u.test(w[0] ?? ""))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

function Group({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="field-label mb-2 px-1">{title}</h2>
      <div className="divide-y divide-line border-y border-line">{children}</div>
    </section>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 px-1 py-3">
      <span className="text-body text-ink-muted">{label}</span>
      <span className="min-w-0 truncate text-right text-body text-ink">{value || "—"}</span>
    </div>
  );
}

export default function Profile() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const { status, data: me, error, retry } = useRequest(() => getMe(), []);
  useDocumentTitle(t("profile.title"));

  return (
    <div className="mx-auto max-w-xl px-4 pt-[calc(var(--safe-top)+1.5rem)] sm:px-8 md:pt-10">
      <h1 className="mb-8 text-title-l tracking-[-0.01em] text-ink">{t("profile.title")}</h1>

      {status === "loading" && (
        <div aria-busy="true">
          <div className="mb-10 flex items-center gap-4">
            <Skeleton className="size-16" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-44 w-full" />
        </div>
      )}
      {status === "error" && <ErrorState error={error} onRetry={retry} />}

      {me && (
        <>
          <div className="mb-10 flex items-center gap-4">
            <span className="flex size-16 shrink-0 items-center justify-center bg-ink text-title text-on-ink" aria-hidden="true">
              {initials(me.displayName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-title text-ink">{me.displayName}</p>
              <p className="text-small text-ink-muted">
                {t("profile.clientSince", { date: formatDate(me.createdAt, "LLLL yyyy") })}
              </p>
            </div>
          </div>

          <Group title={t("profile.contact")}>
            <Row label={t("profile.email")} value={me.email} />
            <Row label={t("profile.phone")} value={me.phone} />
            <Row label={t("profile.instagram")} value={me.instagram && `@${me.instagram.replace(/^@/, "")}`} />
          </Group>

          <section className="mb-8">
            <h2 className="field-label mb-2 px-1">{t("contact.title")}</h2>
            <ContactActions />
          </section>

          <Group title={t("language.label")}>
            <div className="py-3">
              <LanguageSwitch size="lg" />
            </div>
          </Group>

          <button
            type="button"
            onClick={logout}
            className="caps min-h-12 w-full border border-line text-alert transition-colors hover:border-alert"
          >
            {t("profile.signOut")}
          </button>
        </>
      )}
    </div>
  );
}
