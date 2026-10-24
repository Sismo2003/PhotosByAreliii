// Pure logic of the unified booking page (/bookings/:id): which step of the client's journey a
// booking is in, and what the "Next step" card says/offers. No React here.
// Everything is derived from the API's `derived.*` (docs/api-bookings.md §2) + bookingFlags().
import { formatDate, fromNow } from "utils/date";

import { cancelReasonLabel, money } from "../labels";

/** The journey shown in the progress bar. Order matters. */
export const STEPS = [
  { id: "request", label: "Request" },
  { id: "deposit", label: "Deposit" },
  { id: "confirmed", label: "Confirmed" },
  { id: "session", label: "Session" },
  { id: "followup", label: "Follow-up" },
  { id: "done", label: "Done" },
];

/**
 * Where a booking sits on the journey.
 * → { current: 0..5, complete: boolean (Done), alert: boolean, terminal: null | "cancelled" | "declined" | "expired" }
 */
export function stageOf(b, f) {
  const d = b?.derived ?? {};
  const nextKey = d.nextStep?.key;
  const alert = Boolean(f.isLate) || d.nextStep?.tone === "alert";

  if (f.isCancelled) {
    return { current: -1, complete: false, alert: false, terminal: b.status === "DECLINED" ? "declined" : "cancelled" };
  }
  if (f.isExpired) return { current: -1, complete: false, alert: false, terminal: "expired" };
  if (f.isRequest) return { current: 0, complete: false, alert, terminal: null };
  if (f.isAwaiting) return { current: 1, complete: false, alert, terminal: null };
  if (f.isConfirmed) return { current: 2, complete: false, alert, terminal: null };
  if (f.isDone) return { current: 5, complete: true, alert: false, terminal: null };
  // Past, not archived: Session until the balance is collected, then Follow-up.
  return { current: nextKey === "collect_balance" ? 3 : 4, complete: false, alert, terminal: null };
}

/**
 * What the Next step card shows.
 * → { key, tone, title, detail, primary: {id, label} | null, secondary: {id, label} | null }
 * Action ids are handled by NextStepCard: confirm · deposit · balance · reschedule · expire ·
 * archive · unarchive · reopen · review_received · galleries · rebook · thanks · review_request.
 */
