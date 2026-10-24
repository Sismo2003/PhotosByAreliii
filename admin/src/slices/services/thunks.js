// Async actions of the Services slice. Loads write errors to the store; mutations resolve to
// { ok, data } | { ok: false, error } so the page can toast the API's `error_message`.
import { useServicesStore } from "./store";
import {
  createAddon,
  createPackage,
  createService,
  deleteAddon,
  deletePackage,
  deleteService,
  getService,
  getServicesSummary,
  listAddons,
  listServiceOptions,
  listServices,
  reorderAddons,
  reorderPackages,
  reorderServices,
  setAddonServices,
  setServiceExtras,
  updateAddon,
  updatePackage,
  updateService,
} from "services/catalog";

// Ignore responses that arrive after the filters changed again (fast typing in Search).
let listSeq = 0;
let addonSeq = 0;

export async function loadServicesSummaryThunk() {
  const { _setSummary } = useServicesStore.getState();
  try {
    const { data } = await getServicesSummary();
    _setSummary(data.data ?? null);
  } catch {
    _setSummary(null);
  }
}

export async function loadServiceOptionsThunk() {
  try {
    const { data } = await listServiceOptions();
    useServicesStore.getState()._setOptions(data.data ?? []);
  } catch {
    /* the pickers just stay empty */
  }
}

export async function loadServicesListThunk() {
  const { query, pageSize, _setList } = useServicesStore.getState();
  const seq = ++listSeq;
  _setList({ loading: true, error: null });
  try {
    const { data } = await listServices({ ...query, pageSize });
    if (seq !== listSeq) return;
    _setList({ items: data.data?.items ?? [], total: data.data?.total ?? 0, loading: false });
  } catch (err) {
    if (seq !== listSeq) return;
    _setList({ items: [], total: 0, loading: false, error: err.message ?? "Could not load services" });
  }
}

export async function loadAddonsListThunk() {
  const { addonQuery, pageSize, _setAddons } = useServicesStore.getState();
  const seq = ++addonSeq;
  _setAddons({ loading: true, error: null });
  try {
    const { data } = await listAddons({ ...addonQuery, pageSize });
    if (seq !== addonSeq) return;
    _setAddons({ items: data.data?.items ?? [], total: data.data?.total ?? 0, loading: false });
  } catch (err) {
    if (seq !== addonSeq) return;
    _setAddons({ items: [], total: 0, loading: false, error: err.message ?? "Could not load add-ons" });
  }
}

export async function loadServiceThunk(id) {
  const { _setService } = useServicesStore.getState();
  _setService({ loading: true, error: null });
  try {
    const { data } = await getService(id);
    _setService({ data: data.data, loading: false });
  } catch (err) {
    _setService({ data: null, loading: false, error: err.status === 404 ? "not_found" : (err.message ?? "error") });
  }
}

// Every list, the header numbers and the pickers depend on the catalog.
async function refreshLists() {
  await Promise.all([loadServicesListThunk(), loadAddonsListThunk(), loadServicesSummaryThunk(), loadServiceOptionsThunk()]);
}

// `reload`: how to read the open service out of the answer — "service" (the answer is the
// service itself) or "refetch" (the answer is something smaller: reload the open service).
async function run(call, { reload } = {}) {
  const { _setBusy, _setService, service } = useServicesStore.getState();
  _setBusy(true);
  try {
    const { data } = await call();
    if (reload === "service" && data.data?.packages) _setService({ data: data.data });
    else if (reload === "refetch" && service.data) await loadServiceThunk(service.data.id);
    await refreshLists();
    return { ok: true, data: data.data };
  } catch (err) {
    return { ok: false, error: err };
  } finally {
    _setBusy(false);
  }
}

export const createServiceThunk = (body) => run(() => createService(body));
export const updateServiceThunk = (id, body) => run(() => updateService(id, body), { reload: "service" });
export const deleteServiceThunk = (id) => run(() => deleteService(id));
export const reorderServicesThunk = (ids) => run(() => reorderServices(ids));
export const setServiceExtrasThunk = (id, extraIds) => run(() => setServiceExtras(id, extraIds), { reload: "service" });

export const createPackageThunk = (serviceId, body) => run(() => createPackage(serviceId, body), { reload: "refetch" });
export const updatePackageThunk = (packageId, body) => run(() => updatePackage(packageId, body), { reload: "refetch" });
export const deletePackageThunk = (packageId) => run(() => deletePackage(packageId), { reload: "refetch" });
export const reorderPackagesThunk = (serviceId, ids) => run(() => reorderPackages(serviceId, ids), { reload: "service" });

export const createAddonThunk = (body) => run(() => createAddon(body), { reload: "refetch" });
export const updateAddonThunk = (id, body) => run(() => updateAddon(id, body), { reload: "refetch" });
export const deleteAddonThunk = (id) => run(() => deleteAddon(id), { reload: "refetch" });
export const setAddonServicesThunk = (id, serviceIds) => run(() => setAddonServices(id, serviceIds), { reload: "refetch" });
export const reorderAddonsThunk = (ids) => run(() => reorderAddons(ids));
