// The public booking API (docs/api-public-booking.md). Same origin as the site, no session needed.

export type ApiPackage = { id: number; name: string; priceCents: number; durationMinutes: number; customDescription: string | null; isFeatured: boolean };
export type ApiService = { id: number; slug: string; name: string; packages: ApiPackage[] };
export type ApiExtra = { id: number; name: string; priceCents: number; minutes: number; serviceIds: number[] };
export type Catalog = {
  services: ApiService[];
  extras: ApiExtra[];
  settings: { depositPercent: number; replyWithinHours: number; policyVersion: number };
};
export type Slot = { time: string; label: string | null; open: boolean };
export type Month = { month: string; minMonth: string; maxMonth: string; days: { date: string; slots: Slot[] }[] };
export type Created = {
  code: string;
  firstName: string;
  email: string;
  startsAt: string;
  durationMinutes: number;
  locationName: string;
  totalCents: number;
  depositCents: number;
  replyWithinHours: number;
};

/** What went wrong, in a form the page can translate. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string | null,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/public${path}`, {
      credentials: "omit", // nothing here needs the session cookie
      headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}) },
      ...init,
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error; // a newer request replaced this one
    throw new ApiError(0, "OFFLINE", "Network error");
  }
  // nginx answers its own 429/502 without JSON.
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || body.error) {
    const code = body?.details?.code ?? (res.status === 429 ? "RATE_LIMITED" : null);
    throw new ApiError(res.status, code, body?.error_message ?? res.statusText);
  }
  return body.data as T;
}

export const getCatalog = () => request<Catalog>("/catalog");

export const getMonth = (month: string, minutes: number, signal?: AbortSignal) =>
  request<Month>(`/availability?month=${encodeURIComponent(month)}&minutes=${minutes}`, { signal });

export const sendRequest = (payload: Record<string, unknown>) =>
  request<Created>("/bookings", { method: "POST", body: JSON.stringify(payload) });
