// /client/galleries/:slug · one gallery: cover, sets as chips, and the photos in a square grid
// (iOS Photos style) cropped on the faces the backend found. Tapping a photo opens the viewer;
// `?photo=<id>` keeps it in the URL so the phone's Back gesture closes it.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { CheckIcon, HeartIcon } from "@heroicons/react/24/solid";
import { CheckCircleIcon, MinusCircleIcon, Squares2X2Icon } from "@heroicons/react/24/outline";

import { Skeleton } from "components/ui";
import { ErrorState } from "components/ErrorState";
import NotFound from "app/pages/NotFound";
import { useRequest } from "hooks/useRequest";
import { useDocumentTitle } from "hooks/useDocumentTitle";
import { DownloadMenu } from "components/DownloadMenu";
import { FocusImg } from "components/FocusImg";
import { useMarquee } from "hooks/useMarquee";
import { getGallery, photoUrl } from "services/portal";
import { formatDate } from "utils/date";
import { usePhotoPages } from "./usePhotoPages";
import { Viewer } from "./Viewer";
import { Hero } from "./Hero";
import { SelectionIsland } from "./SelectionIsland";
import { useGalleryActions } from "./useGalleryActions";

const GRID = "grid grid-cols-3 gap-0.5 sm:grid-cols-4 lg:grid-cols-5";

function ExpiryNotice({ gallery }) {
  const { t } = useTranslation();
  if (gallery.daysLeft == null || gallery.daysLeft > 7) return null;
  return (
    <p role="status" className="border-b border-warning/40 bg-warning/10 px-4 py-3 text-center text-small text-ink">
      {gallery.daysLeft === 0
        ? t("gallery.expiresToday")
        : t("gallery.expiresSoon", { count: gallery.daysLeft, date: formatDate(gallery.expiresAt, "LLL d") })}
    </p>
  );
}

const FAV = "fav";

// One bar action: an icon on phones (the sets need the room), icon + word from md. The name is always
// in aria-label / title for screen readers and mouse hover.
function BarAction({ label, icon: Icon, solid, className, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        "caps inline-flex size-11 shrink-0 items-center justify-center gap-1.5 rounded-full transition-colors disabled:opacity-50 md:size-auto md:min-h-9 md:rounded-none md:px-2",
        solid ? "bg-ink text-on-ink md:bg-transparent md:text-ink md:underline md:underline-offset-4" : "text-ink hover:bg-line md:underline md:underline-offset-4 md:hover:bg-transparent",
        className,
      )}
      {...rest}
    >
      <Icon className="size-6 shrink-0 md:size-5" strokeWidth={1.6} aria-hidden="true" />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

// Sets are the point of this bar, so they get the width. While browsing the actions are Download all +
// Select; while selecting they are Select all + Done (the island below already downloads the selection).
function Chips({ sets, value, onChange, total, favorites, favoriteCount, selecting, onToggleSelect, onSelectAll, onDeselectAll, allSelected, selectingAll, download }) {
  const { t } = useTranslation();
  const options = [
    { id: null, name: t("gallery.allPhotos"), photoCount: total },
    ...sets,
    ...(favorites ? [{ id: FAV, name: t("gallery.favorites"), photoCount: favoriteCount }] : []),
  ];
  return (
    <nav
      aria-label={t("gallery.sets")}
      className="sticky top-0 z-20 border-b border-line bg-paper/90 pt-(--safe-top) backdrop-blur-md md:top-16 md:pt-0 dark:bg-dark-900/90"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-1 py-2 pl-4 pr-2 sm:px-8 md:gap-2 md:py-3">
        <div className="hide-scrollbar -ml-1 flex min-w-0 flex-1 gap-2 overflow-x-auto py-1 pl-1 pr-4">
          {options.map((s) => {
            const on = value === s.id;
            return (
              <button
                key={s.id ?? "all"}
                type="button"
                aria-pressed={on}
                onClick={() => onChange(s.id)}
                className={clsx(
                  "caps min-h-11 shrink-0 border px-4 whitespace-nowrap transition-colors md:min-h-9",
                  on ? "border-ink bg-ink text-on-ink" : "border-line-strong text-ink hover:border-ink",
                )}
              >
                {s.name} <span className={on ? "opacity-70" : "text-ink-muted"}>{s.photoCount}</span>
              </button>
            );
          })}
        </div>
        <span aria-hidden="true" className="h-6 w-px shrink-0 bg-line-strong" />
        {selecting ? (
          allSelected ? (
            <BarAction label={t("gallery.deselectAll")} icon={MinusCircleIcon} onClick={onDeselectAll} />
          ) : (
            <BarAction label={t("gallery.selectAll")} icon={Squares2X2Icon} disabled={selectingAll} onClick={onSelectAll} />
          )
        ) : (
          download
        )}
        <BarAction
          solid={selecting}
          label={selecting ? t("gallery.cancelSelect") : t("gallery.select")}
          icon={selecting ? CheckIcon : CheckCircleIcon}
          aria-pressed={selecting}
          onClick={onToggleSelect}
        />
      </div>
    </nav>
  );
}

