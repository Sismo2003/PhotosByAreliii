// Upload queue of the Photos tab (docs/almacenamiento-fotos.md §5): checks the whole batch against
// the free space BEFORE sending anything, then uploads one photo per request, 3 at a time. A batch
// that doesn't fit is rejected as a whole (nothing is sent). Files that aren't JPG, PNG or WebP, or
// are over 50 MB, are listed as failed without being sent.
import { useCallback, useEffect, useRef, useState } from "react";

import { refreshStorage } from "components/shared/storage/useStorageStatus";
import { checkStorage, uploadPhoto } from "services/galleries";

const PARALLEL = 3;
const MAX_BYTES = 50 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
let nextId = 1;

function problemWith(file) {
  if (/\.hei[cf]$/i.test(file.name) || /hei[cf]/i.test(file.type)) return "HEIC isn’t supported yet — export it as JPG.";
  if (!TYPES.includes(file.type)) return "Only JPG, PNG and WebP photos.";
  if (file.size > MAX_BYTES) return "Over 50 MB.";
  return null;
}

/** onProgressReload() runs while photos arrive and when the queue ends; onDone() once at the end. */
export function useUploader(galleryId, { onReload }) {
  const [items, setItems] = useState([]);
  const [blocked, setBlocked] = useState(null); // 507 details: { neededBytes, usableBytes, level, supportEmail }
  const abort = useRef(null);
  const reload = useRef(onReload);
  reload.current = onReload;

  // Created inside the effect: StrictMode mounts, unmounts and re-mounts, and a controller made once
  // outside it would stay aborted after the first cleanup (every upload would then be cancelled).
  useEffect(() => {
    const controller = new AbortController();
    abort.current = controller;
    return () => controller.abort();
  }, []);

  const patch = useCallback((id, next) => setItems((list) => list.map((it) => (it.id === id ? { ...it, ...next } : it))), []);

  const add = useCallback(
    async (fileList, setId) => {
      const files = [...fileList];
      if (files.length === 0) return;
      setBlocked(null);
      const entries = files.map((file) => ({ id: nextId++, file, name: file.name, size: file.size, status: "queued", progress: 0, error: problemWith(file) }));
      const sendable = entries.filter((e) => !e.error);
      setItems((list) => [...list, ...entries.map((e) => (e.error ? { ...e, status: "error" } : e))]);
      if (sendable.length === 0) return;

      try {
        await checkStorage(
          sendable.reduce((sum, e) => sum + e.size, 0),
          sendable.length,
        );
      } catch (err) {
        if (err.status === 507) setBlocked(err.details ?? {});
        const reason = err.status === 507 ? "Not enough space." : (err.message ?? "Could not check the space.");
        sendable.forEach((e) => patch(e.id, { status: "error", error: reason }));
        return;
      }

      const queue = [...sendable];
      let finished = 0;
      const worker = async () => {
        for (let entry = queue.shift(); entry; entry = queue.shift()) {
          patch(entry.id, { status: "uploading" });
          try {
            await uploadPhoto(galleryId, entry.file, { setId, signal: abort.current?.signal, onProgress: (p) => patch(entry.id, { progress: p }) });
            patch(entry.id, { status: "done", progress: 1 });
          } catch (err) {
            if (err.status === 507) setBlocked(err.details ?? {});
            patch(entry.id, { status: "error", error: err.message ?? "Upload failed" });
          }
          finished += 1;
          if (finished % 10 === 0) reload.current?.();
        }
      };
      await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, worker));
      reload.current?.();
      refreshStorage();
    },
    [galleryId, patch],
  );

  const clearFinished = useCallback(() => setItems((list) => list.filter((it) => it.status === "queued" || it.status === "uploading")), []);

  const active = items.filter((it) => it.status === "queued" || it.status === "uploading").length;
  return { items, add, clearFinished, blocked, active };
}

/** Files from a drop, including whole folders (webkitGetAsEntry). */
export async function filesFromDrop(event) {
  const items = [...(event.dataTransfer?.items ?? [])];
  const entries = items.map((i) => i.webkitGetAsEntry?.()).filter(Boolean);
  if (entries.length === 0) return [...(event.dataTransfer?.files ?? [])];
  const out = [];
  const walk = async (entry) => {
    if (entry.isFile) {
      out.push(await new Promise((resolve, reject) => entry.file(resolve, reject)));
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      // readEntries returns batches of up to 100: keep reading until it comes back empty.
      for (let batch = await new Promise((r, j) => reader.readEntries(r, j)); batch.length; batch = await new Promise((r, j) => reader.readEntries(r, j))) {
        for (const child of batch) await walk(child);
      }
    }
  };
  for (const entry of entries) await walk(entry);
  return out;
}
