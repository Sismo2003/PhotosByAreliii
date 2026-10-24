import { useCallback, useEffect, useRef, useState } from "react";

import { listPhotos } from "services/portal";

const PAGE_SIZE = 60;

/**
 * Cursor pages of a gallery's photos (optionally one set). `loadMore` is safe to call from a
 * scroll observer as often as it fires: only one request runs at a time, and pages that belong to
 * a previous set (the client switched filters mid-request) are dropped.
 */
export function usePhotoPages(slug, setId, favorites = false) {
  const [state, setState] = useState({ photos: [], cursor: null, done: false, error: null, loading: true });
  const busy = useRef(false);
  const generation = useRef(0);

  const fetchPage = useCallback(
    async (cursor, gen) => {
      busy.current = true;
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const { data } = await listPhotos(slug, { cursor, setId, favorites, pageSize: PAGE_SIZE });
        if (gen !== generation.current) return;
        const { photos, nextCursor } = data.data;
        setState((s) => ({
          photos: cursor ? [...s.photos, ...photos] : photos,
          cursor: nextCursor,
          done: !nextCursor,
          error: null,
          loading: false,
        }));
      } catch (error) {
        if (gen === generation.current) setState((s) => ({ ...s, error, loading: false }));
      } finally {
        if (gen === generation.current) busy.current = false;
      }
    },
    [slug, setId, favorites],
  );

  useEffect(() => {
    generation.current += 1;
    busy.current = false;
    setState({ photos: [], cursor: null, done: false, error: null, loading: true });
    fetchPage(null, generation.current);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (busy.current || state.done || state.error) return;
    fetchPage(state.cursor, generation.current);
  }, [fetchPage, state.cursor, state.done, state.error]);

  const retry = useCallback(() => fetchPage(state.cursor, generation.current), [fetchPage, state.cursor]);

  // Mirror of the state for loadAll (it runs across several awaits).
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });

  /** Loads every remaining page (Select all) and resolves to the full list, or null if it failed / the filter changed. */
  const loadAll = useCallback(async () => {
    const gen = generation.current;
    while (busy.current) await new Promise((r) => setTimeout(r, 50)); // a page is in flight: let it land
    if (gen !== generation.current) return null;
    let { photos, cursor, done } = latest.current;
    busy.current = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      while (!done) {
        const { data } = await listPhotos(slug, { cursor, setId, favorites, pageSize: 100 });
        if (gen !== generation.current) return null;
        photos = [...photos, ...data.data.photos];
        cursor = data.data.nextCursor;
        done = !cursor;
      }
      setState({ photos, cursor: null, done: true, error: null, loading: false });
      return photos;
    } catch (error) {
      if (gen === generation.current) setState((s) => ({ ...s, error, loading: false }));
      return null;
    } finally {
      if (gen === generation.current) busy.current = false;
    }
  }, [slug, setId, favorites]);

  /** Patch one loaded photo (e.g. its favorite flag) without refetching. */
  const patch = useCallback(
    (id, changes) => setState((s) => ({ ...s, photos: s.photos.map((p) => (p.id === id ? { ...p, ...changes } : p)) })),
    [],
  );

  return { ...state, loadMore, retry, loadAll, patch };
}
