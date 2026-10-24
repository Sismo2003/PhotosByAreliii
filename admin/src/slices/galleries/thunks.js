// Async actions of the Galleries slice. Loads write errors to the store; mutations resolve to
// { ok, data } | { ok: false, error } so the page can toast the API's `error_message`.
import { useGalleriesStore } from "./store";
import * as api from "services/galleries";
import { refreshStorage } from "components/shared/storage/useStorageStatus";

let listSeq = 0;

export async function loadGalleriesSummaryThunk() {
  const { _setSummary } = useGalleriesStore.getState();
  try {
    const { data } = await api.getGalleriesSummary();
    _setSummary(data.data ?? null);
  } catch {
    _setSummary(null);
  }
}

export async function loadGalleriesListThunk() {
  const { tab, query, pageSize, _setList } = useGalleriesStore.getState();
  const seq = ++listSeq;
  _setList({ loading: true, error: null });
  try {
    const { data } = await api.listGalleries({ tab, ...query, pageSize });
    if (seq !== listSeq) return;
    _setList({ items: data.data?.items ?? [], total: data.data?.total ?? 0, loading: false });
  } catch (err) {
    if (seq !== listSeq) return;
    _setList({ items: [], total: 0, loading: false, error: err.message ?? "Could not load galleries" });
  }
}

export async function loadGalleryThunk(id, { quiet = false } = {}) {
  const { _setGallery } = useGalleriesStore.getState();
  if (!quiet) _setGallery({ loading: true, error: null });
  try {
    const { data } = await api.getGallery(id);
    _setGallery({ data: data.data, loading: false, error: null });
  } catch (err) {
    _setGallery({ data: quiet ? useGalleriesStore.getState().gallery.data : null, loading: false, error: err.status === 404 ? "not_found" : (err.message ?? "error") });
  }
}

// Mutations answer with the fresh gallery (or the created one): show it without another round trip.
async function run(call, { reload = true, storage = false } = {}) {
  const { _setBusy, _setGallery } = useGalleriesStore.getState();
  _setBusy(true);
  try {
    const { data } = await call();
    if (reload && data.data?.id) _setGallery({ data: data.data });
    if (storage) refreshStorage();
    loadGalleriesSummaryThunk();
    return { ok: true, data: data.data };
  } catch (err) {
    return { ok: false, error: err };
  } finally {
    _setBusy(false);
  }
}

export const createGalleryThunk = (body) => run(() => api.createGallery(body), { reload: false });
export const updateGalleryThunk = (id, body) => run(() => api.updateGallery(id, body));
export const deleteGalleryThunk = (id) => run(() => api.deleteGallery(id), { reload: false, storage: true });
export const addSetThunk = (id, name) => run(() => api.addSet(id, name));
export const updateSetThunk = (id, setId, body) => run(() => api.updateSet(id, setId, body));
export const removeSetThunk = (id, setId) => run(() => api.removeSet(id, setId));
export const bulkPhotosThunk = (id, body) => run(() => api.bulkPhotos(id, body), { storage: body.action === "delete" });
export const setCoverThunk = (id, photoId) => run(() => api.setCover(id, photoId));
export const deliverGalleryThunk = (id, body) => run(() => api.deliverGallery(id, body));
export const extendGalleryThunk = (id, days) => run(() => api.extendGallery(id, days));
export const setPhotoFocusThunk = (id, photoId, body) => run(() => api.setPhotoFocus(id, photoId, body).then(() => api.getGallery(id)));
export const editPhotoThunk = (id, photoId, body) => run(() => api.editPhoto(id, photoId, body).then(() => api.getGallery(id)), { storage: true });