function GridSkeleton({ count = 15 }) {
  return (
    <div className={GRID} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="aspect-square" />
      ))}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div aria-busy="true">
      <Skeleton className="h-[62vh] max-h-[640px] min-h-[360px] w-full md:h-[56vh]" />
      <div className="mx-auto max-w-6xl pt-4 sm:px-8">
        <GridSkeleton />
      </div>
    </div>
  );
}

function PhotoGrid({ slug, filter, total, onOpen, pages, selected, selecting, onToggle, onSelect, favoritesEnabled }) {
  const { t } = useTranslation();
  const sentinel = useRef(null);
  const gridRef = useRef(null);
  const { photos, loading, done, error, loadMore, retry } = pages;
  // Rubber-band selection with a mouse, like the admin's grid (touch keeps scrolling).
  const marquee = useMarquee({ containerRef: gridRef, getSelected: () => selected, onChange: onSelect });

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return undefined;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  if (loading && photos.length === 0) return <GridSkeleton />;
  if (done && photos.length === 0 && filter === FAV) {
    return <p className="px-4 py-16 text-center text-ink-muted">{t("gallery.favoritesEmpty")}</p>;
  }

  return (
    <>
      <div
        ref={gridRef}
        onPointerDown={marquee.onPointerDown}
        onClickCapture={marquee.onClickCapture}
        onDragStart={(e) => e.preventDefault()}
        className="relative min-h-[60vh] pb-28 select-none"
      >
        {marquee.box && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-20 rounded-sm border border-blue-500 bg-blue-500/15"
            style={{ left: marquee.box.left, top: marquee.box.top, width: marquee.box.width, height: marquee.box.height }}
          />
        )}
      <div className="mx-auto max-w-6xl sm:px-8">
      <ul className={GRID} aria-label={t("gallery.photos", { count: total })} key={String(filter)}>
        {photos.map((photo, i) => {
          const on = selected.has(photo.id);
          return (
            <li key={photo.id} data-photo-id={photo.id} className="group relative">
              <button
                type="button"
                onClick={() => (selecting ? onToggle(photo.id) : onOpen(i))}
                aria-label={t("viewer.open", { name: photo.filename })}
                aria-pressed={selecting ? on : undefined}
                className={clsx("block aspect-square w-full overflow-hidden bg-paper-alt focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink", selecting ? "cursor-pointer" : "cursor-zoom-in")}
              >
                <FocusImg
                  photo={photo}
                  src={photoUrl(slug, photo, "thumb")}
                  loading="lazy"
                  decoding="async"
                  className={clsx("size-full object-cover transition-all duration-200 hover:opacity-90", on && "scale-90 opacity-80")}
                />
              </button>
              {/* Checkmark: always tappable, so a first tap can start a selection without the Select button. */}
              <button
                type="button"
                onClick={() => onToggle(photo.id)}
                aria-label={t(on ? "gallery.unselectPhoto" : "gallery.selectPhoto", { name: photo.filename })}
                aria-pressed={on}
                className={clsx(
                  "absolute top-0 left-0 flex size-11 cursor-pointer items-start justify-start p-1.5 transition-opacity",
                  on || selecting ? "opacity-100" : "opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
                )}
              >
                <span
                  className={clsx(
                    "flex size-6 items-center justify-center rounded-full border-2",
                    on ? "border-ink bg-ink text-on-ink" : "border-white bg-black/30 text-transparent",
                  )}
                >
                  <CheckIcon className="size-4" />
                </span>
              </button>
              {favoritesEnabled && photo.favorite && (
                <HeartIcon aria-hidden="true" className="pointer-events-none absolute right-1.5 bottom-1.5 size-5 text-white drop-shadow" />
              )}
            </li>
          );
        })}
      </ul>
      </div>
      {loading && photos.length > 0 && <GridSkeleton count={5} />}
      {error && <ErrorState error={error} onRetry={retry} />}
      {!done && <div ref={sentinel} className="h-px" />}
      </div>
    </>
  );
}

