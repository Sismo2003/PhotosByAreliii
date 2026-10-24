// The gallery's first screen, in the layout Areli picked in the admin (Galleries → Cover → Layout).
// The three show the same things — service · date, title, photos · available until — only the
// composition changes. The admin's preview (admin/.../gallery/CoverTab.jsx, CoverPreview) draws the
// same three: change both together (skill client-portal §4).
//   FULL    the photo fills the screen, the text over a dark gradient.
//   SPLIT   photo | text side by side; on phones the photo on top and the text under it.
//   MINIMAL text centered on paper, the whole photo (uncropped) under it, framed.
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";

import { FocusImg } from "components/FocusImg";
import { photoUrl } from "services/portal";
import { formatDate } from "utils/date";

function BackButton({ overlay }) {
  const { t } = useTranslation();
  return (
    <Link
      to="/client"
      viewTransition
      aria-label={t("gallery.back")}
      className={clsx(
        "absolute top-[calc(var(--safe-top)+0.75rem)] left-3 z-10 flex size-11 items-center justify-center md:hidden",
        overlay ? "bg-black/30 text-white backdrop-blur-md hover:bg-black/50" : "text-ink hover:bg-paper-alt",
      )}
    >
      <ChevronLeftIcon className="size-6" />
    </Link>
  );
}

function Heading({ gallery, onPhoto = false, center = false }) {
  const { t } = useTranslation();
  const when = gallery.sessionAt ?? gallery.deliveredAt;
  return (
    <div className={clsx(center && "text-center")}>
      <p className={clsx("caps", onPhoto ? "text-white/80" : "text-ink-muted")}>
        {[gallery.service, when && formatDate(when, "LLLL d, yyyy")].filter(Boolean).join(" · ")}
      </p>
      <h1
        className={clsx(
          "mt-2 text-title-l leading-[1.05] tracking-[-0.01em] md:text-[3.5rem]",
          onPhoto ? "text-white" : "text-ink",
        )}
      >
        {gallery.title}
      </h1>
      <p className={clsx("mt-3 text-small", onPhoto ? "text-white/85" : "text-ink-muted")}>
        {t("galleries.photoCount", { count: gallery.photoCount })}
        {gallery.expiresAt && ` · ${t("gallery.availableUntil", { date: formatDate(gallery.expiresAt, "LLL d") })}`}
      </p>
    </div>
  );
}

function CoverImage({ gallery, className, crop = true }) {
  if (!gallery.cover) return null;
  return (
    <FocusImg
      photo={crop ? gallery.cover : null}
      src={photoUrl(gallery.slug, gallery.cover, "web")}
      width={gallery.cover.width ?? undefined}
      height={gallery.cover.height ?? undefined}
      className={className}
    />
  );
}

function FullHero({ gallery }) {
  return (
    <header className="relative h-[62vh] max-h-[640px] min-h-[360px] overflow-hidden bg-film md:h-[56vh]">
      <CoverImage gallery={gallery} className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/30" />
      <BackButton overlay />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-5 pb-7 sm:px-8 md:pb-10">
        <Heading gallery={gallery} onPhoto />
      </div>
    </header>
  );
}

function SplitHero({ gallery }) {
  return (
    <header className="border-b border-line md:grid md:h-[64vh] md:max-h-[680px] md:min-h-[420px] md:grid-cols-2">
      <div className="relative h-[52vh] max-h-[560px] min-h-[300px] overflow-hidden bg-paper-alt md:h-auto md:max-h-none md:min-h-0">
        <CoverImage gallery={gallery} className="absolute inset-0 size-full object-cover" />
        <BackButton overlay />
      </div>
      <div className="flex flex-col justify-center px-5 py-8 sm:px-8 md:px-12 lg:px-16">
        <Heading gallery={gallery} />
      </div>
    </header>
  );
}

function MinimalHero({ gallery }) {
  return (
    <header className="relative border-b border-line px-5 pt-[calc(var(--safe-top)+4.5rem)] pb-10 sm:px-8 md:pt-16 md:pb-14">
      <BackButton />
      <div className="mx-auto max-w-3xl">
        <Heading gallery={gallery} center />
      </div>
      {gallery.cover && (
        <div className="mt-8 flex justify-center md:mt-10">
          <div className="border border-line bg-paper p-2 shadow-soft dark:shadow-soft-dark">
            <CoverImage gallery={gallery} crop={false} className="block h-auto max-h-[44vh] w-auto max-w-full" />
          </div>
        </div>
      )}
    </header>
  );
}

const LAYOUTS = { FULL: FullHero, SPLIT: SplitHero, MINIMAL: MinimalHero };

export function Hero({ gallery }) {
  const Layout = LAYOUTS[gallery.coverLayout] ?? FullHero;
  return <Layout gallery={gallery} />;
}
