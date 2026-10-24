// "Info" tool: camera and file facts in plain words, plus the rights written into every file. Data
// comes from GET /api/client/…/photos/:id/info. Coordinates are never shown on screen (they stay in the file).
import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Skeleton } from "components/ui";
import { getPhotoInfo } from "services/portal";
import { formatDate } from "utils/date";

import {
  apertureHint,
  focalHint,
  formatSize,
  isoHint,
  megapixels,
  printSize,
  shutterHint,
  shutterLabel,
} from "./explain";

export function InfoPanel({ slug, photo, setName }) {
  const { t } = useTranslation();
  const [state, setState] = useState({
    loading: true,
    data: null,
    error: false,
  });

  useEffect(() => {
    let alive = true;
    setState({ loading: true, data: null, error: false });
    getPhotoInfo(slug, photo.id)
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
  }, [slug, photo.id]);

  if (state.loading) return <InfoSkeleton />;
  if (state.error || !state.data)
    return <p className="text-small text-ink-muted">{t("info.error")}</p>;

  const { exif = {}, width, height, sizeBytes, rights } = state.data;
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
  const print = printSize(width, height);
  const hint = (key) => (key ? t(key) : null);

  const groups = [
    hasCamera && {
      title: t("info.shot"),
      rows: [
        camera && { k: t("info.camera"), v: camera },
        exif.lens && { k: t("info.lens"), v: exif.lens },
        exif.focalLength != null && {
          k: t("info.focal"),
          v: `${exif.focalLength} mm`,
          hint: hint(focalHint(exif.focalLength)),
        },
        exif.aperture != null && {
          k: t("info.aperture"),
          v: `f/${exif.aperture}`,
          hint: hint(apertureHint(exif.aperture)),
        },
        exif.shutter != null && {
          k: t("info.shutter"),
          v: shutterLabel(exif.shutter),
          hint: hint(shutterHint(exif.shutter)),
        },
        exif.iso != null && {
          k: "ISO",
          v: String(exif.iso),
          hint: hint(isoHint(exif.iso)),
        },
      ],
    },
    {
      title: t("info.file"),
      rows: [
        { k: t("info.name"), v: state.data.filename },
        width && {
          k: t("info.dimensions"),
          v: `${width} × ${height} px`,
          hint: [
            mp && t("info.megapixels", { mp }),
            print && t("info.print", print),
          ]
            .filter(Boolean)
            .join(" "),
        },
        { k: t("info.size"), v: formatSize(sizeBytes) },
        {
          k: t("info.format"),
          v: state.data.mimeType.replace("image/", "").toUpperCase(),
        },
      ],
    },
    {
      title: t("info.when"),
      rows: [
        {
          k: t("info.taken"),
          v: exif.takenAt
            ? formatDate(exif.takenAt, "LLL d, yyyy · h:mm a")
            : t("info.notRecorded"),
          hint: exif.takenAt ? t("info.studioTime") : null,
        },
        exif.hasLocation && {
          k: t("info.location"),
          v: t("info.locationSaved"),
          hint: t("info.locationHint"),
        },
        setName && { k: t("info.set"), v: setName },
      ],
    },
    {
      title: t("info.rights"),
      rows: [
        { k: t("info.owner"), v: rights.owner },
        { k: t("info.copyright"), v: rights.copyright },
        { k: t("info.licensee"), v: rights.licensee },
        { k: t("info.terms"), v: rights.terms },
      ],
    },
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      {hasCamera ? (
        <p className="text-ink text-[1.15rem] leading-7">
          {t("info.takenWith")}{" "}
          {camera ? (
            <strong className="font-medium">{camera}</strong>
          ) : (
            t("info.aCamera")
          )}
          {exif.focalLength != null && (
            <>
              {" "}
              {t("info.at")}{" "}
              <strong className="font-medium">
                {exif.focalLength} mm
                {exif.aperture != null && `, f/${exif.aperture}`}
              </strong>
            </>
          )}
          .
        </p>
      ) : (
        <p className="text-small text-ink-muted">{t("info.noCamera")}</p>
      )}
      {groups.map((g) => (
        <section key={g.title}>
          <h3 className="caps text-ink">{g.title}</h3>
          <dl className="mt-1.5">
            {g.rows.filter(Boolean).map((r) => (
              <div key={r.k} className="border-line border-t py-2.5">
                <div className="text-body flex justify-between gap-4">
                  <dt className="text-ink-muted shrink-0">{r.k}</dt>
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
  slug: PropTypes.string.isRequired,
  photo: PropTypes.object.isRequired,
  setName: PropTypes.string,
};
