// "Photos" tab (design: GalleryUpload / GalleryEditor): sets on the left, bulk upload and the photo
// grid on the right. Click photos to select them, then Move to set / Set as cover / Hide / Delete.
// Uploads go through useUploader (space check first, 3 at a time); a full disk disables the drop zone.
import { CheckIcon, PhotoIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import PropTypes from "prop-types";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ConfirmModal } from "components/shared/ConfirmModal";
import { PaginationSection } from "components/shared/table/PaginationSection";
import { useStorageStatus } from "components/shared/storage/useStorageStatus";
import { SUPPORT_EMAIL } from "constants/app.constant";
import {
  addSetThunk,
  bulkPhotosThunk,
  loadGalleryThunk,
  removeSetThunk,
  setCoverThunk,
  updateSetThunk,
  useGalleriesStore,
} from "slices";

import { ActionButton, AlertNote } from "../../bookings/parts";
import { formatSize, pluralPhotos } from "../labels";
import { PhotoThumb } from "../parts";
import { SelectionIsland } from "./SelectionIsland";
import { useMarquee } from "./useMarquee";
import { PAGE_SIZES, usePhotoPages } from "./usePhotoPages";
import { filesFromDrop, useUploader } from "./useUploader";
import { PhotoViewer } from "./viewer/PhotoViewer";

