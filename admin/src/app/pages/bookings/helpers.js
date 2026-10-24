// Non-component helpers shared by the Bookings page (kept out of the .jsx files so React
// Fast Refresh keeps working — react-refresh/only-export-components).
import { formatDate, nowInStudio, toStudio } from "utils/date";

/** True when an API timestamp falls on today's studio date (America/Phoenix). */
export function isToday(value) {
  const dt = toStudio(value);
  return !!dt && dt.hasSame(nowInStudio(), "day");
}

/** Sort key for TanStack columns: millis of an API timestamp (0 when missing). */
export const toMillis = (value) => toStudio(value)?.toMillis() ?? 0;

/** Date block of a row: { day: "10", mon: "OCT", time: "5:00 PM", when: "Sat, Oct 10 · 5:00 PM" }. */
export function dateParts(startsAt) {
  return {
    day: formatDate(startsAt, "dd"),
    mon: formatDate(startsAt, "LLL").toUpperCase(),
    time: formatDate(startsAt, "h:mm a"),
    when: formatDate(startsAt, "ccc, LLL d · h:mm a"),
  };
}

const ACTIVE = ["AWAITING_DEPOSIT", "CONFIRMED"];

/**
 * Which panel a booking gets — same rules as the design's `det` object
 * (isAwaiting / isLate / isConfirmed / isPast / canArchive), driven by `derived`.
 */
export function bookingFlags(b) {
  const d = b?.derived ?? {};
  const live = ACTIVE.includes(b?.status);
  const past = !!d.isPast;
  const tab = d.tab;
  return {
    isRequest: b?.status === "REQUEST",
    live,
    isAwaiting: live && !past && b.status === "AWAITING_DEPOSIT",
    isLate: live && !past && b.status === "AWAITING_DEPOSIT" && !!d.depositOverdue,
    isConfirmed: live && !past && b.status === "CONFIRMED",
    canChange: live && !past,
    isFollow: live && past && tab !== "done",
    isDone: tab === "done",
    isExpired: b?.status === "EXPIRED",
    isCancelled: b?.status === "CANCELLED" || b?.status === "DECLINED",
    canArchive: !!d.canArchive,
    isFutureSession: (toStudio(b?.startsAt)?.toMillis() ?? 0) > nowInStudio().toMillis(),
  };
}

/** What's still missing before "Archive — all done" can be used (canArchive rules). */
export function archiveBlockers(b) {
  const d = b?.derived ?? {};
  const missing = [];
  if ((d.balanceCents ?? 0) > 0) missing.push("collect the balance");
  if (b?.gallery?.status !== "DELIVERED") missing.push("deliver the gallery");
  return missing;
}

/** Route of the booking page — one page for every stage (see booking/index.jsx). */
export const bookingPath = (id) => `/bookings/${id}`;
