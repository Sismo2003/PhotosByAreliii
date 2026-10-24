// "After the session" checklist (design: followRows + rebook reminder + archive).
// Email actions (thank-you, ask for review, remind) aren't built yet, so Thank-you and Review
// are read-only; Gallery is read-only and links to Galleries (docs/api-bookings.md §4–§5).
import clsx from "clsx";
import PropTypes from "prop-types";
import { useState } from "react";
import { Link } from "react-router";

import { archiveBookingThunk, reviewReceivedThunk, setRebookReminderThunk } from "slices";
import { formatDay, nowInStudio } from "utils/date";

import { INTEGRATIONS } from "../booking/integrations";
import { REBOOK_OPTIONS, galleryDetail, methodLabel, money, rebookLabel, reviewLabel, thanksLabel } from "../labels";
import { archiveBlockers } from "../helpers";
import { ActionButton } from "../parts";
import { useBookingAction } from "./useBookingAction";

const fieldClass =
  "mt-1 h-11 w-full border-0 border-b border-line-strong bg-transparent px-0 text-body text-ink focus:border-ink focus:outline-none focus:ring-0";

function Mark({ state }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "inline-flex size-[22px] shrink-0 items-center justify-center rounded-full text-tiny",
        state === "ok" && "bg-ink text-on-ink",
        state === "alert" && "bg-alert text-on-ink",
        state === "todo" && "border border-line-strong text-line-strong",
      )}
    >
      {state === "ok" ? "✓" : state === "alert" ? "!" : "○"}
    </span>
  );
}

function Row({ state, label, value, children }) {
  return (
    <li className="flex items-start gap-3 border-t border-line py-3 first:border-t-0">
      <Mark state={state} />
      <div className="flex min-w-0 grow flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <span className="block caps text-ink-muted">{label}</span>
          <span className="mt-0.5 block text-body text-ink">{value}</span>
        </div>
        {children && <div className="flex shrink-0 flex-wrap gap-2">{children}</div>}
      </div>
    </li>
  );
}

export function FollowUpChecklist({ booking, isFollow, onOpenForm }) {
  const d = booking.derived ?? {};
  const g = d.galleryState ?? {};
  const bal = d.balanceCents ?? 0;
  const { busy, run } = useBookingAction(booking.id);

  const galleryState =
    g.key === "delivered" && g.tone !== "alert" ? "ok" : g.tone === "alert" ? "alert" : "todo";

  return (
    <div>
      <h3 className="caps text-ink">After the session</h3>
      <ul className="mt-3">
        <Row
          state={bal > 0 ? "alert" : "ok"}
          label="Balance"
          value={
            bal > 0
              ? `${money(bal)} still due`
              : ["Paid in full", methodLabel(d.lastPaymentMethod)].filter(Boolean).join(" · ")
          }
        >
          {bal > 0 && isFollow && (
            <ActionButton solid disabled={busy} onClick={() => onOpenForm("balance")}>
              Mark as paid
            </ActionButton>
          )}
        </Row>

        <Row state={galleryState} label="Gallery" value={galleryDetail(booking)}>
          <Link
            to={INTEGRATIONS.galleries.href(booking)}
            className="inline-flex min-h-11 items-center border border-line-strong px-4 caps text-ink transition-colors hover:border-ink"
          >
            {booking.gallery?.id ? "Open gallery" : "Create gallery"}
          </Link>
        </Row>

        <Row state={booking.thanksSentAt ? "ok" : "todo"} label="Thank-you" value={thanksLabel(booking, false)} />

        <Row
          state={booking.reviewStatus === "RECEIVED" ? "ok" : "todo"}
          label="Review"
          value={reviewLabel(booking, false)}
        >
          {booking.reviewStatus === "REQUESTED" && (
            <ActionButton
              disabled={busy}
              onClick={() =>
                run(reviewReceivedThunk(booking.id), {
                  success: "Review marked received",
                  fallback: "Could not update the review",
                })
              }
            >
              Mark received
            </ActionButton>
          )}
        </Row>
      </ul>

      {isFollow && <RebookReminder booking={booking} busy={busy} run={run} />}
      {isFollow && <ArchiveRow booking={booking} busy={busy} run={run} />}
    </div>
  );
}

