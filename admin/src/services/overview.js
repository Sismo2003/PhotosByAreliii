// Overview API — /api/admin/overview (docs/api-overview.md). Three reads, each widget loads its own.
import axios from "utils/axios";

const BASE = "/admin/overview";

/** { months: [{ month, booked, waiting, notBooked }], totals, agenda: [...], agendaDays } */
export const getOverviewBookings = () => axios.get(`${BASE}/bookings`);

/** Disk of the photo folder split by gallery (bytes really on disk). */
export const getOverviewStorage = (fresh = false) =>
  axios.get(`${BASE}/storage`, { params: { fresh: fresh ? 1 : undefined } });

/** Cloudflare Web Analytics, last 30 days — { ready: false } until it's configured. */
export const getOverviewVisits = () => axios.get(`${BASE}/visits`);
