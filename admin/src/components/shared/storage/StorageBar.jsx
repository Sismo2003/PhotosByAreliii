// Import Dependencies
import PropTypes from "prop-types";
import { Link } from "react-router";
import clsx from "clsx";

// Local Imports
import { SUPPORT_EMAIL } from "constants/app.constant";
import {
  LEVEL_STYLES,
  formatSize,
  storageLevel,
} from "./storageLevel";

// ----------------------------------------------------------------------

// Sidebar storage bar — docs/almacenamiento-fotos.md §7.
// Fill = space USED; color = level from the space FREE. Always has text, never color alone.

const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
  "More storage for Photos By Areliii",
)}`;

export function StorageBar({ status, error, className }) {
  if (error || !status) {
    return (
      <div className={clsx("flex flex-col gap-2", className)}>
        <span className="field-label">Storage</span>
        <span className="text-small text-ink-muted">
          {error ? "Unavailable right now" : "Checking…"}
        </span>
      </div>
    );
  }

  const { totalBytes, freeBytes, reserveBytes } = status;
  const level = status.level ?? storageLevel(freeBytes, totalBytes, reserveBytes);
  const usedPct = totalBytes
    ? Math.min(100, Math.max(0, ((totalBytes - freeBytes) / totalBytes) * 100))
    : 100;
  const styles = LEVEL_STYLES[level];

  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <span className="field-label" id="storage-label">
        Storage
      </span>
      <div
        role="progressbar"
        aria-labelledby="storage-label"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(usedPct)}
        aria-valuetext={`${formatSize(freeBytes)} free of ${formatSize(totalBytes)}`}
        className="h-1.5 w-full bg-line"
      >
        <div
          className={clsx("h-full transition-[width] duration-300", styles.bar)}
          style={{ width: `${usedPct}%` }}
        />
      </div>
      <span className={clsx("text-small", styles.text)}>
        {formatSize(freeBytes)} free of {formatSize(totalBytes)}
      </span>

      {level === "CRITICAL" && (
        <Link
          to="/galleries?sort=oldest"
          className="text-small text-error underline dark:text-error-lighter"
        >
          Running low — delete old galleries
        </Link>
      )}

      {level === "FULL" && (
        <p className="text-small text-error dark:text-error-lighter">
          Storage full — uploads paused.{" "}
          <Link to="/galleries?sort=oldest" className="underline">
            Delete old galleries
          </Link>{" "}
          or contact Alexis at{" "}
          <a href={mailto} className="underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      )}
    </div>
  );
}

StorageBar.propTypes = {
  status: PropTypes.shape({
    totalBytes: PropTypes.number,
    freeBytes: PropTypes.number,
    reserveBytes: PropTypes.number,
    level: PropTypes.oneOf(["OK", "LOW", "CRITICAL", "FULL"]),
  }),
  error: PropTypes.object,
  className: PropTypes.string,
};