export default function Gallery() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState(null); // null = all | set id | "fav"
  const [selected, setSelected] = useState(() => new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const { status, data: gallery, error, retry } = useRequest(() => getGallery(slug), [slug]);
  const setId = typeof filter === "number" ? filter : null;
  const pages = usePhotoPages(slug, setId, filter === FAV);
  const openedHere = useRef(false);
  useDocumentTitle(gallery?.title);

  useEffect(() => {
    if (gallery) setFavoriteCount(gallery.favoriteCount ?? 0);
  }, [gallery]);

  const actions = useGalleryActions({ slug, gallery, pages, favoriteCount, setFavoriteCount });
  const selecting = selectMode || selected.size > 0;
  const selectedPhotos = useMemo(() => pages.photos.filter((p) => selected.has(p.id)), [pages.photos, selected]);

  const changeFilter = (next) => {
    setFilter(next);
    setSelected(new Set());
  };
  const toggle = useCallback(
    (id) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    [],
  );
  const [selectingAll, setSelectingAll] = useState(false);
  const selectAll = async () => {
    setSelectingAll(true);
    const all = await pages.loadAll();
    setSelectingAll(false);
    if (all) setSelected(new Set(all.map((p) => p.id)));
  };
  const clear = () => {
    setSelected(new Set());
    setSelectMode(false);
  };

  // Esc clears the selection (when the viewer is not open).
  useEffect(() => {
    if (!selecting) return undefined;
    const onKey = (e) => e.key === "Escape" && !params.get("photo") && clear();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // The open photo lives in the URL (?photo=<id>).
  const photoId = Number(params.get("photo")) || null;
  const index = photoId ? pages.photos.findIndex((p) => p.id === photoId) : -1;

  const open = (i) => {
    openedHere.current = true;
    setParams({ photo: String(pages.photos[i].id) });
  };
  const goTo = (i) => setParams({ photo: String(pages.photos[i].id) }, { replace: true });
  const close = useCallback(() => {
    if (openedHere.current) {
      openedHere.current = false;
      window.history.back(); // the Back gesture and the X do the same thing
    } else {
      setParams({}, { replace: true });
    }
  }, [setParams]);

  if (status === "loading" && !gallery) return <PageSkeleton />;
  if (status === "error") return error.status === 404 ? <NotFound /> : <ErrorState error={error} onRetry={retry} />;

  const favoritesEnabled = gallery.favoritesEnabled;
  const downloadEnabled = gallery.downloadMode !== "OFF";
  const fullQuality = gallery.downloadMode === "HIGH_AND_WEB";
  const pick = filter === FAV ? { favorites: true } : setId ? { setId } : { all: true }; // the filter on screen
  const total = filter === FAV ? favoriteCount : setId ? (gallery.sets.find((s) => s.id === setId)?.photoCount ?? 0) : gallery.photoCount;

  return (
    <div>
      <Hero gallery={gallery} />
      <ExpiryNotice gallery={gallery} />
      <Chips
        sets={gallery.sets}
        value={filter}
        onChange={changeFilter}
        total={gallery.photoCount}
        favorites={favoritesEnabled}
        favoriteCount={favoriteCount}
        selecting={selecting}
        onToggleSelect={() => (selecting ? clear() : setSelectMode(true))}
        onSelectAll={selectAll}
        onDeselectAll={() => setSelected(new Set())}
        allSelected={total > 0 && selected.size >= total}
        selectingAll={selectingAll}
        download={
          downloadEnabled && total > 0 ? (
            <DownloadMenu
              variant="bar"
              direction="down"
              label={t("download.all")}
              count={total}
              fullQuality={fullQuality}
              busy={actions.busy}
              onFull={() => actions.saveFull(null, pick)}
              onWeb={() => actions.saveWeb(pages.photos, pick)}
            />
          ) : null
        }
      />

      <section className="pt-0.5 sm:pt-6">
        <PhotoGrid
          slug={slug}
          filter={filter}
          total={total}
          onOpen={open}
          pages={pages}
          selected={selected}
          selecting={selecting}
          onToggle={toggle}
          onSelect={setSelected}
          favoritesEnabled={favoritesEnabled}
        />
      </section>

      {selected.size > 0 && index < 0 && (
        <SelectionIsland
          count={selected.size}
          favoritesEnabled={favoritesEnabled}
          allFavorite={selectedPhotos.length > 0 && selectedPhotos.every((p) => p.favorite)}
          downloadEnabled={downloadEnabled}
          fullQuality={fullQuality}
          busy={actions.busy}
          message={actions.message}
          onFavorite={() => actions.setFavorite(selectedPhotos, !selectedPhotos.every((p) => p.favorite))}
          onSaveFull={() => actions.saveFull(selectedPhotos)}
          onSaveWeb={() => actions.saveWeb(selectedPhotos)}
          onClear={clear}
        />
      )}

      {index >= 0 && (
        <Viewer
          slug={slug}
          gallery={gallery}
          photos={pages.photos}
          index={index}
          total={total}
          onIndex={goTo}
          onClose={close}
          onNearEnd={pages.loadMore}
          favoritesEnabled={favoritesEnabled}
          downloadEnabled={downloadEnabled}
          fullQuality={fullQuality}
          busy={actions.busy}
          message={actions.message}
          onFavorite={(photo) => actions.setFavorite([photo], !photo.favorite)}
          onSaveFull={(photo) => actions.saveFull([photo])}
          onSaveWeb={(photo) => actions.saveWeb([photo])}
          onSaveEdited={(photo, query) => actions.saveEdited(photo, query)}
        />
      )}
    </div>
  );
}
