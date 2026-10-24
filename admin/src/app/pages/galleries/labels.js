// English copy of the Galleries pages (design: Gallery*.dc.html). The backend sends keys
// (`state.key`: draft | delivered | expired); this file turns them into text and tones.
import { formatDate } from "utils/date";

export { formatSize } from "components/shared/storage/storageLevel";

export const TABS = [
  { id: "all", label: "All galleries" },
  { id: "draft", label: "Drafts" },
  { id: "delivered", label: "Delivered" },
  { id: "expired", label: "Expired" },
];

export const SORT_OPTIONS = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "size", label: "Largest first" },
  { id: "title", label: "Name A–Z" },
];

export const EMPTY_TEXT = {
  all: "No galleries yet. Create one from a booking or a client.",
  draft: "No drafts. Everything you started has been delivered.",
  delivered: "Nothing delivered yet.",
  expired: "No expired galleries.",
};
export const NO_MATCH_TEXT = "No galleries match. Try fewer filters or another search.";

/** { label, tone } for the Status column and the tags: "Delivered · 20 days left". */
export function stateInfo(state) {
  if (state?.key === "expired") return { label: "Expired", tone: "alert" };
  if (state?.key === "delivered") {
    const left = state.daysLeft;
    if (left == null) return { label: "Delivered", tone: "done" };
    return { label: `Delivered · ${left} ${left === 1 ? "day" : "days"} left`, tone: left <= 14 ? "alert" : "done" };
  }
  return { label: "Draft · not shared", tone: "pending" };
}

export const COVER_LAYOUTS = [
  { value: "FULL", label: "Full" },
  { value: "SPLIT", label: "Split" },
  { value: "MINIMAL", label: "Minimal" },
];

export const DOWNLOAD_MODES = [
  { value: "HIGH_AND_WEB", label: "High-res + web" },
  { value: "WEB_ONLY", label: "Web only" },
  { value: "OFF", label: "Off" },
];

export const PRIVACY = [
  { value: "CLIENT_LOGIN", label: "Client login" },
  { value: "PASSWORD", label: "Password" },
  { value: "PUBLIC_LINK", label: "Anyone with link" },
];

export const FAVORITE_LIMITS = [
  { value: "10", label: "Up to 10" },
  { value: "20", label: "Up to 20" },
  { value: "40", label: "Up to 40" },
  { value: "", label: "No limit" },
];

export const pluralPhotos = (n) => `${n} ${n === 1 ? "photo" : "photos"}`;

/** "Delivered Sep 22" / "Expires Dec 19" helpers. */
export const shortDate = (value) => (value ? formatDate(value, "LLL d, yyyy") : "—");
