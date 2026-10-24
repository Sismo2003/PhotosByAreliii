// Storage levels — docs/almacenamiento-fotos.md §4.2. Evaluated in this order:
//   FULL      free ≤ 500 MB              red    uploads blocked
//   CRITICAL  free < 30 %                red
//   LOW       free 30 % – 60 % inclusive amber
//   OK        free > 60 %                green
// The backend is the source of truth (it returns `level`); this mirrors it for the UI.

export const RESERVE_BYTES = 500 * 1024 * 1024;

export function storageLevel(freeBytes, totalBytes, reserveBytes = RESERVE_BYTES) {
  if (!totalBytes) return "FULL";
  const freePct = (freeBytes / totalBytes) * 100;
  if (freeBytes <= reserveBytes) return "FULL";
  if (freePct < 30) return "CRITICAL";
  if (freePct <= 60) return "LOW";
  return "OK";
}

// The only colors in the admin besides ink and alert.
export const LEVEL_STYLES = {
  OK: { bar: "bg-success", text: "text-ink-muted" },
  LOW: { bar: "bg-warning", text: "text-ink-muted" },
  CRITICAL: { bar: "bg-error", text: "text-error dark:text-error-lighter" },
  FULL: { bar: "bg-error", text: "text-error dark:text-error-lighter" },
};

// 1 GB = 1024³ bytes, one decimal (docs/almacenamiento-fotos.md §6).
export function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${i === 0 ? n : n.toFixed(1)} ${units[i]}`;
}
