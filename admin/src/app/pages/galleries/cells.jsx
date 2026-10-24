// Cells of the Galleries table (see columns.js) and its phone card.
import { ToneTag } from "../bookings/parts";
import { formatSize, pluralPhotos, shortDate, stateInfo } from "./labels";
import { PhotoThumb } from "./parts";

export function GalleryCell({ row }) {
  const g = row.original;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <PhotoThumb galleryId={g.id} photoId={g.coverPhotoId} className="h-12 w-16 shrink-0" />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-ink">{g.title}</span>
        <span className="mt-0.5 truncate text-small text-ink-muted">{g.client?.displayName ?? "—"}</span>
      </div>
    </div>
  );
}

export function SessionCell({ row }) {
  const b = row.original.booking;
  if (!b) return <span className="text-ink-muted">—</span>;
  return (
    <div className="flex flex-col">
      <span className="text-ink">{b.code}</span>
      <span className="mt-0.5 text-small text-ink-muted">{b.serviceNameSnapshot}</span>
    </div>
  );
}

export const PhotosCell = ({ row }) => <span className="text-ink">{row.original.photoCount}</span>;
export const SizeCell = ({ row }) => (
  <span className="text-ink">{row.original.sizeBytes > 0 ? formatSize(row.original.sizeBytes) : "—"}</span>
);

export function StatusCell({ row }) {
  const info = stateInfo(row.original.state);
  return <ToneTag tone={info.tone} className="whitespace-normal">{info.label}</ToneTag>;
}

export const ExpiresCell = ({ row }) => (
  <span className="whitespace-nowrap text-small text-ink">{row.original.status === "DELIVERED" ? shortDate(row.original.expiresAt) : "—"}</span>
);

// Phone card (inside the shared button of BookingsTable).
export function GalleryCard({ booking: g }) {
  const info = stateInfo(g.state);
  return (
    <div className="flex w-full items-center gap-3">
      <PhotoThumb galleryId={g.id} photoId={g.coverPhotoId} className="h-16 w-20 shrink-0" />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-ink text-[1.25rem] leading-tight">{g.title}</span>
        <span className="truncate text-small text-ink-muted">
          {[g.client?.displayName, pluralPhotos(g.photoCount), g.sizeBytes > 0 && formatSize(g.sizeBytes)].filter(Boolean).join(" · ")}
        </span>
        <ToneTag tone={info.tone}>{info.label}</ToneTag>
      </div>
    </div>
  );
}
