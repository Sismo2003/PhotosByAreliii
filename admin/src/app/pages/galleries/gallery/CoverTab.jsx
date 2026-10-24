// "Cover" tab (design: GalleryCover): the layout (Full / Split / Minimal), a live preview and the
// picker. The cover is the first thing the client sees when they open the gallery.
import { CheckIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import PropTypes from "prop-types";
import { toast } from "sonner";

import { setCoverThunk, updateGalleryThunk, useGalleriesStore } from "slices";

import { ChoiceGroup } from "../../bookings/parts";
import { COVER_LAYOUTS } from "../labels";
import { PhotoThumb } from "../parts";
import { formatDate } from "utils/date";

export function CoverTab({ gallery }) {
  const busy = useGalleriesStore((s) => s.busy);
  const visible = gallery.photos.filter((p) => !p.hidden);
  const firstName = gallery.client?.firstName ?? gallery.client?.displayName ?? "the client";

  const pick = async (photoId) => {
    const res = await setCoverThunk(gallery.id, photoId);
    if (res.ok) toast.success("Cover changed");
    else toast.error(res.error?.message ?? "Could not set the cover");
  };

  const layout = async (value) => {
    if (value === gallery.coverLayout) return;
    const res = await updateGalleryThunk(gallery.id, { coverLayout: value });
    if (!res.ok) toast.error(res.error?.message ?? "Could not change the layout");
  };

  return (
    <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0">
        <h2 className="caps border-b border-line pb-2 text-ink-muted">Choose cover photo</h2>
        <p className="mt-3 max-w-xl text-small text-ink-muted">
          This is the first thing {firstName} sees when they open the gallery. Pick a photo below to use it as the cover.
        </p>
        {visible.length === 0 ? (
          <p className="mt-8 text-ink-muted">Add photos in the Photos tab first.</p>
        ) : (
          <ul className="mt-4 grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto overscroll-contain p-1 sm:grid-cols-3 xl:grid-cols-4">
            {visible.map((p) => {
              const on = gallery.coverPhotoId === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={`${p.originalFilename}${on ? ", current cover" : ""}`}
                    disabled={busy}
                    onClick={() => pick(p.id)}
                    className={clsx("relative block w-full outline-offset-2 focus-visible:outline-2 focus-visible:outline-ink", on && "outline-2 outline-ink")}
                  >
                    <PhotoThumb galleryId={gallery.id} photoId={p.id} version={p.editedAt} photo={p} className="aspect-[4/3] w-full" />
                    {on && (
                      <span className="bg-ink text-on-ink caps absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 text-tiny">
                        <CheckIcon className="size-3" aria-hidden="true" /> Cover
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <aside className="min-w-0 space-y-6">
        <ChoiceGroup label="Layout" options={COVER_LAYOUTS} value={gallery.coverLayout} onChange={layout} disabled={busy} />
        <div>
          <h3 className="caps text-ink-muted">Preview</h3>
          <CoverPreview gallery={gallery} />
        </div>
      </aside>
    </div>
  );
}

// A small stand-in for the client's first screen, in each of the three layouts. Mirrors
// client/src/app/pages/gallery/Hero.jsx (same text, same composition): change both together.
function CoverPreview({ gallery }) {
  const { coverPhotoId: photoId, coverLayout: layout, title } = gallery;
  const cover = gallery.photos.find((p) => p.id === photoId);
  const when = gallery.booking?.startsAt ?? gallery.deliveredAt;
  const eyebrow = [gallery.booking?.serviceNameSnapshot, when && formatDate(when, "LLLL d, yyyy")].filter(Boolean).join(" · ");
  const photo = (className) => <PhotoThumb galleryId={gallery.id} photoId={photoId} variant="web" version={cover?.editedAt} photo={cover} className={className} />;
  const heading = (className, onPhoto = false) => (
    <div className={className}>
      <p className={clsx("caps text-tiny", onPhoto ? "opacity-80" : "text-ink-muted")}>{eyebrow}</p>
      <p className={clsx("mt-1.5 text-[1.25rem] leading-tight", !onPhoto && "text-ink")}>{title}</p>
    </div>
  );

  return (
    <div className="border-line-strong bg-paper mt-3 overflow-hidden border">
      {layout === "SPLIT" ? (
        <div className="grid aspect-[3/2] grid-cols-2">
          {photo("size-full")}
          {heading("flex flex-col justify-center p-4")}
        </div>
      ) : layout === "MINIMAL" ? (
        <div className="flex aspect-[3/2] flex-col items-center justify-center gap-3 p-4">
          {heading("text-center")}
          <div className="border-line bg-paper border p-1 shadow-soft">{photo("h-16 w-12")}</div>
        </div>
      ) : (
        <div className="relative aspect-[3/2]">
          {photo("absolute inset-0")}
          {heading("absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 text-white", true)}
        </div>
      )}
    </div>
  );
}

CoverTab.propTypes = { gallery: PropTypes.object.isRequired };
CoverPreview.propTypes = { gallery: PropTypes.object.isRequired };
