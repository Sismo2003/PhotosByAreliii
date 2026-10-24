// /client · the client's galleries. Each one is a large "keepsake" cover (framed on the faces the
// backend found), with the title over the photo and a strip of three more photos under it.
// Expired galleries are hidden behind a filter and shown greyed, without photos.
import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import clsx from "clsx";

import { useAuth } from "app/auth";
import { Skeleton } from "components/ui";
import { Chip, ChipRow } from "components/Chip";
import { ErrorState } from "components/ErrorState";
import { useRequest } from "hooks/useRequest";
import { useDocumentTitle } from "hooks/useDocumentTitle";
import { FocusImg } from "components/FocusImg";
import { listGalleries, photoUrl } from "services/portal";
import { formatDate } from "utils/date";

const URGENT_DAYS = 7;

function ExpiryPill({ daysLeft }) {
  const { t } = useTranslation();
  if (daysLeft == null) return null;
  const urgent = daysLeft <= URGENT_DAYS;
  return (
    <span
      className={clsx(
        "caps px-2.5 py-1 backdrop-blur-md",
        urgent ? "bg-warning text-white" : "bg-black/35 text-white",
      )}
    >
      {daysLeft === 0 ? t("galleries.lastDay") : t("galleries.daysLeft", { count: daysLeft })}
    </span>
  );
}

function GalleryTile({ gallery }) {
  const { t } = useTranslation();
  const when = gallery.sessionAt ?? gallery.deliveredAt;
  const extra = gallery.photoCount - 1 - gallery.strip.length;

  return (
    <Link
      to={`/client/galleries/${gallery.slug}`}
      viewTransition
      className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
    >
      <article>
        <div className="relative aspect-[4/5] overflow-hidden bg-paper-alt sm:aspect-[3/2]">
          {gallery.cover && (
            <FocusImg
              photo={gallery.cover}
              src={photoUrl(gallery.slug, gallery.cover, "web")}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
            {gallery.draft ? <span className="caps bg-paper px-2.5 py-1 text-ink">{t("galleries.draft")}</span> : <span />}
            <ExpiryPill daysLeft={gallery.daysLeft} />
          </div>
          <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
            <p className="caps text-white/80">
              {[gallery.service, when && formatDate(when, "LLL d, yyyy")].filter(Boolean).join(" · ")}
            </p>
            <h2 className="mt-1.5 text-title leading-tight sm:text-title-l">{gallery.title}</h2>
            <p className="mt-2 text-small text-white/80">{t("galleries.photoCount", { count: gallery.photoCount })}</p>
          </div>
        </div>

        {gallery.strip.length > 0 && (
          <div className="mt-px grid grid-cols-3 gap-px">
            {gallery.strip.map((photo, i) => (
              <div key={photo.id} className="relative aspect-square overflow-hidden bg-paper-alt">
                <FocusImg
                  photo={photo}
                  src={photoUrl(gallery.slug, photo, "thumb")}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
                {i === gallery.strip.length - 1 && extra > 0 && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-body text-white">
                    +{extra}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </article>
    </Link>
  );
}

function ExpiredTile({ gallery }) {
  const { t } = useTranslation();
  const when = gallery.sessionAt ?? gallery.deliveredAt;
  return (
    <article className="border border-dashed border-line-strong/60 bg-paper-alt px-5 py-6 opacity-70 grayscale">
      <p className="caps text-ink-muted">
        {[gallery.service, when && formatDate(when, "LLL d, yyyy")].filter(Boolean).join(" · ")}
      </p>
      <h2 className="mt-1.5 text-title text-ink">{gallery.title}</h2>
      <p className="mt-2 text-small text-ink-muted">
        {t("galleries.expiredOn", { date: formatDate(gallery.expiresAt, "LLL d, yyyy") })}
      </p>
    </article>
  );
}

function TilesSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-2" aria-hidden="true">
      {[0, 1].map((i) => (
        <div key={i}>
          <Skeleton className="aspect-[4/5] w-full sm:aspect-[3/2]" />
          <div className="mt-px grid grid-cols-3 gap-px">
            {[0, 1, 2].map((j) => (
              <Skeleton key={j} className="aspect-square" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Galleries() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showExpired, setShowExpired] = useState(false);
  const { status, data, error, retry } = useRequest(() => listGalleries({ expired: showExpired }), [showExpired]);
  useDocumentTitle(t("galleries.title"));

  const firstName = user?.firstName || user?.name;
  const galleries = data?.galleries ?? [];
  const expired = data?.expired ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-[calc(var(--safe-top)+1.5rem)] sm:px-8 md:pt-10">
      <header className="mb-6">
        {firstName && <p className="caps text-ink-muted">{t("galleries.hello", { name: firstName })}</p>}
        <h1 className="mt-1 text-title-l tracking-[-0.01em] text-ink">{t("galleries.title")}</h1>
      </header>

      {data?.expiredCount > 0 && (
        <ChipRow>
          <Chip on={!showExpired} onClick={() => setShowExpired(false)}>
            {t("galleries.filters.available")}
          </Chip>
          <Chip on={showExpired} onClick={() => setShowExpired(true)}>
            {t("galleries.filters.showExpired", { count: data.expiredCount })}
          </Chip>
        </ChipRow>
      )}

      {status === "loading" && !data && <TilesSkeleton />}
      {status === "error" && <ErrorState error={error} onRetry={retry} />}

      {data && (
        <>
          {galleries.length === 0 && !showExpired && (
            <div className="border border-line px-6 py-16 text-center">
              <p className="text-title text-ink">{t("galleries.empty.title")}</p>
              <p className="mx-auto mt-2 max-w-sm text-body text-ink-muted">{t("galleries.empty.body")}</p>
            </div>
          )}

          {!showExpired && (
            <div className="grid gap-10 lg:grid-cols-2">
              {galleries.map((g) => (
                <GalleryTile key={g.slug} gallery={g} />
              ))}
            </div>
          )}

          {showExpired && (
            <section aria-label={t("galleries.filters.showExpired", { count: expired.length })}>
              <p className="mb-4 text-small text-ink-muted">{t("galleries.expiredNote")}</p>
              <div className="grid gap-4 lg:grid-cols-2">
                {expired.map((g) => (
                  <ExpiredTile key={g.slug} gallery={g} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
