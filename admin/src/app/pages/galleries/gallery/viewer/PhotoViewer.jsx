// Full-screen photo viewer of the gallery editor (design: GalleryViewer*). Opens from the
// selection bar's "Preview" or a double-click. Tools: Favorite / Hide (double-click = favorite), Zoom
// (ZoomStage.jsx, also inside Compare, both panes in sync), compare two photos, download, and the edit tools (rotate & flip, crop, resize) plus an Info panel.
// Edits are previewed on a canvas and only applied by "Save changes", which REPLACES the original
// (Backend: POST /photos/:id/edit). Clients never see this viewer.
import {
  Dialog,
  DialogPanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import {
  ArrowDownTrayIcon,
  ArrowsPointingOutIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeSlashIcon,
  HeartIcon as HeartOutline,
  InformationCircleIcon,
  MagnifyingGlassPlusIcon,
  ViewfinderCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import clsx from "clsx";
import PropTypes from "prop-types";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { toast } from "sonner";

import { ConfirmModal } from "components/shared/ConfirmModal";
import { Skeleton } from "components/ui";
import { photoDownloadUrl, photoUrl } from "services/galleries";
import {
  bulkPhotosThunk,
  editPhotoThunk,
  setPhotoFocusThunk,
  useGalleriesStore,
} from "slices";

import { formatSize } from "../../labels";
import { PhotoThumb } from "../../parts";
import { CropPanel, ResizePanel, RotatePanel } from "./EditPanels";
import { FocusPanel } from "./FocusPanel";
import { InfoPanel } from "./InfoPanel";
import { ZoomBar, ZoomStage } from "./ZoomStage";
import { EditedImage } from "./EditedImage";
import { useEditedPreview } from "./useEditedPreview";
import {
  clampZoom,
  croppedSize,
  describeEdits,
  EMPTY_EDITS,
  FIT_VIEW,
  hasEdits,
  toPayload,
} from "./viewerEdits";

const TITLES = {
  rotate: "Rotate & flip",
  crop: "Crop",
  resize: "Resize",
  focus: "Focus point",
  info: "Photo info",
};

function CropGlyph({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M7 2v15h15" />
      <path d="M2 7h15v15" />
    </svg>
  );
}
CropGlyph.propTypes = { className: PropTypes.string };

// Full-height strip at each side of the stage: the whole strip is the button, lit in matte blue on hover.
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
      <Icon
        className={clsx(
          "size-6 transition-transform duration-200 motion-reduce:transition-none",
          side === "left"
            ? "group-hover:-translate-x-1"
            : "group-hover:translate-x-1",
        )}
        aria-hidden="true"
      />
    </button>
  );
}
SideZone.propTypes = {
  side: PropTypes.oneOf(["left", "right"]).isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

const TOOLS = [
  { id: "rotate", label: "Rotate", Icon: ArrowPathIcon },
  { id: "crop", label: "Crop", Icon: CropGlyph },
  { id: "resize", label: "Resize", Icon: ArrowsPointingOutIcon },
  { id: "focus", label: "Focus", Icon: ViewfinderCircleIcon },
  { id: "info", label: "Info", Icon: InformationCircleIcon },
];

export function PhotoViewer({ gallery, photos, startId, compareId, onClose }) {
  const busy = useGalleriesStore((s) => s.busy);
  const [currentId, setCurrentId] = useState(startId);
  const [panel, setPanel] = useState(null);
  const [edits, setEdits] = useState(EMPTY_EDITS);
  const [ratio, setRatio] = useState("free");
  const [draft, setDraft] = useState(undefined); // react-image-crop value, in %
  const [zoom, setZoom] = useState(false);
  const [compare, setCompare] = useState(compareId != null);
  const [zoomView, setZoomView] = useState(FIT_VIEW);
  const [zoomTool, setZoomTool] = useState("in");
  const [fitA, setFitA] = useState(0);
  const [otherId, setOtherId] = useState(compareId ?? null);
  const [confirm, setConfirm] = useState(false);
  const [burst, setBurst] = useState(false);
  const burstTimer = useRef(null);
  // Swipe / drag sideways to browse. `settle` animates back to center when the swipe falls short.
  const swipe = useRef(null);
  const [dragX, setDragX] = useState(0);
  const [settle, setSettle] = useState(false);

  const index = Math.max(
    0,
    photos.findIndex((p) => p.id === currentId),
  );
  const photo = photos[index];
  const dirty = hasEdits(edits);
  const webSrc = photoUrl(gallery.id, photo.id, "web", photo.editedAt);
  // The canvas is only drawn for Crop and for a pending crop; rotate / flip / straighten draw with CSS (EditedImage).
  const preview = useEditedPreview(
    webSrc,
    edits,
    panel === "crop" ? null : edits.crop,
    panel === "crop" || !!edits.crop,
  );
  const base = {
    width: photo.width ?? preview.width,
    height: photo.height ?? preview.height,
  };
  const other =
    photos.find((p) => p.id === otherId && p.id !== photo.id) ??
    photos[(index + 1) % photos.length];
  const setName = gallery.sets.find((s) => s.id === photo.setId)?.name;

  const guard = useCallback(() => {
    if (!dirty) return false;
    toast.error("You have unsaved edits — save them or press Reset first");
    return true;
  }, [dirty]);

  const resetEdits = () => {
    setEdits(EMPTY_EDITS);
    setRatio("free");
    setDraft(undefined);
  };

  // Geometry changes invalidate a crop made on the old geometry.
  const change = (patch) => {
    const geometry =
      "rot" in patch || "fine" in patch || "flipH" in patch || "flipV" in patch;
    setEdits((e) => ({
      ...e,
      ...patch,
      ...(geometry ? { crop: null, resize: null } : {}),
    }));
    if (geometry) setDraft(undefined);
  };

  const go = useCallback(
    (step) => {
      if (guard()) return;
      setZoom(false);
      setCurrentId(photos[(index + step + photos.length) % photos.length].id);
    },
    [guard, index, photos],
  );

  const canSwipe =
    !compare &&
    !zoom &&
    panel !== "crop" &&
    panel !== "focus" &&
    photos.length > 1;

  const swipeStart = (e) => {
    if (!canSwipe || e.button !== 0 || e.target.closest("button")) return;
    swipe.current = { x: e.clientX, t: Date.now(), moved: false };
    setSettle(false);
  };
  const swipeMove = (e) => {
    const s = swipe.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (!s.moved && Math.abs(dx) > 6) {
      s.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (s.moved) setDragX(dx);
  };
  const swipeEnd = (e) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s?.moved) return;
    const dx = e.clientX - s.x;
    const fast = Math.abs(dx) / Math.max(1, Date.now() - s.t) > 0.5;
    if (Math.abs(dx) > 80 || (fast && Math.abs(dx) > 30)) {
      setDragX(0);
      go(dx < 0 ? 1 : -1);
    } else {
      setSettle(true);
      setDragX(0);
    }
  };

  const close = useCallback(() => {
    if (guard()) return;
    onClose(photo.id);
  }, [guard, onClose, photo.id]);

  const mark = async (target, action, message) => {
    const res = await bulkPhotosThunk(gallery.id, {
      action,
      photoIds: [target.id],
    });
    if (res.ok) {
      if (message) toast.success(message);
    } else toast.error(res.error?.message ?? "Could not update the photo");
    return res.ok;
  };
  // Favorite and Hide have no success toast: the heart / Hidden tag and the button state already show it.
  const toggleFavorite = (p) => mark(p, p.favorite ? "unpick" : "pick");
  const toggleHide = (p) => mark(p, p.hidden ? "show" : "hide");

  const doubleClick = async () => {
    if (zoom || panel === "crop") return;
    const wasFavorite = photo.favorite;
    if (await toggleFavorite(photo)) {
      if (!wasFavorite) {
        setBurst(true);
        clearTimeout(burstTimer.current);
        burstTimer.current = setTimeout(() => setBurst(false), 650);
      }
    }
  };
  useEffect(() => () => clearTimeout(burstTimer.current), []);

  // A new photo, pair or mode starts at fit.
  useEffect(() => {
    setZoomView(FIT_VIEW);
    setFitA(0);
  }, [currentId, otherId, zoom, compare]);

  const openPanel = (id) => {
    // The focus belongs to the saved photo: unsaved edits would make the point land elsewhere.
    if (id === "focus" && panel !== "focus" && guard()) return;
    setCompare(false);
    setZoom(false);
    setPanel((cur) => (cur === id ? null : id));
    if (id === "crop" && !edits.crop) setDraft(undefined);
    if (id === "crop" && edits.crop)
      setDraft({
        unit: "%",
        x: edits.crop.x * 100,
        y: edits.crop.y * 100,
        width: edits.crop.width * 100,
        height: edits.crop.height * 100,
      });
  };

  // Focus tool: a click on the photo sets the point thumbnails keep in view (no toast: the marker moves).
  const setFocus = async (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    const res = await setPhotoFocusThunk(gallery.id, photo.id, {
      x: Math.round(x * 10000) / 10000,
      y: Math.round(y * 10000) / 10000,
    });
    if (!res.ok) toast.error(res.error?.message ?? "Could not save the focus");
  };
  const resetFocus = async () => {
    const res = await setPhotoFocusThunk(gallery.id, photo.id, { reset: true });
    if (!res.ok) toast.error(res.error?.message ?? "Could not reset the focus");
  };

  const toggleZoom = () => {
    if (!zoom && guard()) return;
    setCompare(false);
    if (panel === "crop") setPanel(null);
    setZoom((z) => !z);
  };
  const toggleCompare = () => {
    if (guard()) return;
    setZoom(false);
    setPanel(null);
    setCompare((c) => !c);
    if (!compare) toast("Pick the second photo from the strip below");
  };

  const commitCrop = (pct) => {
    if (!pct || pct.width < 1 || pct.height < 1)
      return setEdits((e) => ({ ...e, crop: null, resize: null }));
    setEdits((e) => ({
      ...e,
      resize: null,
      crop: {
        x: pct.x / 100,
        y: pct.y / 100,
        width: pct.width / 100,
        height: pct.height / 100,
      },
    }));
  };

  const pickRatio = (r) => {
    setRatio(r.id);
    const w = preview.width || 1;
    const h = preview.height || 1;
    const next = r.value
      ? centerCrop(
          makeAspectCrop({ unit: "%", width: 90 }, r.value, w, h),
          w,
          h,
        )
      : (draft ?? { unit: "%", x: 5, y: 5, width: 90, height: 90 });
    setDraft(next);
    commitCrop(next);
  };

  const save = async () => {
    const res = await editPhotoThunk(gallery.id, photo.id, toPayload(edits));
    setConfirm(false);
    if (res.ok) {
      toast.success(`Original replaced — ${photo.originalFilename}`);
      resetEdits();
      setPanel(null);
    } else toast.error(res.error?.message ?? "Could not save the photo");
  };

  // Keyboard: ←/→ browse, P favorite, X hide, Z zoom, C compare, I info; while zooming + / − / 0 (fit).
  // Esc closes (Dialog).
  useEffect(() => {
    const onKey = (e) => {
      if (confirm || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const k = e.key.toLowerCase();
      if (k === "arrowleft") go(-1);
      else if (k === "arrowright") go(1);
      else if (k === "p") toggleFavorite(photo);
      else if (k === "x") toggleHide(photo);
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

  const resultSize = croppedSize(base.width, base.height, edits);

  // ---- pieces -------------------------------------------------------------

  const actionBtn = (on, label, Icon, onClick, extra = {}) => (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={clsx(
        "flex h-14 min-w-14 flex-col items-center justify-center gap-0.5 px-2 transition-colors",
        on ? "bg-white text-[#151515]" : "text-white hover:bg-white/10",
      )}
      {...extra}
    >
      <Icon className="size-5" aria-hidden="true" />
      <span className="caps hidden text-[0.625rem] md:block">{label}</span>
    </button>
  );

  const actions = (
    <div className="flex w-full items-center justify-around md:w-auto md:justify-start md:gap-1">
      {actionBtn(
        photo.favorite,
        "Favorite",
        photo.favorite ? HeartSolid : HeartOutline,
        () => toggleFavorite(photo),
      )}
      {actionBtn(photo.hidden, "Hide", EyeSlashIcon, () => toggleHide(photo))}
      {actionBtn(zoom, "Zoom", MagnifyingGlassPlusIcon, toggleZoom)}
      {actionBtn(compare, "Compare", CompareGlyph, toggleCompare)}
      <Menu>
        <MenuButton
          aria-label="Download"
          title="Download"
          className="flex h-14 min-w-14 flex-col items-center justify-center gap-0.5 px-2 text-white transition-colors hover:bg-white/10 data-open:bg-white data-open:text-[#151515]"
        >
          <ArrowDownTrayIcon className="size-5" aria-hidden="true" />
          <span className="caps hidden text-[0.625rem] md:block">Download</span>
        </MenuButton>
        <MenuItems
          anchor="bottom end"
          className="bg-paper text-ink border-line shadow-soft z-[60] w-72 border focus:outline-none"
        >
          <MenuItem>
            <a
              href={photoDownloadUrl(
                gallery.id,
                photo.id,
                "original",
                photo.editedAt,
              )}
              className="data-focus:bg-paper-alt block px-4 py-3"
            >
              <span className="text-body block">Original file</span>
              <span className="text-small text-ink-muted block">
                {photo.originalFilename} · {formatSize(photo.sizeBytes)} · full
                resolution
              </span>
            </a>
          </MenuItem>
          <MenuItem>
            <a
              href={photoDownloadUrl(
                gallery.id,
                photo.id,
                "web",
                photo.editedAt,
              )}
              className="border-line data-focus:bg-paper-alt block border-t px-4 py-3"
            >
              <span className="text-body block">Web size</span>
              <span className="text-small text-ink-muted block">
                2048 px · for sharing
              </span>
            </a>
          </MenuItem>
        </MenuItems>
      </Menu>
    </div>
  );

  const toolNav = (rail) => (
    <nav
      aria-label="Edit tools"
      className={clsx(
        rail
          ? "hidden w-20 shrink-0 flex-col items-center gap-1 border-r border-white/15 py-4 lg:flex"
          : "grid h-[4.25rem] shrink-0 grid-cols-5 border-t border-white/15 lg:hidden",
      )}
    >
      {TOOLS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={panel === id}
          onClick={() => openPanel(id)}
          className={clsx(
            "flex flex-col items-center justify-center gap-1 transition-colors",
            rail ? "size-16" : "h-full",
            panel === id
              ? "bg-white text-[#151515]"
              : "text-white hover:bg-white/10",
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
          <span className="caps text-[0.625rem]">{label}</span>
        </button>
      ))}
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
          gallery={gallery}
          photo={photo}
          label="A"
          onFavorite={toggleFavorite}
          onHide={toggleHide}
          zoom={zoomProps}
          onFit={setFitA}
        />
        <ComparePane
          gallery={gallery}
          photo={other}
          label="B"
          onFavorite={toggleFavorite}
          onHide={toggleHide}
          zoom={zoomProps}
        />
      </div>
    </div>
  ) : zoom ? (
    <div className="relative size-full">
      <ZoomStage
        key={`${photo.id}-${photo.editedAt}`}
        src={webSrc}
        hiSrc={photoUrl(gallery.id, photo.id, "original", photo.editedAt)}
        width={photo.width}
        height={photo.height}
        onFit={setFitA}
        dimmed={photo.hidden}
        {...zoomProps}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-3">
        <div className="pointer-events-auto">{zoomBar}</div>
      </div>
    </div>
  ) : panel === "focus" ? (
    <div className="flex size-full items-center justify-center p-4">
      <div className="relative">
        <img
          src={webSrc}
          alt={photo.originalFilename}
          draggable={false}
          onClick={setFocus}
          className="block max-h-[calc(100dvh-16rem)] max-w-full cursor-crosshair select-none md:max-h-[calc(100dvh-13rem)]"
        />
        {photo.focusX != null && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute size-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)] transition-[left,top] duration-200 ease-out motion-reduce:transition-none"
            style={{
              left: `${photo.focusX * 100}%`,
              top: `${photo.focusY * 100}%`,
            }}
          >
            <span className="absolute top-1/2 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
          </span>
        )}
      </div>
    </div>
  ) : panel === "crop" ? (
    <div className="[container-type:size] flex size-full min-h-0 min-w-0 items-center justify-center overflow-hidden p-4">
      {!preview.current ? (
        <Skeleton className="size-full opacity-20" />
      ) : (
        <ReactCrop
          style={{
            maxWidth: "calc(100cqw - 2rem)",
            maxHeight: "calc(100cqh - 2rem)",
          }}
          crop={draft}
          onChange={(_, pct) => setDraft(pct)}
          onComplete={(_, pct) => commitCrop(pct)}
          aspect={ratio === "free" ? undefined : RATIO_VALUE[ratio]}
          ruleOfThirds
          keepSelection
          minWidth={20}
        >
          <img
            src={preview.url}
            alt={photo.originalFilename}
            draggable={false}
            className="block select-none"
          />
        </ReactCrop>
      )}
    </div>
  ) : (
    <div
      className="relative flex size-full items-center justify-center p-3 md:p-6"
      onDoubleClick={doubleClick}
    >
      {edits.crop ? (
        <>
          {!preview.current && (
            <Skeleton className="absolute inset-6 opacity-20" />
          )}
          {preview.current && (
            <img
              src={preview.url}
              alt={photo.originalFilename}
              draggable={false}
              className={clsx(
                "max-h-full max-w-full object-contain select-none",
                photo.hidden && "opacity-40",
              )}
            />
          )}
        </>
      ) : (
        <EditedImage
          key={`${photo.id}-${photo.editedAt}`}
          src={webSrc}
          width={photo.width}
          height={photo.height}
          edits={edits}
          alt={photo.originalFilename}
          className={photo.hidden ? "opacity-40" : undefined}
        />
      )}
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
      <InfoPanel
        galleryId={gallery.id}
        photo={photo}
        setName={setName}
        isCover={gallery.coverPhotoId === photo.id}
      />
    ) : panel === "rotate" ? (
      <RotatePanel edits={edits} onChange={change} />
    ) : panel === "crop" ? (
      <CropPanel edits={edits} ratio={ratio} onRatio={pickRatio} base={base} />
    ) : panel === "resize" ? (
      <ResizePanel edits={edits} base={base} onChange={change} />
    ) : panel === "focus" ? (
      <FocusPanel
        gallery={gallery}
        photo={photo}
        busy={busy}
        onReset={resetFocus}
      />
    ) : null;

  const strip = (
    <div
      className={clsx(
        "h-[5.5rem] shrink-0 items-center gap-1.5 overflow-x-auto border-t border-white/15 px-4",
        compare ? "flex" : "hidden md:flex",
      )}
      role="list"
      aria-label="Photos"
    >
      {photos.map((p) => {
        const isA = p.id === photo.id;
        const isB = compare && p.id === other.id;
        return (
          <button
            key={p.id}
            role="listitem"
            type="button"
            aria-label={p.originalFilename}
            aria-current={isA || isB ? "true" : undefined}
            onClick={() => {
              if (compare) {
                if (!isA) setOtherId(p.id);
              } else if (!guard()) {
                setZoom(false);
                setCurrentId(p.id);
              }
            }}
            className={clsx(
              "mx-auto h-14 w-[4.5rem] shrink-0 outline-offset-2 transition-opacity first:ml-auto last:mr-auto",
              isA
                ? "opacity-100 outline-2 outline-white"
                : isB
                  ? "opacity-100 outline-2 outline-white outline-dashed"
                  : "opacity-55 hover:opacity-90",
              p.hidden && "opacity-25",
            )}
          >
            <PhotoThumb
              galleryId={gallery.id}
              photoId={p.id}
              version={p.editedAt}
              photo={p}
              className="size-full"
            />
          </button>
        );
      })}
    </div>
  );

  return (
    <Dialog open onClose={close} className="relative z-50">
      <DialogPanel className="fixed inset-0 flex flex-col bg-[#111111] text-white">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/15 pr-2 pl-1 md:h-16 md:px-4">
          <div className="flex min-w-0 items-center gap-1 md:gap-3">
            <button
              type="button"
              onClick={close}
              aria-label="Close preview"
              className="caps flex h-11 min-w-11 items-center justify-center gap-2 px-2 text-white hover:bg-white/10"
            >
              <XMarkIcon className="size-5" aria-hidden="true" />
              <span className="hidden md:inline">Close</span>
            </button>
            <div className="min-w-0">
              <div className="truncate text-[1.05rem] leading-5 md:text-[1.25rem]">
                {photo.originalFilename}
              </div>
              <div className="text-small hidden text-white/60 md:block">
                {setName ?? "No set"} · {index + 1} / {photos.length}
                {gallery.coverPhotoId === photo.id && " · Cover"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-small text-white/60 md:hidden">
              {index + 1} / {photos.length}
            </span>
            {/* Marks live in the header: in the stage corner the side arrows' hover covered them. */}
            {photo.favorite && (
              <span className="caps bg-white px-1.5 py-0.5 text-[0.625rem] whitespace-nowrap text-[#151515]">
                ♥ Favorite
              </span>
            )}
            {photo.hidden && (
              <span className="caps bg-white px-1.5 py-0.5 text-[0.625rem] text-[#151515]">
                Hidden
              </span>
            )}
            <div className="hidden md:block">{actions}</div>
          </div>
        </header>
        <div className="relative flex h-14 shrink-0 items-center border-b border-white/15 px-2 md:hidden">
          {actions}
        </div>

        <div className="relative flex min-h-0 flex-1">
          {toolNav(true)}
          <main
            className={clsx(
              "relative min-w-0 flex-1 overflow-hidden",
              canSwipe &&
                "cursor-grab touch-pan-y select-none active:cursor-grabbing",
            )}
            onPointerDown={swipeStart}
            onPointerMove={swipeMove}
            onPointerUp={swipeEnd}
            onPointerCancel={swipeEnd}
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
            {canSwipe && (
              <>
                <SideZone
                  side="left"
                  label="Previous photo"
                  onClick={() => go(-1)}
                />
                <SideZone
                  side="right"
                  label="Next photo"
                  onClick={() => go(1)}
                />
              </>
            )}
          </main>
          {panel && (
            <aside
              aria-label={TITLES[panel]}
              className="bg-paper text-ink max-md:border-line flex min-h-0 flex-col max-md:absolute max-md:inset-x-0 max-md:bottom-0 max-md:z-10 max-md:max-h-[58%] max-md:border-t md:w-80 md:shrink-0"
            >
              <div className="border-line flex shrink-0 items-center justify-between border-b py-3 pr-2 pl-6">
                <h2 className="text-[1.5rem] leading-7">{TITLES[panel]}</h2>
                <button
                  type="button"
                  onClick={() => setPanel(null)}
                  aria-label="Close panel"
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
            aria-label="Unsaved edits"
            onPointerDown={(e) => e.stopPropagation()}
            className="flex shrink-0 items-center justify-center gap-3 border-t border-white/15 px-3 py-2 text-white"
          >
            <span className="text-small hidden text-white/70 sm:inline">
              Unsaved edits · {resultSize.width} × {resultSize.height} px
            </span>
            <button
              type="button"
              onClick={resetEdits}
              className="caps min-h-11 border border-white/40 px-4 text-white hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setConfirm(true)}
              disabled={busy}
              className="caps min-h-11 border border-white bg-white px-4 text-[#151515] hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save
            </button>
          </div>
        )}
        {strip}
        {toolNav(false)}

        <ConfirmModal
          show={confirm}
          onClose={() => setConfirm(false)}
          onOk={save}
          confirmLoading={busy}
          state="pending"
          messages={{
            pending: {
              title: "Replace the original?",
              description: `${photo.originalFilename} will be overwritten (${describeEdits(edits).join(" · ") || "no changes"}). The old file can’t be recovered and the client will see the new version.`,
              actionText: "Replace original",
            },
          }}
        />
      </DialogPanel>
    </Dialog>
  );
}

const RATIO_VALUE = { "1:1": 1, "4:5": 4 / 5, "3:2": 3 / 2, "16:9": 16 / 9 };

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
CompareGlyph.propTypes = { className: PropTypes.string };

function ComparePane({
  gallery,
  photo,
  label,
  onFavorite,
  onHide,
  zoom,
  onFit,
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1 bg-[#181818]">
        <ZoomStage
          key={`${photo.id}-${photo.editedAt}`}
          src={photoUrl(gallery.id, photo.id, "web", photo.editedAt)}
          hiSrc={photoUrl(gallery.id, photo.id, "original", photo.editedAt)}
          width={photo.width}
          height={photo.height}
          onFit={onFit}
          dimmed={photo.hidden}
          {...zoom}
        >
          <span className="caps pointer-events-none absolute top-2.5 left-2.5 bg-white px-1.5 py-0.5 text-[0.625rem] text-[#151515]">
            {label}
          </span>
        </ZoomStage>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 py-1.5 pr-1 pl-3">
        <div className="min-w-0">
          <div className="text-body truncate">{photo.originalFilename}</div>
          <div className="text-small text-white/60">
            {formatSize(photo.sizeBytes)}
          </div>
        </div>
        <div className="flex">
          <button
            type="button"
            aria-pressed={photo.favorite}
            aria-label={`Favorite ${photo.originalFilename}`}
            onClick={() => onFavorite(photo)}
            className={clsx(
              "flex size-11 items-center justify-center",
              photo.favorite
                ? "bg-white text-[#151515]"
                : "text-white hover:bg-white/10",
            )}
          >
            {photo.favorite ? (
              <HeartSolid className="size-5" />
            ) : (
              <HeartOutline className="size-5" />
            )}
          </button>
          <button
            type="button"
            aria-pressed={photo.hidden}
            aria-label={`Hide ${photo.originalFilename}`}
            onClick={() => onHide(photo)}
            className={clsx(
              "flex size-11 items-center justify-center",
              photo.hidden
                ? "bg-white text-[#151515]"
                : "text-white hover:bg-white/10",
            )}
          >
            <EyeSlashIcon className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

PhotoViewer.propTypes = {
  gallery: PropTypes.object.isRequired,
  photos: PropTypes.array.isRequired,
  startId: PropTypes.number.isRequired,
  compareId: PropTypes.number,
  onClose: PropTypes.func.isRequired,
};
ComparePane.propTypes = {
  gallery: PropTypes.object.isRequired,
  photo: PropTypes.object.isRequired,
  label: PropTypes.string,
  onFavorite: PropTypes.func,
  onHide: PropTypes.func,
  zoom: PropTypes.object.isRequired,
  onFit: PropTypes.func,
};