export function RebookReminder({ booking, busy, run }) {
  const open = booking.rebookReminders?.[0] ?? null;
  const [pending, setPending] = useState(null); // NEWBORN waiting for a date
  const [dueOn, setDueOn] = useState("");

  const save = (body, success) =>
    run(setRebookReminderThunk(booking.id, body), {
      success,
      fallback: "Could not save the reminder",
    });

  const onSelect = (value) => {
    if (!value) return;
    if (value === "none") {
      setPending(null);
      save({ kind: null }, "Rebook reminder cleared");
      return;
    }
    const opt = REBOOK_OPTIONS.find((o) => o.value === value);
    if (opt?.needsDate) {
      setPending(opt);
      return;
    }
    setPending(null);
    save({ kind: value, label: opt?.label }, "Reminder set");
  };

  const current = open
    ? `Rebook reminder: ${open.label || rebookLabel(open.kind) || "set"}${open.dueOn ? ` · ${formatDay(open.dueOn, "LLL d, yyyy")}` : ""}`
    : "No rebook reminder";

  return (
    <div className="mt-2 flex items-start gap-3 border-t border-line pt-3">
      <Mark state={open ? "ok" : "todo"} />
      <div className="min-w-0 grow">
        <label htmlFor="rebook-kind" className="block caps text-ink-muted">
          Rebook reminder
        </label>
        <span className="mt-0.5 block text-body text-ink">{current}</span>
        <select
          id="rebook-kind"
          value={pending?.value ?? ""}
          disabled={busy}
          onChange={(e) => onSelect(e.target.value)}
          className={fieldClass}
        >
          <option value="">Choose when to reach out…</option>
          {REBOOK_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
          {open && <option value="none">No reminder</option>}
        </select>

        {pending?.needsDate && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="grow">
              <label htmlFor="rebook-due" className="field-label">
                Due date
              </label>
              <input
                id="rebook-due"
                type="date"
                min={nowInStudio().toFormat("yyyy-LL-dd")}
                value={dueOn}
                onChange={(e) => setDueOn(e.target.value)}
                className={fieldClass}
              />
            </div>
            <ActionButton
              solid
              disabled={busy || !dueOn}
              onClick={async () => {
                const ok = await save({ kind: pending.value, dueOn, label: pending.label }, "Reminder set");
                if (ok) {
                  setPending(null);
                  setDueOn("");
                }
              }}
            >
              Save reminder
            </ActionButton>
          </div>
        )}
      </div>
    </div>
  );
}

function ArchiveRow({ booking, busy, run }) {
  if (booking.derived?.canArchive) {
    return (
      <div className="mt-4">
        <ActionButton
          solid
          disabled={busy}
          onClick={() =>
            run(archiveBookingThunk(booking.id), {
              success: "Moved to Done",
              fallback: "Could not archive the booking",
            })
          }
        >
          Archive — all done
        </ActionButton>
      </div>
    );
  }
  const missing = archiveBlockers(booking);
  return (
    <div className="mt-4 flex flex-col gap-2">
      <ActionButton solid disabled className="self-start">
        Archive — all done
      </ActionButton>
      <p className="text-small text-ink-muted">
        {missing.length
          ? `To archive, first ${missing.join(" and ")}.`
          : "Not ready to archive yet."}
      </p>
    </div>
  );
}

Mark.propTypes = { state: PropTypes.oneOf(["ok", "alert", "todo"]) };
Row.propTypes = {
  state: PropTypes.string,
  label: PropTypes.string,
  value: PropTypes.node,
  children: PropTypes.node,
};
FollowUpChecklist.propTypes = {
  booking: PropTypes.object.isRequired,
  isFollow: PropTypes.bool,
  onOpenForm: PropTypes.func.isRequired,
};
RebookReminder.propTypes = { booking: PropTypes.object, busy: PropTypes.bool, run: PropTypes.func };
ArchiveRow.propTypes = { booking: PropTypes.object, busy: PropTypes.bool, run: PropTypes.func };