export function describeNext(b, f) {
  const d = b?.derived ?? {};
  const balance = d.balanceCents ?? 0;
  const when = b?.startsAt ? `${formatDate(b.startsAt, "cccc, LLL d · h:mm a")} (${fromNow(b.startsAt)})` : "";

  if (f.isRequest) {
    return {
      key: "request",
      tone: "new",
      title: "Reply to this request",
      detail: `${when}. Confirming accepts the session and gives the client 48 h to pay the deposit.`,
      primary: { id: "confirm", label: "Confirm booking" },
      secondary: null, // Decline lives in the ⋯ menu (destructive).
    };
  }

  if (f.isLate) {
    return {
      key: "deposit_overdue",
      tone: "alert",
      title: "The deposit is past due",
      detail: "Wait a little longer, or release the date so someone else can book it.",
      primary: { id: "deposit", label: "Record deposit" },
      secondary: { id: "expire", label: "Release the date" },
    };
  }

  if (f.isAwaiting) {
    const owed = Math.max(0, (b.depositCents ?? 0) - (d.paidCents ?? 0));
    return {
      key: "awaiting_deposit",
      tone: "pending",
      title: `Waiting for the ${money(owed)} deposit`,
      detail: b.depositDueAt
        ? `Due by ${formatDate(b.depositDueAt, "ccc, LLL d · h:mm a")}. Record it as soon as it arrives.`
        : "Record it as soon as it arrives.",
      primary: { id: "deposit", label: "Record deposit" },
      secondary: { id: "reschedule", label: "Reschedule" },
    };
  }

  if (f.isConfirmed) {
    if (balance > 0) {
      return {
        key: "collect_balance_early",
        tone: "pending",
        title: `Collect the ${money(balance)} balance`,
        detail: `The session is ${fromNow(b.startsAt)}. You can record it now or on the day.`,
        primary: { id: "balance", label: "Mark as paid" },
        secondary: { id: "reschedule", label: "Reschedule" },
      };
    }
    return {
      key: "all_set",
      tone: "done",
      title: "All set for the session",
      detail: `Paid in full. ${when}.`,
      primary: null,
      secondary: { id: "reschedule", label: "Reschedule" },
    };
  }

  if (f.isFollow) {
    switch (d.nextStep?.key) {
      case "collect_balance":
        return {
          key: "collect_balance",
          tone: "alert",
          title: `Collect the ${money(balance)} balance`,
          detail: "The session is over and there is still money due.",
          primary: { id: "balance", label: "Mark as paid" },
          secondary: null,
        };
      case "create_gallery":
        return {
          key: "create_gallery",
          tone: d.nextStep.tone ?? "pending",
          title: "Create the gallery",
          detail: "Upload the photos so the client can see them.",
          primary: { id: "galleries", label: "Create gallery" },
          secondary: null,
        };
      case "deliver_gallery":
      case "deliver_gallery_overdue":
        return {
          key: d.nextStep.key,
          tone: d.nextStep.tone ?? "pending",
          title: d.nextStep.key === "deliver_gallery_overdue" ? "Deliver the gallery — it's late" : "Deliver the gallery",
          detail: d.galleryState?.dueOn
            ? `Promised by ${formatDate(d.galleryState.dueOn, "LLL d")}.`
            : "Send the client their photos.",
          primary: { id: "galleries", label: "Open gallery" },
          secondary: null,
        };
      case "send_thanks":
        return {
          key: "send_thanks",
          tone: "pending",
          title: "Thank the client",
          detail: "A short thank-you after the session keeps clients coming back.",
          primary: { id: "thanks", label: "Send thank-you" },
          secondary: null,
        };
      case "ask_review":
        return {
          key: "ask_review",
          tone: "pending",
          title: "Ask for a review",
          detail: "Reviews are what bring new clients.",
          primary: { id: "review_request", label: "Ask for a review" },
          secondary: null,
        };
      case "waiting_review":
        return {
          key: "waiting_review",
          tone: "muted",
          title: "Waiting for their review",
          detail: "When it shows up, mark it as received.",
          primary: { id: "review_received", label: "Mark received" },
          secondary: null,
        };
      case "set_rebook":
        return {
          key: "set_rebook",
          tone: "pending",
          title: "Set a rebook reminder",
          detail: "Choose when to reach out about their next session.",
          primary: { id: "rebook", label: null }, // rendered inline (RebookReminder), no button
          secondary: null,
        };
      case "ready_to_archive":
        return {
          key: "ready_to_archive",
          tone: "done",
          title: "Everything is closed",
          detail: "Balance paid and gallery delivered. Archive this client's session.",
          primary: { id: "archive", label: "Archive — all done" },
          secondary: null,
        };
      default:
        return { key: "followup", tone: "pending", title: "Follow up", detail: "", primary: null, secondary: null };
    }
  }

  if (f.isDone) {
    return {
      key: "done",
      tone: "done",
      title: "Follow-up complete",
      detail: "This client is archived.",
      primary: null,
      secondary: { id: "unarchive", label: "Move back to follow-up" },
    };
  }

  if (f.isExpired) {
    return {
      key: "expired",
      tone: "muted",
      title: "This booking expired",
      detail: f.isFutureSession
        ? "The deposit never arrived, so the date was released. You can reopen it."
        : "The deposit never arrived and the session date has passed, so it can't be reopened.",
      primary: f.isFutureSession ? { id: "reopen", label: "Reopen booking" } : null,
      secondary: null,
    };
  }

  // Cancelled / declined
  const reason = cancelReasonLabel(b?.cancelReason);
  const deposit =
    b?.depositRefunded === true ? "Deposit refunded" : (d.paidCents ?? 0) > 0 ? "Deposit kept" : null;
  return {
    key: "closed",
    tone: "muted",
    title: b?.status === "DECLINED" ? "This request was declined" : "This booking was cancelled",
    detail:
      b?.status === "DECLINED" ? "" : ["The date is free again.", reason, deposit].filter(Boolean).join(" · "),
    primary: null,
    secondary: null,
  };
}
