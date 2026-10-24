// Clients API — /api/admin/clients (Backend/routes/client.routes.js, docs/api-clients.md).
// Money travels as integer cents; dates as UTC ISO strings (reminder `dueOn` is a plain day).
import axios from "utils/axios";

const BASE = "/admin/clients";

/** Header stats + tab counts: { total, returning, year, receivedYearCents, reachOutSoon, counts }. */
export const getClientsSummary = () => axios.get(`${BASE}/summary`);

/** One tab of the list. `sort` is "" (recent activity) | "name" | "received". */
export const listClients = ({ tab, q, heardFrom, login, sort, dir, page = 1, pageSize = 25 }) =>
  axios.get(BASE, {
    params: {
      tab,
      q: q || undefined,
      heardFrom: heardFrom || undefined,
      login: login || undefined,
      sort: sort || undefined,
      dir: sort ? dir : undefined,
      page,
      pageSize,
    },
  });

/** → { client, sessions, history } */
export const getClient = (id) => axios.get(`${BASE}/${id}`);

/** { firstName, lastName?, displayName?, email, phone?, instagram?, heardFrom?, privateNotes? } */
export const createClient = (body) => axios.post(BASE, body);

/** Only what changed. Email is also the login, so it follows to the login account. */
export const updateClient = (id, body) => axios.patch(`${BASE}/${id}`, body);

/** { kind: RebookKind | null, dueOn?: "YYYY-MM-DD", label? } — null clears the open reminder. */
export const setClientReminder = (id, body) => axios.put(`${BASE}/${id}/rebook-reminder`, body);

/** Soft delete: hides the client; bookings and payments are untouched. */
export const deleteClient = (id) => axios.delete(`${BASE}/${id}`);

export const restoreClient = (id) => axios.post(`${BASE}/${id}/restore`);
