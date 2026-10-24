// Saving photos to the device, two ways (the studio's choice per gallery, `downloadMode`):
//  · web copy  — reduced quality, quick, meant for sharing. On phones through the share sheet
//    ("Save N Images" goes straight to Photos, in batches so Safari doesn't run out of memory);
//    elsewhere a ZIP of web copies (several) or the JPG (one).
//  · full quality — the original files with Areli's rights written in: the file itself (one) or a ZIP
//    streamed by the server (several). The browser downloads these itself, so nothing is held in memory.
import { fetchDownload, fetchEdited, logDownload, originalUrl, zipUrl } from "services/portal";

export const SHARE_BATCH = 20;

const jpgName = (filename) => `${filename.replace(/\.[^.]+$/, "")}.jpg`;

async function toFile(slug, photo) {
  const { data } = await fetchDownload(slug, photo.id);
  return new File([data], jpgName(photo.filename), { type: "image/jpeg" });
}

function saveFile(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Starts a download the server answers with an attachment, without leaving the page. */
function startDownload(url) {
  const frame = document.createElement("iframe");
  frame.hidden = true;
  frame.src = url;
  document.body.appendChild(frame);
  setTimeout(() => frame.remove(), 60_000);
}

/** Can this device save photos through the share sheet (iPhone, Android)? */
export const canShareFiles = () => {
  try {
    return typeof navigator.canShare === "function" && navigator.canShare({ files: [new File([""], "a.jpg", { type: "image/jpeg" })] });
  } catch {
    return false;
  }
};

/** Web copy of `photos` (all loaded). Resolves to "saved" or "cancelled" (share sheet dismissed). */
export async function downloadWeb(slug, photos, { onProgress, pick } = {}) {
  const total = photos.length;
  if (canShareFiles()) {
    // Logged once per action, not per file; also checks access up front. A failure here (e.g. Areli's
    // read-only preview) must not stop the download itself.
    await logDownload(slug, photos.map((p) => p.id), "web").catch(() => {});
    let done = 0;
    for (let i = 0; i < total; i += SHARE_BATCH) {
      const files = await Promise.all(photos.slice(i, i + SHARE_BATCH).map((p) => toFile(slug, p)));
      try {
        await navigator.share({ files });
      } catch (e) {
        if (e?.name === "AbortError") return "cancelled";
        throw e;
      }
      done += files.length;
      onProgress?.(done, total);
    }
    return "saved";
  }
  if (total === 1) {
    await logDownload(slug, [photos[0].id], "web").catch(() => {});
    saveFile(await toFile(slug, photos[0]));
    return "saved";
  }
  startDownload(zipUrl(slug, "web", pick ?? { ids: photos.map((p) => p.id) })); // the server logs a ZIP itself
  return "saved";
}

/** Full quality: one original, or a ZIP of originals (`pick` = which, see zipUrl). */
export async function downloadFull(slug, photos, pick) {
  if (photos?.length === 1) {
    await logDownload(slug, [photos[0].id], "original").catch(() => {});
    startDownload(originalUrl(slug, photos[0].id));
  } else {
    startDownload(zipUrl(slug, "original", pick ?? { ids: photos.map((p) => p.id) }));
  }
  return "saved";
}

/**
 * The client's own edit (rotate / flip / straighten / resize) of the original, made on the fly by the
 * server. Fetched as one file so errors surface (rejects with { status }); phones save it through the
 * share sheet like the web copies, elsewhere it is a normal download. Logged only once it arrived.
 */
export async function downloadEdited(slug, photo, query) {
  const { data } = await fetchEdited(slug, photo.id, query);
  await logDownload(slug, [photo.id], "edited").catch(() => {});
  const ext = photo.filename.match(/\.[^.]+$/)?.[0] ?? ".jpg";
  const file = new File([data], `${photo.filename.replace(/\.[^.]+$/, "")}-edited${ext}`, { type: data.type || "image/jpeg" });
  if (canShareFiles()) {
    try {
      await navigator.share({ files: [file] });
      return "saved";
    } catch (e) {
      if (e?.name === "AbortError") return "cancelled";
      // NotAllowedError: the edit took long enough for the tap to expire — fall back to a download.
    }
  }
  saveFile(file);
  return "saved";
}
