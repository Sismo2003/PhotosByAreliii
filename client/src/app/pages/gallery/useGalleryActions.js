import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { addFavorite, removeFavorite } from "services/portal";
import { canShareFiles, downloadEdited, downloadFull, downloadWeb } from "utils/download";

/**
 * Favorite + download actions shared by the grid island and the viewer. Favorites are optimistic and
 * rolled back if the server says no (limit reached, session gone…). `message` is a short status line.
 */
export function useGalleryActions({ slug, gallery, pages, favoriteCount, setFavoriteCount }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const say = useCallback((text) => {
    setMessage(text);
    if (text) setTimeout(() => setMessage((m) => (m === text ? null : m)), 3500);
  }, []);

  const setFavorite = useCallback(
    async (photos, on) => {
      const todo = photos.filter((p) => Boolean(p.favorite) !== on);
      if (!todo.length) return;
      setBusy(true);
      let changed = 0;
      for (const p of todo) {
        pages.patch(p.id, { favorite: on });
        try {
          const { data } = await (on ? addFavorite : removeFavorite)(slug, p.id);
          setFavoriteCount(data.data.favoriteCount);
          changed++;
        } catch (e) {
          pages.patch(p.id, { favorite: !on });
          say(e.code === "FAVORITES_LIMIT" ? t("gallery.favoritesLimit", { count: gallery.favoritesLimit }) : t("gallery.favoriteFailed"));
          break;
        }
      }
      setBusy(false);
      return changed;
    },
    [slug, gallery, pages, setFavoriteCount, say, t],
  );

  // Web copy (reduced quality). `pick` = which photos when it is a whole filter (see zipUrl).
  const saveWeb = useCallback(
    async (photos, pick) => {
      setBusy(true);
      try {
        const list = pick && canShareFiles() ? await pages.loadAll() : photos; // the share sheet needs the files themselves
        if (!list) throw new Error("load");
        const result = await downloadWeb(slug, list, {
          pick,
          onProgress: (done, total) => total > 1 && say(t("gallery.downloading", { done, total })),
        });
        say(result === "saved" ? (list.length > 1 && !canShareFiles() ? t("download.preparing") : t("gallery.downloaded", { count: list.length })) : null);
      } catch {
        say(t("gallery.downloadFailed"));
      } finally {
        setBusy(false);
      }
    },
    [slug, pages, say, t],
  );

  // Full quality: the original (one) or a ZIP of originals (several / a whole filter). The browser takes
  // over from here; the button rests a few seconds so a double tap doesn't start two ZIPs.
  const saveFull = useCallback(
    async (photos, pick) => {
      setBusy(true);
      try {
        await downloadFull(slug, photos, pick);
        say(t("download.preparing"));
      } catch {
        say(t("gallery.downloadFailed"));
      }
      setTimeout(() => setBusy(false), 4000);
    },
    [slug, say, t],
  );

  // The client's own edit of one original (rotate / flip / straighten / resize), made on the fly by the server.
  const saveEdited = useCallback(
    async (photo, query) => {
      setBusy(true);
      try {
        const result = await downloadEdited(slug, photo, query);
        say(result === "saved" ? t("viewer.editedSaved") : null);
      } catch (e) {
        say(e?.status === 429 ? t("viewer.editBusy") : e?.status === 400 ? t("viewer.editInvalid") : t("gallery.downloadFailed"));
      } finally {
        setBusy(false);
      }
    },
    [slug, say, t],
  );

  return { busy, message, setFavorite, saveWeb, saveFull, saveEdited, favoriteCount };
}
