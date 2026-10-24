// Full-screen photo viewer. Same tools as the studio's (admin/…/gallery/viewer/PhotoViewer.jsx), minus the
// ones that change the studio's files: Favorite (double tap too), Zoom, Compare two photos, Rotate &
// flip, Resize, Info and Download. Rotate / Resize only shape the client's own DOWNLOAD: the preview is
// drawn on a canvas and the server makes the real file when "Download edited" is tapped; nothing is stored.
// Phones: icon toolbar at the bottom, panels as a bottom sheet, swipe to browse. md+: labels, side panel, strip.
import {
  ArrowPathIcon,
  ArrowsPointingOutIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HeartIcon,
  InformationCircleIcon,
  MagnifyingGlassPlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { DownloadMenu } from "components/DownloadMenu";
import { EditPanels } from "components/viewer/EditPanels";
import { InfoPanel } from "components/viewer/InfoPanel";
import { EditedImage } from "components/viewer/EditedImage";
import { useEditedPreview } from "components/viewer/useEditedPreview";
import {
  clampZoom,
  editQuery,
  EMPTY_EDITS,
  FIT_VIEW,
  hasEdits,
  turnedSize,
} from "components/viewer/viewerEdits";
import { ZoomBar, ZoomStage } from "components/viewer/ZoomStage";
import { photoUrl } from "services/portal";

const SWIPE_PX = 50;
const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function CompareGlyph({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="8" height="14" />
      <rect x="13" y="5" width="8" height="14" />
    </svg>
  );
}

// Full-height strip at each side of the stage (md+): the whole strip is the button.
function SideZone({ side, label, onClick }) {
  const Icon = side === "left" ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={clsx(
        "group absolute inset-y-0 z-[1] hidden w-20 cursor-pointer items-center justify-center text-white/60 transition-colors duration-200 hover:bg-[#2a4a6e]/40 hover:text-white hover:backdrop-blur-sm focus-visible:bg-[#2a4a6e]/40 focus-visible:text-white focus-visible:outline-none motion-reduce:transition-none md:flex lg:w-24",
        side === "left" ? "left-0" : "right-0",
      )}
    >
      <Icon className="size-6" aria-hidden="true" />
    </button>
  );
}

