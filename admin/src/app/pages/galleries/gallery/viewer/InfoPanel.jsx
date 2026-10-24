// "Info" tool: camera and file facts in plain words. Data comes from GET /photos/:id/info (EXIF
// is read from the original the first time and kept in the database). Times are studio time.
import PropTypes from "prop-types";
import { useEffect, useState } from "react";

import { Skeleton } from "components/ui";
import { getPhotoInfo } from "services/galleries";
import { formatDate } from "utils/date";

import { formatSize } from "../../labels";
import {
  apertureHint,
  focalHint,
  isoHint,
  megapixels,
  printHint,
  shutterHint,
  shutterLabel,
} from "./explain";

export function InfoPanel({ galleryId, photo, setName, isCover }) {
  const [state, setState] = useState({
    loading: true,
    data: null,
    error: false,
  });

  useEffect(() => {
    let alive = true;
    setState({ loading: true, data: null, error: false });
    getPhotoInfo(galleryId, photo.id)
      .then(
        ({ data }) =>
          alive && setState({ loading: false, data: data.data, error: false }),
      )
      .catch(
        () => alive && setState({ loading: false, data: null, error: true }),
      );
    return () => {
      alive = false;
    };
    // Read again after the original was replaced (editedAt changes).
  }, [galleryId, photo.id, photo.editedAt]);

  if (state.loading) return <InfoSkeleton />;
  if (state.error || !state.data)
    return (
      <p className="text-small text-ink-muted">
        The photo info could not be loaded.
      </p>
    );

  const { exif = {}, width, height, sizeBytes } = state.data;
  const camera = [
    exif.make && exif.model?.startsWith(exif.make) ? "" : exif.make,
    exif.model,
  ]
    .filter(Boolean)
    .join(" ");
  const hasCamera = !!(
    camera ||
    exif.focalLength ||
    exif.aperture ||
    exif.shutter ||
    exif.iso
  );
  const mp = megapixels(width, height);

  const groups = [
    hasCamera && {
      title: "The shot",
      rows: [
        camera && { k: "Camera", v: camera },
        exif.lens && { k: "Lens", v: exif.lens },
        exif.focalLength != null && {
          k: "Focal length",
          v: `${exif.focalLength} mm`,
          hint: focalHint(exif.focalLength),
        },
        exif.aperture != null && {
          k: "Aperture",
          v: `f/${exif.aperture}`,
          hint: apertureHint(exif.aperture),
        },
        exif.shutter != null && {
          k: "Shutter",
          v: shutterLabel(exif.shutter),
          hint: shutterHint(exif.shutter),
        },
        exif.iso != null && {
          k: "ISO",
          v: String(exif.iso),
          hint: isoHint(exif.iso),
        },
      ],
    },
    {
      title: "The file",
      rows: [
        { k: "Name", v: photo.originalFilename },
        width && {
          k: "Dimensions",
          v: `${width} × ${height} px`,
          hint: [mp && `${mp} megapixels.`, printHint(width, height)]
            .filter(Boolean)
            .join(" "),
        },
        { k: "Size", v: formatSize(sizeBytes) },
        {
          k: "Format",
          v: state.data.mimeType.replace("image/", "").toUpperCase(),
        },
      ],
    },
    {
      title: "When & where",
      rows: [
        {
          k: "Taken",
          v: exif.takenAt
            ? formatDate(exif.takenAt, "LLL d, yyyy · h:mm a")
            : "Not recorded",
          hint: exif.takenAt ? "Studio time (Phoenix)." : null,
        },
        {
          k: "Location",
          v: exif.gps ? `${exif.gps.lat}, ${exif.gps.lon}` : "Not recorded",
          hint: exif.gps ? "Only you see this." : null,
        },
        { k: "Uploaded", v: formatDate(state.data.uploadedAt, "LLL d, yyyy") },
      ],
    },
    {
      title: "In the gallery",
      rows: [
        { k: "Set", v: setName ?? "No set" },
        { k: "Cover", v: isCover ? "Yes" : "No" },
        { k: "Favorite", v: photo.favorite ? "Yes ♥" : "No" },
        { k: "Visible to client", v: photo.hidden ? "No — hidden" : "Yes" },
        {
          k: "Edits",
          v: state.data.editedAt ? "Original replaced" : "None",
          hint: state.data.editedAt
            ? `Edited ${formatDate(state.data.editedAt, "LLL d, yyyy · h:mm a")}. The first file is gone.`
            : "Straight from the camera.",
        },
      ],
    },
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      {hasCamera ? (
        <p className="text-ink text-[1.15rem] leading-7">
          Taken with{" "}
          {camera ? (
            <strong className="font-medium">{camera}</strong>
          ) : (
            "a camera"
          )}
          {exif.focalLength != null && (
            <>
              {" "}
              at{" "}
              <strong className="font-medium">
                {exif.focalLength} mm
                {exif.aperture != null && `, f/${exif.aperture}`}
              </strong>
            </>
          )}
          {exif.shutter != null && (
            <>
              {" "}
              — {shutterHint(exif.shutter)?.toLowerCase().replace(/\.$/, "")}
            </>
          )}
          .
        </p>
      ) : (
        <p className="text-small text-ink-muted">
          This file has no camera data (it may have been exported or edited).
        </p>
      )}
      {groups.map((g) => (
        <section key={g.title}>
          <h3 className="caps text-ink">{g.title}</h3>
          <dl className="mt-1.5">
            {g.rows.filter(Boolean).map((r) => (
              <div key={r.k} className="border-line border-t py-2.5">
                <div className="text-body flex justify-between gap-4">
                  <dt className="text-ink-muted">{r.k}</dt>
                  <dd className="text-ink text-right break-words">{r.v}</dd>
                </div>
                {r.hint && (
                  <p className="text-small text-ink-muted mt-0.5">{r.hint}</p>
                )}
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

function InfoSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <Skeleton className="h-14 w-full" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-3 w-24" />
          {[0, 1, 2, 3].map((j) => (
            <Skeleton key={j} className="h-5 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

InfoPanel.propTypes = {
  galleryId: PropTypes.number.isRequired,
  photo: PropTypes.object.isRequired,
  setName: PropTypes.string,
  isCover: PropTypes.bool,
};