const SIZES = [
  { id: "S", label: "S", grid: "grid-cols-3 sm:grid-cols-5 lg:grid-cols-7" },
  { id: "M", label: "M", grid: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" },
  { id: "L", label: "L", grid: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" },
];
const ALL = "all";
const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("More storage for Photos By Areliii")}`;
const fieldClass =
  "h-11 border-0 border-b border-line-strong bg-transparent px-0 text-body text-ink focus:border-ink focus:outline-none focus:ring-0";

export function PhotosTab({ gallery }) {
  const busy = useGalleriesStore((s) => s.busy);
  const { status } = useStorageStatus();
  const [activeSet, setActiveSet] = useState(ALL); // ALL | "none" (no set) | set id
  const [sort, setSort] = useState("upload");
  const [size, setSize] = useState("M");
  const [selected, setSelected] = useState(() => new Set());
  const [dragging, setDragging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [viewerId, setViewerId] = useState(null); // photo open in the full-screen viewer
  const [compareId, setCompareId] = useState(null); // second photo when the viewer opens in Compare
  const fileInput = useRef(null);
  const gridRef = useRef(null);

  const uploader = useUploader(gallery.id, {
    onReload: () => loadGalleryThunk(gallery.id, { quiet: true }),
  });
  const full = status?.uploadsBlocked;
  const uploadSetId = typeof activeSet === "number" ? activeSet : null;
  const setName =
    typeof activeSet === "number"
      ? gallery.sets.find((s) => s.id === activeSet)?.name
      : null;

  const photos = useMemo(() => {
    const list = gallery.photos.filter((p) =>
      activeSet === ALL
        ? true
        : activeSet === "none"
          ? p.setId === null
          : p.setId === activeSet,
    );
    return sort === "name"
      ? [...list].sort((a, b) =>
          a.originalFilename.localeCompare(b.originalFilename, undefined, {
            numeric: true,
          }),
        )
      : list;
  }, [gallery.photos, activeSet, sort]);

  const { table, pages, pagePhotos, showPhoto } = usePhotoPages(
    photos,
    size,
    `${activeSet}|${sort}`,
  );

  const unsorted = gallery.photos.filter((p) => p.setId === null).length;
  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const ids = [...selected];
  const allSelected =
    photos.length > 0 && photos.every((p) => selected.has(p.id));
  const selectedPhotos = gallery.photos.filter((p) => selected.has(p.id));
  const marquee = useMarquee({
    containerRef: gridRef,
    getSelected: () => selected,
    onChange: setSelected,
  });

  // Keyboard, like a desktop file manager: Esc clears, Cmd/Ctrl+A selects the visible photos, Delete asks to delete.
  useEffect(() => {
    if (viewerId !== null || confirmDelete) return undefined;
    const onKey = (e) => {
      if (e.target.closest?.("input, select, textarea, [contenteditable]"))
        return;
      if (e.key === "Escape")
        setSelected((prev) => (prev.size ? new Set() : prev));
      else if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "a" &&
        photos.length > 0
      ) {
        e.preventDefault();
        setSelected(new Set(photos.map((p) => p.id)));
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selected.size > 0
      ) {
        e.preventDefault();
        setConfirmDelete(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerId, confirmDelete, photos, selected.size]);

  const act = async (body, success) => {
    const res = await bulkPhotosThunk(gallery.id, { ...body, photoIds: ids });
    if (res.ok) {
      toast.success(success);
      setSelected(new Set());
    } else toast.error(res.error?.message ?? "Could not update the photos");
    return res.ok;
  };

  const startUpload = (files) => {
    if (full) return;
    uploader.add(files, uploadSetId);
  };

  const onDrop = async (e) => {
    e.preventDefault();
    setDragging(false);
    if (full) return;
    startUpload(await filesFromDrop(e));
  };

  const dropProps = {
    onDragOver: (e) => {
      e.preventDefault();
      if (!full) setDragging(true);
    },
    onDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
    },
    onDrop,
  };

  const hiddenInput = (
    <input
      ref={fileInput}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      multiple
      hidden
      onChange={(e) => {
        startUpload(e.target.files);
        e.target.value = "";
      }}
    />
  );

  return (
    <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <SetsRail
        gallery={gallery}
        activeSet={activeSet}
        onPick={setActiveSet}
        unsorted={unsorted}
        busy={busy}
        onClearSelection={() => setSelected(new Set())}
      />

      <div className="min-w-0" {...dropProps}>
        {full && (
          <AlertNote className="mb-5">
            <strong className="font-medium">Storage is full</strong> — uploads
            are paused until there’s more than 500 MB free. Delete old
            galleries, or contact Alexis at{" "}
            <a href={mailto} className="underline">
              {SUPPORT_EMAIL}
            </a>{" "}
            to add more storage.
          </AlertNote>
        )}
        {uploader.blocked && !full && (
          <AlertNote className="mb-5">
            <strong className="font-medium">
              Not enough space for these photos.
            </strong>{" "}
            They need about {formatSize(uploader.blocked.neededBytes)} and
            there’s {formatSize(uploader.blocked.usableBytes)} available. Delete
            old galleries to free up space, or contact Alexis at{" "}
            <a href={mailto} className="underline">
              {SUPPORT_EMAIL}
            </a>
            .
          </AlertNote>
        )}

        {gallery.photos.length === 0 && uploader.items.length === 0 ? (
          <div
            className={clsx(
              "flex flex-col items-center border border-dashed px-6 py-14 text-center transition-colors",
              dragging ? "border-ink bg-paper-alt" : "border-line-strong",
              full && "opacity-50",
            )}
          >
            <PhotoIcon
              className="text-line-strong size-10"
              aria-hidden="true"
            />
            <h2 className="text-ink mt-4 text-[1.5rem]">
              Drag your edited photos here
            </h2>
            <p className="text-small text-ink-muted mt-2 max-w-md">
              Drop a whole folder or hundreds of files at once. JPG, PNG or WebP
              up to 50 MB each. Originals are kept in full resolution; web-size
              copies are made for you.
            </p>
            <ActionButton
              solid
              className="mt-6"
              disabled={full}
              onClick={() => fileInput.current?.click()}
            >
              Select photos
            </ActionButton>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <p className="text-small text-ink-muted">
                {pluralPhotos(photos.length)}
                {gallery.totals.hiddenCount > 0 &&
                  ` · ${gallery.totals.hiddenCount} hidden in total`}
              </p>
              <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
                <div className="flex flex-col">
                  <label htmlFor="photo-sort" className="field-label">
                    Sort photos
                  </label>
                  <select
                    id="photo-sort"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="upload">Upload order</option>
                    <option value="name">File name</option>
                  </select>
                </div>
                <div
                  role="group"
                  aria-label="Thumbnail size"
                  className="flex gap-0.5 pb-1"
                >
                  {SIZES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={size === s.id}
                      onClick={() => setSize(s.id)}
                      className={clsx(
                        "text-small flex size-9 items-center justify-center rounded-md transition-colors",
                        size === s.id
                          ? "bg-line text-ink"
                          : "text-ink-muted hover:text-ink",
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSelected(
                      allSelected
                        ? new Set()
                        : new Set(photos.map((p) => p.id)),
                    )
                  }
                  className="text-small text-ink hover:text-ink-muted min-h-11 underline underline-offset-4"
                >
                  {allSelected ? "Unselect all" : "Select all"}
                </button>
                <ActionButton
                  disabled={full}
                  onClick={() => fileInput.current?.click()}
                >
                  + Add photos
                </ActionButton>
              </div>
            </div>

            <p className="text-small text-ink-muted mt-3">
              Drop more photos here — they go into{" "}
              {setName ? `“${setName}”` : "the gallery without a set"}.
            </p>

            <UploadQueue uploader={uploader} />

            {/* Grid */}
            <div
              ref={gridRef}
              onPointerDown={marquee.onPointerDown}
              onClickCapture={marquee.onClickCapture}
              onDragStart={(e) => e.preventDefault()}
              className={clsx(
                "relative mt-4 min-h-[24rem] p-3 transition-colors select-none",
                dragging &&
                  "bg-paper-alt outline-ink outline-2 -outline-offset-2 outline-dashed",
              )}
            >
              {marquee.box && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute z-20 rounded-sm border border-blue-500 bg-blue-500/15"
                  style={{
                    left: marquee.box.left,
                    top: marquee.box.top,
                    width: marquee.box.width,
                    height: marquee.box.height,
                  }}
                />
              )}
              {photos.length === 0 ? (
                <p className="text-ink-muted py-12 text-center">
                  No photos in this set yet. Select photos and use “Move to
                  set”, or drop new ones here.
                </p>
              ) : (
                <ul
                  className={clsx(
                    "grid gap-2",
                    SIZES.find((s) => s.id === size).grid,
                  )}
                >
                  {pagePhotos.map((p) => {
                    const on = selected.has(p.id);
                    const cover = gallery.coverPhotoId === p.id;
                    return (
                      <li key={p.id} data-photo-id={p.id}>
                        <button
                          type="button"
                          aria-pressed={on}
                          aria-label={`${p.originalFilename}${on ? ", selected" : ""}`}
                          onClick={() => toggle(p.id)}
                          onDoubleClick={() => setViewerId(p.id)}
                          className={clsx(
                            "group focus-visible:outline-ink relative block w-full cursor-pointer text-left outline-offset-2 transition-transform duration-200 ease-out hover:z-10 hover:scale-[1.04] focus-visible:outline-2 motion-reduce:transition-none motion-reduce:hover:scale-100",
                            on && "outline-ink outline-2",
                          )}
                        >
                          <span className="group-hover:shadow-soft relative block transition-shadow duration-200 dark:group-hover:shadow-none">
                            <PhotoThumb
                              galleryId={gallery.id}
                              photoId={p.id}
                              version={p.editedAt}
                              photo={p}
                              className="aspect-[4/3] w-full"
                              imgClassName={clsx(p.hidden && "opacity-40")}
                            />
                            <span
                              aria-hidden="true"
                              className={clsx(
                                "absolute top-2 left-2 flex size-6 items-center justify-center border transition-opacity",
                                on
                                  ? "border-ink bg-ink text-on-ink opacity-100"
                                  : "border-white bg-black/30 text-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
                              )}
                            >
                              <CheckIcon className="size-4" />
                            </span>
                            <span className="absolute right-2 bottom-2 flex gap-1">
                              {cover && <Badge>Cover</Badge>}
                              {p.favorite && <Badge>♥ Favorite</Badge>}
                              {p.hidden && <Badge>Hidden</Badge>}
                            </span>
                          </span>
                          <span className="text-tiny text-ink-muted mt-1 block truncate">
                            {p.originalFilename}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Static footer (below the grid, outside the marquee: changing page keeps the selection) */}
            {pages > 1 && (
              <div className="border-line text-ink-muted mt-2 border-t px-3 pt-4">
                <PaginationSection
                  table={table}
                  pageSizes={PAGE_SIZES[size]}
                  unit="photos"
                />
              </div>
            )}

            {/* Selection island */}
            {selected.size > 0 && (
              <SelectionIsland
                selected={selectedPhotos.map((p) => ({
                  ...p,
                  isCover: gallery.coverPhotoId === p.id,
                }))}
                sets={gallery.sets}
                busy={busy}
                allHidden={selectedPhotos.every((p) => p.hidden)}
                onPreview={() =>
                  setViewerId(
                    photos.find((p) => selected.has(p.id))?.id ?? ids[0],
                  )
                }
                onCompare={() => {
                  setCompareId(selectedPhotos[1].id);
                  setViewerId(selectedPhotos[0].id);
                }}
                onMove={(setId) => act({ action: "move", setId }, "Moved")}
                onCover={async () => {
                  const res = await setCoverThunk(gallery.id, ids[0]);
                  if (res.ok) toast.success("Cover changed");
                  else
                    toast.error(
                      res.error?.message ?? "Could not set the cover",
                    );
                }}
                onToggleHidden={() =>
                  act(
                    {
                      action: selectedPhotos.every((p) => p.hidden)
                        ? "show"
                        : "hide",
                    },
                    "Updated",
                  )
                }
                onDelete={() => setConfirmDelete(true)}
                onClear={() => setSelected(new Set())}
              />
            )}
          </>
        )}
        {hiddenInput}
      </div>

      {viewerId !== null && photos.some((p) => p.id === viewerId) && (
        <PhotoViewer
          gallery={gallery}
          photos={photos}
          startId={viewerId}
          compareId={compareId}
          onClose={(lastId) => {
            setViewerId(null);
            setCompareId(null);
            setSelected(new Set([lastId]));
            showPhoto(lastId);
          }}
        />
      )}

      <ConfirmModal
        show={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onOk={async () => {
          const ok = await act(
            { action: "delete" },
            `${pluralPhotos(ids.length)} deleted`,
          );
          if (ok) setConfirmDelete(false);
        }}
        confirmLoading={busy}
        state="pending"
        messages={{
          pending: {
            title: `Delete ${pluralPhotos(selected.size)}?`,
            description:
              "The originals and web copies are removed from the disk. There is no recycle bin.",
            actionText: "Delete photos",
          },
        }}
      />
    </div>
  );
}

function Badge({ children }) {
  return (
    <span className="bg-paper text-ink caps text-tiny px-1.5 py-0.5">
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sets
// ---------------------------------------------------------------------------

function SetsRail({
  gallery,
  activeSet,
  onPick,
  unsorted,
  busy,
  onClearSelection,
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const current = gallery.sets.find((s) => s.id === activeSet) ?? null;

  const pick = (id) => {
    onPick(id);
    onClearSelection();
    setRenaming(false);
  };

  const add = async () => {
    const text = name.trim();
    if (!text) return;
    const res = await addSetThunk(gallery.id, text);
    if (res.ok) {
      setName("");
      setAdding(false);
    } else toast.error(res.error?.message ?? "Could not add the set");
  };

  const rename = async () => {
    const text = name.trim();
    if (!text || text === current.name) return setRenaming(false);
    const res = await updateSetThunk(gallery.id, current.id, { name: text });
    if (res.ok) setRenaming(false);
    else toast.error(res.error?.message ?? "Could not rename the set");
  };

  const items = [
    { id: ALL, label: "All photos", count: gallery.photos.length },
    ...gallery.sets.map((s) => ({
      id: s.id,
      label: s.name,
      count: s.photoCount,
    })),
    ...(unsorted > 0 && gallery.sets.length > 0
      ? [{ id: "none", label: "No set", count: unsorted }]
      : []),
  ];

  return (
    <aside className="min-w-0">
      <h2 className="caps border-line text-ink-muted border-b pb-2">Sets</h2>
      <ul className="mt-2">
        {items.map((it) => (
          <li key={it.id}>
            <button
              type="button"
              aria-current={activeSet === it.id ? "true" : undefined}
              onClick={() => pick(it.id)}
              className={clsx(
                "text-body flex min-h-11 w-full items-center justify-between gap-3 border-l-2 px-3 text-left transition-colors",
                activeSet === it.id
                  ? "border-ink bg-paper-alt text-ink"
                  : "text-ink-muted hover:text-ink border-transparent",
              )}
            >
              <span className="truncate">{it.label}</span>
              <span className="text-small tabular-nums">{it.count}</span>
            </button>
          </li>
        ))}
      </ul>

      {current && !renaming && (
        <div className="text-small mt-3 flex gap-4 px-3">
          <button
            type="button"
            className="text-ink hover:text-ink-muted min-h-9 underline underline-offset-4"
            onClick={() => {
              setName(current.name);
              setRenaming(true);
            }}
          >
            Rename
          </button>
          <button
            type="button"
            className="text-alert min-h-9 underline underline-offset-4"
            onClick={() => setConfirmRemove(true)}
          >
            Remove set
          </button>
        </div>
      )}
      {renaming && (
        <form
          className="mt-3 space-y-2 px-3"
          onSubmit={(e) => {
            e.preventDefault();
            rename();
          }}
        >
          <label htmlFor="rename-set" className="sr-only">
            Set name
          </label>
          <input
            id="rename-set"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={clsx(fieldClass, "w-full")}
          />
          <div className="flex gap-2">
            <ActionButton solid type="submit" disabled={busy}>
              Save
            </ActionButton>
            <ActionButton onClick={() => setRenaming(false)}>
              Cancel
            </ActionButton>
          </div>
        </form>
      )}

      <div className="border-line mt-4 border-t pt-4">
        {adding ? (
          <form
            className="space-y-2 px-3"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <label htmlFor="new-set-name" className="field-label">
              Set name
            </label>
            <input
              id="new-set-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={clsx(fieldClass, "w-full")}
            />
            <div className="flex gap-2">
              <ActionButton solid type="submit" disabled={busy || !name.trim()}>
                Add
              </ActionButton>
              <ActionButton
                onClick={() => {
                  setAdding(false);
                  setName("");
                }}
              >
                Cancel
              </ActionButton>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="text-small text-ink hover:text-ink-muted min-h-11 px-3 underline underline-offset-4"
            onClick={() => {
              setName("");
              setAdding(true);
            }}
          >
            + Add set
          </button>
        )}
        <p className="text-small text-ink-muted mt-3 px-3">
          Sets are the chapters clients see — e.g. Highlights, Portraits, With
          family.
        </p>
      </div>

      <ConfirmModal
        show={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onOk={async () => {
          const res = await removeSetThunk(gallery.id, current.id);
          setConfirmRemove(false);
          if (res.ok) {
            onPick(ALL);
            toast.success("Set removed");
          } else toast.error(res.error?.message ?? "Could not remove the set");
        }}
        confirmLoading={busy}
        state="pending"
        messages={{
          pending: {
            title: `Remove “${current?.name ?? ""}”?`,
            description: "Its photos stay in the gallery, without a set.",
            actionText: "Remove set",
          },
        }}
      />
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Upload queue
// ---------------------------------------------------------------------------

// Once nothing is uploading, the panel closes by itself: 3 s after a clean run, 2 min when something
// failed (so the errors can be read). It lives only in memory (useUploader), so a reload clears it.
const CLOSE_AFTER_OK = 3000;
const CLOSE_AFTER_ERROR = 2 * 60 * 1000;
const COLLAPSE_MS = 450; // the panel fades and folds up before it is removed

function UploadQueue({ uploader }) {
  const { items, active, clearFinished } = uploader;
  const done = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "error");
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (active > 0 || items.length === 0) {
      setLeaving(false); // a new upload cancels the countdown (and a collapse in progress)
      return undefined;
    }
    const timer = setTimeout(
      () => setLeaving(true),
      failed.length ? CLOSE_AFTER_ERROR : CLOSE_AFTER_OK,
    );
    return () => clearTimeout(timer);
  }, [active, items.length, failed.length]);

  useEffect(() => {
    if (!leaving) return undefined;
    const timer = setTimeout(clearFinished, COLLAPSE_MS);
    return () => clearTimeout(timer);
  }, [leaving, clearFinished]);

  if (items.length === 0) return null;
  const pct = Math.round(
    (items.reduce(
      (sum, i) =>
        sum + (i.status === "done" || i.status === "error" ? 1 : i.progress),
      0,
    ) /
      items.length) *
      100,
  );

  return (
    // Collapse: the grid row goes from 1fr to 0fr (real height, no fixed max-height), with fade and a slight shrink.
    <div
      className={clsx(
        "grid transition-[grid-template-rows,opacity,margin,transform] ease-out motion-reduce:transition-none",
        leaving
          ? "mt-0 scale-y-95 grid-rows-[0fr] opacity-0"
          : "mt-4 grid-rows-[1fr] opacity-100",
      )}
      style={{ transitionDuration: `${COLLAPSE_MS}ms`, transformOrigin: "top" }}
    >
      <section
        aria-live="polite"
        className="border-line min-h-0 overflow-hidden border p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-small text-ink">
            {active > 0
              ? `Uploading ${items.length - done - failed.length} of ${items.length}… keep this tab open`
              : `${done} of ${items.length} uploaded${failed.length ? ` · ${failed.length} failed` : ""}`}
          </p>
          {active === 0 && (
            <button
              type="button"
              onClick={() => setLeaving(true)}
              className="text-small text-ink hover:text-ink-muted min-h-9 underline underline-offset-4"
            >
              Clear
            </button>
          )}
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Upload progress"
          className="bg-line mt-3 h-1.5 w-full"
        >
          <div
            className="bg-ink h-full transition-[width] duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>
        {failed.length > 0 && (
          <ul className="text-small text-alert mt-3 max-h-32 space-y-1 overflow-y-auto">
            {failed.map((f) => (
              <li key={f.id}>
                {f.name} — {f.error}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

PhotosTab.propTypes = { gallery: PropTypes.object.isRequired };
Badge.propTypes = { children: PropTypes.node };
SetsRail.propTypes = {
  gallery: PropTypes.object.isRequired,
  activeSet: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onPick: PropTypes.func.isRequired,
  unsorted: PropTypes.number,
  busy: PropTypes.bool,
  onClearSelection: PropTypes.func,
};
UploadQueue.propTypes = { uploader: PropTypes.object.isRequired };
