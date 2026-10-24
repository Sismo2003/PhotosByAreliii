// One place for every English label in Bookings. The backend sends keys and tones in
// `derived` (docs/api-bookings.md §2); copy comes from the AdminBookings*.dc.html design.
// Money always arrives in integer cents.
import { formatDate, formatDay } from "utils/date";

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

/** 16000 → "$160", 8750 → "$87.50" (design: whole dollars without decimals). */
export function money(cents) {
  const n = Number(cents ?? 0);
  const text = (Math.abs(n) / 100).toLocaleString("en-US", {
    minimumFractionDigits: n % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? "−" : ""}$${text}`;
}

/** Cents → the plain dollar string an input expects ("87.50", "80"). */
export function centsToInput(cents) {
  const n = Math.max(0, Number(cents ?? 0));
  return n % 100 === 0 ? String(n / 100) : (n / 100).toFixed(2);
}

/** "87.5" / "$87.50" / "1,200" → 8750 integer cents; null when it isn't a positive amount. */
export function inputToCents(value) {
  const clean = String(value ?? "").replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(clean)) return null;
  const cents = Math.round(Number(clean) * 100);
  return cents > 0 ? cents : null;
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const PAYMENT_METHODS = [
  { value: "ZELLE", label: "Zelle" },
  { value: "CASH_APP", label: "Cash App" },
  { value: "CASH", label: "Cash" },
];

export const methodLabel = (method) =>
  PAYMENT_METHODS.find((m) => m.value === method)?.label ?? null;

/** Cancel form reasons → CancelReason enum. */
export const CANCEL_REASONS = [
  { value: "CLIENT_REQUEST", label: "Client asked to cancel" },
  { value: "WEATHER", label: "Weather" },
  { value: "PHOTOGRAPHER_UNAVAILABLE", label: "Areli unavailable" },
  { value: "NO_DEPOSIT", label: "No deposit received" },
  { value: "NO_SHOW", label: "No-show (more than 30 min late)" },
];

export const cancelReasonLabel = (reason) =>
  CANCEL_REASONS.find((r) => r.value === reason)?.label ?? null;

const PARTY = {
  JUST_ME: "1 person",
  TWO: "2 people",
  THREE_TO_FIVE: "3–5 people",
  SIX_TO_EIGHT: "6–8 people",
};

export const partyLabel = (size) => PARTY[size] ?? size;

export const DEPOSIT_CHOICES = [
  { value: "keep", label: "Keep deposit (non-refundable)" },
  { value: "refund", label: "Refund anyway" },
];

/** Rebook reminder select → RebookKind enum ("" = none). NEWBORN needs a date. */
export const REBOOK_OPTIONS = [
  { value: "SIX_MONTHS_FAMILY", label: "In 6 months · family update" },
  { value: "ONE_YEAR_ANNIVERSARY_BIRTHDAY", label: "In 1 year · anniversary or birthday" },
  { value: "NEXT_SPRING_GRADUATION", label: "Next spring · graduation season" },
  { value: "NEWBORN", label: "When baby arrives · newborn session", needsDate: true },
];

export const rebookLabel = (kind) =>
  REBOOK_OPTIONS.find((o) => o.value === kind)?.label ?? null;

// ---------------------------------------------------------------------------
// Tones (design colors: done/new #151515, pending #6e6e6e, alert #9b2335, muted #8a8a8a)
// ---------------------------------------------------------------------------

export const TONE_TEXT = {
  done: "text-ink",
  new: "text-ink",
  pending: "text-ink-muted",
  alert: "text-alert",
  muted: "text-line-strong",
};

/** Filled dot for done/alert, hollow ring for the rest (as in the design). */
export const TONE_DOT = {
  done: "border-ink bg-ink",
  new: "border-ink bg-transparent",
  pending: "border-ink-muted bg-transparent",
  alert: "border-alert bg-alert",
  muted: "border-line-strong bg-transparent",
};

// ---------------------------------------------------------------------------
// derived.* → labels
// ---------------------------------------------------------------------------

const withMethod = (text, method) => {
  const m = methodLabel(method);
  return m ? `${text} · ${m}` : text;
};

/** derived.payment → "Paid in full · Zelle", "Balance due $80", "Deposit overdue"… */
export function paymentLabel(b) {
  const d = b?.derived ?? {};
  const key = d.payment?.key;
  const paid = d.paidCents ?? 0;
  switch (key) {
    case "none_cancelled":
      return "No payment";
    case "deposit_kept":
      return withMethod("Deposit kept", d.lastPaymentMethod);
    case "no_deposit_yet":
      return "No deposit yet";
    case "paid_in_full":
      return withMethod("Paid in full", d.lastPaymentMethod);
    case "deposit_paid":
      return withMethod("Deposit paid", d.lastPaymentMethod);
    case "balance_due":
      return `Balance due ${money(d.balanceCents)}`;
    case "deposit_due":
      return `Deposit due ${money(Math.max(0, (b.depositCents ?? 0) - paid))}`;
    case "deposit_overdue":
      return "Deposit overdue";
    default:
      return "—";
  }
}

const NEXT_STEP = {
  create_gallery: "Create gallery",
  deliver_gallery: "Deliver gallery",
  deliver_gallery_overdue: "Deliver gallery — overdue",
  send_thanks: "Send thank-you",
  ask_review: "Ask for a review",
  waiting_review: "Waiting on review",
  set_rebook: "Set a rebook reminder",
  ready_to_archive: "Ready to archive",
};

/** derived.nextStep → "Collect $80 balance", "Create gallery"… */
export function nextStepLabel(b) {
  const key = b?.derived?.nextStep?.key;
  if (!key) return null;
  if (key === "collect_balance") return `Collect ${money(b.derived.balanceCents)} balance`;
  return NEXT_STEP[key] ?? key;
}

const STATUS = {
  cancelled: "Cancelled",
  declined: "Declined",
  expired: "Expired",
  new_request: "New request",
  done: "Done",
  awaiting_deposit: "Awaiting deposit",
  confirmed: "Confirmed",
};

/** derived.status → "Awaiting deposit", "Confirmed", "Done"… or the next step when past. */
export function statusLabel(b) {
  const key = b?.derived?.status?.key;
  if (!key) return "—";
  if (STATUS[key]) return STATUS[key];
  if (key === "collect_balance") return `Collect ${money(b.derived.balanceCents)} balance`;
  return NEXT_STEP[key] ?? key;
}

/** Short gallery label for the tracker and the row: "Editing · due Oct 16". */
export function galleryLabel(b) {
  const g = b?.derived?.galleryState;
  switch (g?.key) {
    case "none":
      return "Not created";
    case "editing":
      return g.dueOn ? `Editing · due ${formatDay(g.dueOn)}` : "Editing";
    case "editing_overdue":
      return "Editing · overdue";
    case "delivered":
      return g.daysLeft != null
        ? `Delivered · ${g.daysLeft} ${g.daysLeft === 1 ? "day" : "days"} left`
        : "Delivered";
    case "expired":
      return b.gallery?.expiresAt ? `Expired ${formatDate(b.gallery.expiresAt, "LLL d")}` : "Expired";
    default:
      return "—";
  }
}

/** Longer gallery line for the "After the session" checklist. */
export function galleryDetail(b) {
  const g = b?.derived?.galleryState;
  const gal = b?.gallery;
  if (g?.key === "none") return "Not created yet";
  if (g?.key === "delivered" && gal?.deliveredAt) {
    const exp = gal.expiresAt ? ` · expires ${formatDate(gal.expiresAt, "LLL d")}` : "";
    return `Delivered ${formatDate(gal.deliveredAt, "LLL d")}${exp}`;
  }
  if (g?.key === "expired" && gal?.expiresAt) {
    return `Gallery expired ${formatDate(gal.expiresAt, "LLL d")}`;
  }
  return galleryLabel(b);
}

/** Thank-you cell: "Sent Sep 20" / "Not yet". */
export const thanksLabel = (b, short = true) =>
  b?.thanksSentAt ? `Sent ${formatDate(b.thanksSentAt, "LLL d")}` : short ? "Not yet" : "Not sent";

/** Review cell: "Received ✓" / "Asked Sep 20" / "Not asked". */
export function reviewLabel(b, short = true) {
  if (b?.reviewStatus === "RECEIVED") return short ? "Received ✓" : "Received — thank you!";
  if (b?.reviewStatus === "REQUESTED") {
    const asked = b.reviewRequestedAt ? `Asked ${formatDate(b.reviewRequestedAt, "LLL d")}` : "Asked";
    return short ? asked : `${asked} · waiting`;
  }
  return short ? "Not asked" : "Not asked yet";
}

/** Balance cell: "$80 due" (alert) / "Paid · Zelle". */
export function balanceCell(b) {
  const d = b?.derived ?? {};
  if ((d.balanceCents ?? 0) > 0) return { text: `${money(d.balanceCents)} due`, tone: "alert" };
  return { text: withMethod("Paid", d.lastPaymentMethod), tone: "done" };
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

export const TABS = [
  { id: "requests", label: "Requests" },
  { id: "upcoming", label: "Upcoming" },
  { id: "followup", label: "Follow-up" },
  { id: "done", label: "Done" },
  { id: "expired", label: "Expired" },
  { id: "cancelled", label: "Cancelled" },
];

export const EMPTY_TEXT = {
  requests: "No new requests. You’re all caught up.",
  upcoming: "No upcoming sessions yet.",
  followup: "Every client is taken care of.",
  done: "Nothing archived yet.",
  expired: "No expired bookings.",
  cancelled: "Nothing cancelled.",
};

export const NO_MATCH_TEXT = "No bookings match your search.";