export function Viewer({
  slug,
  gallery,
  photos,
  index,
  total,
  onIndex,
  onClose,
  onNearEnd,
  favoritesEnabled,
  downloadEnabled,
  fullQuality,
  busy,
  message,
  onFavorite,
  onSaveFull,
  onSaveWeb,
  onSaveEdited,
}) {
  const { t } = useTranslation();
  const photo = photos[index];
  const [panel, setPanel] = useState(null); // rotate | resize | info
  const [edits, setEdits] = useState(EMPTY_EDITS);
  const [zoom, setZoom] = useState(false);
  const [compare, setCompare] = useState(false);
  const [otherId, setOtherId] = useState(null);
  const [zoomView, setZoomView] = useState(FIT_VIEW);
  const [zoomTool, setZoomTool] = useState("in");
  const [fitA, setFitA] = useState(0);
  const [burst, setBurst] = useState(false);
  const [hint, setHint] = useState(null);
  const [saving, setSaving] = useState(false); // the edited download is being made (can take a few seconds)
  const burstTimer = useRef(null);
  const hintTimer = useRef(null);
  const start = useRef(null);
  const stripRef = useRef(null);
  const [dragX, setDragX] = useState(0);
  const [settle, setSettle] = useState(false);
  const lastTap = useRef(null);
  const closeRef = useRef(null);
  const dialogRef = useRef(null);

  const canEdit = downloadEnabled && fullQuality; // the edit becomes a full-quality download
  const webSrc = photoUrl(slug, photo, "web");
  const preview = useEditedPreview(webSrc, edits, zoom || compare); // the main stage draws with CSS
  const base = {
    width: photo.width ?? preview.width,
    height: photo.height ?? preview.height,
  };
  const dirty = hasEdits(edits);
  const result = edits.resize ?? turnedSize(base.width, base.height, edits);
  const other =
    photos.find((p) => p.id === otherId && p.id !== photo.id) ??
    photos[(index + 1) % photos.length];
  const setName = gallery.sets.find((s) => s.id === photo.setId)?.name;
  const canSwipe = !compare && !zoom && photos.length > 1;
  // While editing, Zoom and Compare show the edited preview (what the download will be), not the plain copy.
  const shown =
    dirty && preview.current
      ? { src: preview.url, width: preview.width, height: preview.height }
      : { src: webSrc, width: photo.width, height: photo.height };

  const go = useCallback(
    (step) => {
      if (photos.length < 2) return;
      const next = index + step;
      // Only wrap around once every photo is loaded: past the loaded end there are more to come.
      if ((next >= photos.length || next < 0) && photos.length < total) {
        if (next >= photos.length) onNearEnd?.();
        return;
      }
      setZoom(false);
      onIndex((next + photos.length) % photos.length);
    },
    [index, onIndex, onNearEnd, photos.length, total],
  );

  // A new photo starts clean: no edits. A new photo, pair or mode starts at fit (edits survive Zoom / Compare).
  useEffect(() => {
    setEdits(EMPTY_EDITS);
  }, [photo.id]);
  useEffect(() => {
    setZoomView(FIT_VIEW);
    setFitA(0);
  }, [photo.id, otherId, zoom, compare]);
  useEffect(
    () => () => {
      clearTimeout(burstTimer.current);
      clearTimeout(hintTimer.current);
    },
    [],
  );

  const change = (patch) =>
    setEdits((e) => ({
      ...e,
      ...patch,
      ...("rot" in patch ||
      "fine" in patch ||
      "flipH" in patch ||
      "flipV" in patch
        ? { resize: null }
        : {}),
    }));
  const openPanel = (id) => {
    setCompare(false);
    setZoom(false);
    setPanel((cur) => (cur === id ? null : id));
  };
  const toggleZoom = () => {
    setCompare(false);
    setZoom((z) => !z);
  };
  const toggleCompare = () => {
    setZoom(false);
    setPanel(null);
    setCompare((c) => !c);
    if (!compare) {
      setHint(t("viewer.pickSecond"));
      clearTimeout(hintTimer.current);
      hintTimer.current = setTimeout(() => setHint(null), 3500);
    }
  };

  // Tab stays inside the viewer (it is modal): the last visible control wraps to the first and back.
  const trapFocus = (e) => {
    const nodes = [
      ...(dialogRef.current?.querySelectorAll(FOCUSABLE) ?? []),
    ].filter((el) => el.getClientRects().length > 0);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const inside = dialogRef.current.contains(document.activeElement);
    if (e.shiftKey && (!inside || document.activeElement === first)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
      e.preventDefault();
      first.focus();
    }
  };

  // Esc steps back one layer at a time: panel → zoom / compare → the viewer (the Download menu handles its own).
  const back = () => {
    if (panel) setPanel(null);
    else if (zoom) setZoom(false);
    else if (compare) setCompare(false);
    else onClose();
  };

  const doubleTap = () => {
    if (!favoritesEnabled || busy || zoom || compare) return;
    if (!photo.favorite) {
      setBurst(true);
      clearTimeout(burstTimer.current);
      burstTimer.current = setTimeout(() => setBurst(false), 650);
    }
    onFavorite(photo);
  };

  // Keyboard: ←/→ browse, F favorite, Z zoom, C compare, I info; while zooming + / − / 0. Esc steps back.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Tab") return trapFocus(e);
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const k = e.key.toLowerCase();
      if (k === "escape") back();
      else if (k === "arrowleft") go(-1);
      else if (k === "arrowright") go(1);
      else if (k === "f" && favoritesEnabled && !busy) onFavorite(photo);
      else if (k === "z") toggleZoom();
      else if (k === "c") toggleCompare();
      else if (k === "i") openPanel("info");
      else if ((zoom || compare) && (k === "+" || k === "="))
        setZoomView((v) => ({ ...v, s: clampZoom(v.s * 1.5) }));
      else if ((zoom || compare) && k === "-")
        setZoomView((v) => ({ ...v, s: clampZoom(v.s / 1.5) }));
      else if ((zoom || compare) && k === "0") setZoomView(FIT_VIEW);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  // Preload the neighbours; ask for the next page a few photos before the end.
  useEffect(() => {
    [photos[index - 1], photos[index + 1]].filter(Boolean).forEach((p) => {
      const img = new Image();
      img.src = photoUrl(slug, p, "web");
    });
    if (index >= photos.length - 5) onNearEnd?.();
  }, [index, photos, slug, onNearEnd]);

  // The strip follows the current photo (arrows, swipe, keyboard). Picking B while comparing must not
  // move it: the thumb was just tapped, so it is already in view.
  useEffect(() => {
    const el = stripRef.current?.querySelector('[data-current="a"]');
    el?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: "smooth",
    });
  }, [photo.id, compare]);

  // Swipe sideways to browse (the photo follows the finger), down to close (like iOS Photos); a quick
  // second tap is the double tap.
  const onPointerDown = (e) => {
    if (!canSwipe || e.button > 0 || e.target.closest("button")) return;
    start.current = { x: e.clientX, y: e.clientY, moved: false };
    setSettle(false);
  };
  const onPointerMove = (e) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (
      !s.moved &&
      Math.abs(dx) > 10 &&
      Math.abs(dx) > Math.abs(e.clientY - s.y)
    ) {
      s.moved = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    if (s.moved) setDragX(dx);
  };
  const cancelSwipe = () => {
    start.current = null;
    setSettle(true);
    setDragX(0);
  };
  const onPointerUp = (e) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    start.current = null;
    setDragX(0);
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const now = performance.now();
      const prev = lastTap.current;
      if (
        prev &&
        now - prev.at < 300 &&
        Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 40
      ) {
        lastTap.current = null;
        doubleTap();
      } else lastTap.current = { at: now, x: e.clientX, y: e.clientY };
      return;
    }
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy))
      go(dx < 0 ? 1 : -1);
    else if (
      !panel &&
      !dirty &&
      dy > SWIPE_PX * 2 &&
      Math.abs(dy) > Math.abs(dx)
    )
      onClose();
    else setSettle(true); // too short: slide back to the center
  };

  // ---- pieces ----------------------------------------------------------------------------

  const tool = (on, label, Icon, onClick) => (
    <button
      key={label}
      type="button"
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={clsx(
        "flex h-14 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 transition-colors md:flex-none md:px-4",
        on ? "bg-white text-[#151515]" : "text-white hover:bg-white/10",
      )}
    >
      <Icon className="size-6 md:size-5" aria-hidden="true" />
      <span className="caps hidden text-[0.625rem] md:block">{label}</span>
    </button>
  );

  const toolbar = (
    <nav
      aria-label={t("viewer.tools")}
      className="flex shrink-0 items-stretch justify-around border-t border-white/15 pb-(--safe-bottom) md:justify-center md:gap-1"
    >
      {favoritesEnabled &&
        tool(
          photo.favorite,
          photo.favorite ? t("viewer.unfavorite") : t("viewer.favorite"),
          photo.favorite ? HeartSolid : HeartIcon,
          () => !busy && onFavorite(photo),
        )}
      {tool(zoom, t("viewer.zoom"), MagnifyingGlassPlusIcon, toggleZoom)}
      {photos.length > 1 &&
        tool(compare, t("viewer.compare"), CompareGlyph, toggleCompare)}
      {canEdit &&
        tool(panel === "rotate", t("viewer.rotate"), ArrowPathIcon, () =>
          openPanel("rotate"),
        )}
      {canEdit &&
        tool(
          panel === "resize",
          t("viewer.resize"),
          ArrowsPointingOutIcon,
          () => openPanel("resize"),
        )}
      {tool(panel === "info", t("viewer.info"), InformationCircleIcon, () =>
        openPanel("info"),
      )}
      {downloadEnabled && (
        <div className="flex h-14 min-w-12 flex-1 items-center justify-center md:flex-none md:px-2">
          <DownloadMenu
            variant="viewer"
            count={1}
            fullQuality={fullQuality}
            busy={busy}
            onFull={() => onSaveFull(photo)}
            onWeb={() => onSaveWeb(photo)}
          />
        </div>
      )}
    </nav>
  );

  const zoomProps = { view: zoomView, onView: setZoomView, tool: zoomTool };
  const zoomBar = (
    <ZoomBar
      view={zoomView}
      onView={setZoomView}
      tool={zoomTool}
      onTool={setZoomTool}
      fit={fitA}
    />
  );

  const stage = compare ? (
    <div className="flex size-full flex-col p-2">
      <div className="flex shrink-0 justify-center pb-2">{zoomBar}</div>
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 md:flex-row">
        <ComparePane
          slug={slug}
          photo={photo}
          shown={shown}
          label="A"
          favoritesEnabled={favoritesEnabled}
          busy={busy}
          onFavorite={onFavorite}
          zoom={zoomProps}
          onFit={setFitA}
        />
        <ComparePane
          slug={slug}
          photo={other}
          label="B"
          favoritesEnabled={favoritesEnabled}
          busy={busy}
          onFavorite={onFavorite}
          zoom={zoomProps}
        />
      </div>
    </div>
  ) : zoom ? (
    <div className="relative size-full">
      <ZoomStage
        key={`${photo.id}-${shown.src}`}
        src={shown.src}
        width={shown.width}
        height={shown.height}
        onFit={setFitA}
        {...zoomProps}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-3">
        <div className="pointer-events-auto">{zoomBar}</div>
      </div>
    </div>
  ) : (
    <div className="relative flex size-full items-center justify-center p-3 md:p-6">
      <EditedImage
        key={photo.id}
        src={webSrc}
        width={photo.width}
        height={photo.height}
        edits={edits}
        alt={photo.filename}
      />
      {burst && (
        <HeartSolid
          className="pointer-events-none absolute size-24 animate-ping text-white drop-shadow"
          aria-hidden="true"
        />
      )}
    </div>
  );

  const panelBody =
    panel === "info" ? (
      <InfoPanel slug={slug} photo={photo} setName={setName} />
    ) : panel ? (
      <EditPanels panel={panel} edits={edits} base={base} onChange={change} />
    ) : null;

  const strip = (
    <div
      ref={stripRef}
      className={clsx(
        "h-[5.5rem] shrink-0 items-center gap-1.5 overflow-x-auto border-t border-white/15 px-4",
        compare ? "flex" : "hidden md:flex",
      )}
      role="list"
      aria-label={t("viewer.strip")}
    >
      {photos.map((p, i) => {
        const isA = p.id === photo.id;
        const isB = compare && p.id === other.id;
        return (
          <button
            key={p.id}
            role="listitem"
            type="button"
            aria-label={p.filename}
            aria-current={isA || isB ? "true" : undefined}
            data-current={isA ? "a" : undefined}
            onClick={() =>
              compare ? !isA && setOtherId(p.id) : (setZoom(false), onIndex(i))
            }
            className={clsx(
              "relative mx-auto h-14 w-[4.5rem] shrink-0 outline-offset-2 transition-opacity first:ml-auto last:mr-auto",
              isA
                ? "opacity-100 outline-2 outline-white"
                : isB
                  ? "opacity-100 outline-2 outline-white outline-dashed"
                  : "opacity-55 hover:opacity-90",
            )}
          >
            <img
              src={photoUrl(slug, p, "thumb")}
              alt=""
              loading="lazy"
              draggable={false}
              className="size-full object-cover"
            />
            {favoritesEnabled && p.favorite && (
              <HeartSolid
                aria-hidden="true"
                className="absolute right-1 bottom-1 size-3.5 text-white drop-shadow"
              />
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={t("viewer.label", { n: index + 1, total })}
      className="fixed inset-0 z-50 flex flex-col bg-[#111111] text-white"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 px-2 pt-[calc(var(--safe-top)+0.5rem)] pb-2 md:px-4">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t("viewer.close")}
          className="flex size-11 shrink-0 items-center justify-center text-white/90 hover:text-white"
        >
          <XMarkIcon className="size-6" />
        </button>
        <div className="min-w-0 text-center">
          <p className="caps text-white/90">
            {t("viewer.counter", { n: index + 1, total })}
          </p>
          <p className="text-small truncate text-white/60">{photo.filename}</p>
        </div>
        {/* The favorite mark lives here, mirroring the close button: never under the side arrows, and seen in every mode. */}
        <span
          className="flex size-11 shrink-0 items-center justify-center"
          title={
            photo.favorite && favoritesEnabled
              ? t("viewer.isFavorite")
              : undefined
          }
        >
          {photo.favorite && favoritesEnabled && (
            <>
              <HeartSolid
                aria-hidden="true"
                className="size-6 text-white drop-shadow"
              />
              <span className="sr-only">{t("viewer.isFavorite")}</span>
            </>
          )}
        </span>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <main
          className={clsx(
            "relative min-w-0 flex-1 overflow-hidden",
            canSwipe && "touch-none select-none",
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={cancelSwipe}
        >
          <div
            className={clsx(
              "size-full",
              settle &&
                "transition-transform duration-200 ease-out motion-reduce:transition-none",
            )}
            style={
              dragX
                ? {
                    transform: `translateX(${dragX}px)`,
                    opacity: Math.max(0.5, 1 - Math.abs(dragX) / 600),
                  }
                : undefined
            }
          >
            {stage}
          </div>
          {(message || hint) && (
            // Clear of the zoom bar (bottom while zooming, top while comparing) and of the panes' buttons.
            <p
              role="status"
              className={clsx(
                "text-small pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/15 px-4 py-2 text-center text-white backdrop-blur",
                zoom ? "bottom-20" : compare ? "top-16" : "bottom-3",
              )}
            >
              {message ?? hint}
            </p>
          )}
          {canSwipe && (
            <>
              <SideZone
                side="left"
                label={t("viewer.previous")}
                onClick={() => go(-1)}
              />
              <SideZone
                side="right"
                label={t("viewer.next")}
                onClick={() => go(1)}
              />
            </>
          )}
        </main>
        {panel && (
          <aside
            aria-label={t(`viewer.panel.${panel}`)}
            className="bg-paper text-ink max-md:border-line flex min-h-0 flex-col max-md:absolute max-md:inset-x-0 max-md:bottom-0 max-md:z-10 max-md:max-h-[58%] max-md:border-t md:w-80 md:shrink-0"
          >
            <div className="border-line flex shrink-0 items-center justify-between border-b py-3 pr-2 pl-6">
              <h2 className="text-[1.5rem] leading-7">
                {t(`viewer.panel.${panel}`)}
              </h2>
              <button
                type="button"
                onClick={() => setPanel(null)}
                aria-label={t("viewer.closePanel")}
                className="text-ink hover:bg-paper-alt flex size-11 items-center justify-center"
              >
                <XMarkIcon className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {panelBody}
            </div>
          </aside>
        )}
      </div>
      {/* Pending edits: a row of its own under the photo (and under the phone's panel sheet), never
          floating over it, so it can't cover the zoom bar, Compare, the crop handles or a toast. */}
      {dirty && (
        <div
          role="region"
          aria-label={t("viewer.unsaved")}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex shrink-0 items-center justify-center gap-3 border-t border-white/15 px-3 py-2 text-white"
        >
          <span className="text-small hidden text-white/70 sm:inline">
            {result.width} × {result.height} px
          </span>
          <button
            type="button"
            onClick={() => setEdits(EMPTY_EDITS)}
            className="caps min-h-11 border border-white/40 px-4 text-white hover:bg-white/10"
          >
            {t("viewer.cancel")}
          </button>
          <button
            type="button"
            disabled={busy || saving}
            onClick={async () => {
              setSaving(true);
              await onSaveEdited(photo, editQuery(edits));
              setSaving(false);
            }}
            className="caps min-h-11 border border-white bg-white px-4 text-[#151515] hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? t("viewer.preparingEdit") : t("viewer.downloadEdited")}
          </button>
        </div>
      )}
      {strip}
      {toolbar}
    </div>
  );
}

function ComparePane({
  slug,
  photo,
  shown,
  label,
  favoritesEnabled,
  busy,
  onFavorite,
  zoom,
  onFit,
}) {
  const { t } = useTranslation();
  const img = shown ?? {
    src: photoUrl(slug, photo, "web"),
    width: photo.width,
    height: photo.height,
  };
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1 bg-[#181818]">
        <ZoomStage
          key={`${photo.id}-${img.src}`}
          src={img.src}
          width={img.width}
          height={img.height}
          onFit={onFit}
          {...zoom}
        >
          <span className="caps pointer-events-none absolute top-2.5 left-2.5 bg-white px-1.5 py-0.5 text-[0.625rem] text-[#151515]">
            {label}
          </span>
        </ZoomStage>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 py-1.5 pr-1 pl-3">
        <div className="text-body min-w-0 truncate">{photo.filename}</div>
        {favoritesEnabled && (
          <button
            type="button"
            disabled={busy}
            aria-pressed={Boolean(photo.favorite)}
            aria-label={
              photo.favorite ? t("viewer.unfavorite") : t("viewer.favorite")
            }
            onClick={() => onFavorite(photo)}
            className={clsx(
              "flex size-11 shrink-0 items-center justify-center disabled:opacity-40",
              photo.favorite
                ? "bg-white text-[#151515]"
                : "text-white hover:bg-white/10",
            )}
          >
            {photo.favorite ? (
              <HeartSolid className="size-5" />
            ) : (
              <HeartIcon className="size-5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
