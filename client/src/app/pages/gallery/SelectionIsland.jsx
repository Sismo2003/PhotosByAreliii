// Floating island for the selected photos (same idea as the admin's SelectionIsland): appears
// while something is selected, holds Favorite + Download + Clear. Sits above the bottom tab bar on phones.
import { HeartIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { DownloadMenu } from "components/DownloadMenu";

function IslandButton({ label, icon: Icon, children, className, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        "text-small inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 whitespace-nowrap text-ink transition-colors hover:bg-line disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...rest}
    >
      <Icon className="size-5 shrink-0" strokeWidth={1.6} aria-hidden="true" />
      {children && <span>{children}</span>}
    </button>
  );
}

export function SelectionIsland({
  count,
  favoritesEnabled,
  allFavorite,
  downloadEnabled,
  fullQuality,
  busy,
  message,
  onFavorite,
  onSaveFull,
  onSaveWeb,
  onClear,
}) {
  const { t } = useTranslation();
  const FavIcon = allFavorite ? HeartSolid : HeartIcon;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--safe-bottom)+4.5rem)] z-30 flex flex-col items-center gap-2 px-3 md:bottom-6">
      {message && (
        <p role="status" className="text-small pointer-events-auto rounded-full bg-ink px-4 py-2 text-on-ink">
          {message}
        </p>
      )}
      <div
        role="toolbar"
        aria-label={t("gallery.selectedCount", { count })}
        className="pointer-events-auto flex max-w-full items-center gap-1 rounded-full bg-paper/90 p-1.5 shadow-soft ring-1 ring-line-strong backdrop-blur-xl dark:shadow-none"
      >
        <span className="text-small px-3 tabular-nums text-ink" aria-hidden="true">
          {count}
        </span>
        {favoritesEnabled && (
          <IslandButton
            label={allFavorite ? t("gallery.unfavorite") : t("gallery.favorite")}
            icon={FavIcon}
            disabled={busy}
            onClick={onFavorite}
          >
            <span className="hidden sm:inline">{allFavorite ? t("gallery.unfavorite") : t("gallery.favorite")}</span>
          </IslandButton>
        )}
        {downloadEnabled && <DownloadMenu count={count} fullQuality={fullQuality} busy={busy} onFull={onSaveFull} onWeb={onSaveWeb} />}
        <IslandButton label={t("gallery.clearSelection")} icon={XMarkIcon} onClick={onClear} className="px-3" />
      </div>
    </div>
  );
}
