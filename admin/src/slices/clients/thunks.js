// Async actions of the Clients slice. Loads write errors to the store; mutations resolve to
// { ok, data } | { ok: false, error } so the page can toast the API's `error_message`.
import { useClientsStore } from "./store";
import {
  createClient,
  deleteClient,
  getClient,
  getClientsSummary,
  listClients,
  restoreClient,
  setClientReminder,
  updateClient,
} from "services/clients";

// Ignore responses that arrive after the tab/filters changed again (fast typing in Search).
let listSeq = 0;

export async function loadClientsSummaryThunk() {
  const { _setSummary } = useClientsStore.getState();
  try {
    const { data } = await getClientsSummary();
    _setSummary(data.data ?? null);
  } catch {
    _setSummary(null);
  }
}

export async function loadClientsListThunk() {
  const { tab, query, pageSize, _setList } = useClientsStore.getState();
  const seq = ++listSeq;
  _setList({ loading: true, error: null });
  try {
    const { data } = await listClients({ tab, ...query, pageSize });
    if (seq !== listSeq) return;
    _setList({ items: data.data?.items ?? [], total: data.data?.total ?? 0, loading: false });
  } catch (err) {
    if (seq !== listSeq) return;
    _setList({ items: [], total: 0, loading: false, error: err.message ?? "Could not load clients" });
  }
}

export async function loadClientThunk(id) {
  const { _setClient } = useClientsStore.getState();
  _setClient({ loading: true, error: null });
  try {
    const { data } = await getClient(id);
    _setClient({ data: data.data, loading: false });
  } catch (err) {
    _setClient({ data: null, loading: false, error: err.status === 404 ? "not_found" : (err.message ?? "error") });
  }
}

// The list, the header numbers and the tab counts all depend on a client's data.
async function refreshLists() {
  await Promise.all([loadClientsListThunk(), loadClientsSummaryThunk()]);
}

async function run(call, { reload } = {}) {
  const { _setBusy, _setClient } = useClientsStore.getState();
  _setBusy(true);
  try {
    const { data } = await call();
    // Mutations answer with the fresh profile: show it without another round trip.
    if (reload && data.data?.client) _setClient({ data: data.data });
    await refreshLists();
    return { ok: true, data: data.data };
  } catch (err) {
    return { ok: false, error: err };
  } finally {
    _setBusy(false);
  }
}

export const createClientThunk = (body) => run(() => createClient(body));

export const updateClientThunk = (id, body) => run(() => updateClient(id, body), { reload: true });

export const setClientReminderThunk = (id, body) => run(() => setClientReminder(id, body), { reload: true });

export const deleteClientThunk = (id) => run(() => deleteClient(id));

export const restoreClientThunk = (id) => run(() => restoreClient(id), { reload: true });
