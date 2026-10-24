// English copy of the Services pages. The backend sends keys and cents; this file turns them
// into text. A service is what Areli offers — nothing here is landing-page copy.
import { centsToInput, inputToCents, money } from "../bookings/labels";

export { centsToInput, inputToCents, money };

export const servicePath = (id) => `/services/${id}`;
export const NEW_SERVICE_PATH = "/services/new";

export const VIEWS = [
  { id: "services", label: "Services" },
  { id: "addons", label: "Add-ons" },
];

export const STATUS_OPTIONS = [
  { value: "LIVE", label: "Bookable", hint: "Shows in New booking and /book" },
  { value: "DRAFT", label: "Draft", hint: "Not bookable yet" },
  { value: "HIDDEN", label: "Hidden", hint: "Kept for past bookings, not bookable" },
];

const STATUS = {
  LIVE: { label: "Bookable", tone: "done" },
  DRAFT: { label: "Draft", tone: "pending" },
  HIDDEN: { label: "Hidden", tone: "muted" },
};

export const statusInfo = (status) => STATUS[status] ?? STATUS.DRAFT;

export const EMPTY_TEXT = {
  services: "No services yet. Add the first one.",
  addons: "No add-ons yet. Add one, like an extra outfit change.",
};

export const NO_MATCH_TEXT = {
  services: "No services match. Try another search.",
  addons: "No add-ons match. Try fewer filters or another search.",
};

/** Toolbar "Sort" choices → store `sort` + `dir`. */
export const SORT_OPTIONS = [
  { id: "order", label: "My order", sort: "", dir: "asc" },
  { id: "name", label: "Name A–Z", sort: "name", dir: "asc" },
  { id: "price", label: "Price, low to high", sort: "price", dir: "asc" },
  { id: "price-desc", label: "Price, high to low", sort: "price", dir: "desc" },
  { id: "bookings", label: "Most booked", sort: "bookings", dir: "desc" },
];

export const sortOptionId = ({ sort, dir }) =>
  SORT_OPTIONS.find((o) => o.sort === (sort || "") && (o.sort === "" || o.dir === dir))?.id ?? "custom";

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export { plural };

/** 90 → "1 h 30 min", 120 → "2 h", 45 → "45 min", 480 → "Full day". */
export function durationLabel(minutes) {
  const n = Number(minutes ?? 0);
  if (n >= 480) return "Full day";
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Price range of a service: "$160", "$180–$185", "—" when it has no visible package. */
export function priceRange(from, to) {
  if (from == null) return "—";
  return from === to ? money(from) : `${money(from)}–${money(to)}`;
}

/** "3 packages", "3 packages · 1 hidden", "No packages". */
export function packagesLabel(count, hidden) {
  if (!count) return "No packages";
  return `${plural(count, "package")}${hidden ? ` · ${hidden} hidden` : ""}`;
}

/** What an add-on adds to the session: "+30 min", "—". */
export const addsLabel = (minutes) => (minutes > 0 ? `+${durationLabel(minutes)}` : "—");

/** Where an add-on is offered: "All services", "Birthdays & parties", "3 services", "No service". */
export function offeredLabel(serviceIds, options) {
  if (!serviceIds.length) return "No service";
  if (options.length && serviceIds.length === options.length) return "All services";
  if (serviceIds.length === 1) return options.find((o) => o.id === serviceIds[0])?.name ?? "1 service";
  return `${serviceIds.length} services`;
}

/** What a package says about itself: "1 h · 2 outfits · up to 4 people · 2 sessions". */
export function packageSummary(p) {
  return [
    durationLabel(p.durationMinutes),
    p.outfits ? plural(p.outfits, "outfit") : null,
    p.maxPeople ? `up to ${plural(p.maxPeople, "person", "people")}` : null,
    p.sessionCount > 1 ? `${p.sessionCount} sessions` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

// Session lengths offered in the package form (minutes); "Full day" = 480.
export const DURATIONS = [30, 45, 60, 90, 120, 150, 180, 210, 240, 300, 360, 480];
