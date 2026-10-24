// Inline forms of the detail panel (design: forms deposit / balance / res / cancel / expire).
// Each one calls its thunk, shows the API error on failure and closes itself on success.
import PropTypes from "prop-types";
import { useState } from "react";

import { ConfirmModal } from "components/shared/ConfirmModal";

import {
  cancelBookingThunk,
  expireBookingThunk,
  recordPaymentThunk,
  rescheduleBookingThunk,
} from "slices";
import {
  formatDate,
  nowInStudio,
  studioInputToISO,
  toStudio,
} from "utils/date";

import {
  CANCEL_REASONS,
  DEPOSIT_CHOICES,
  PAYMENT_METHODS,
  centsToInput,
  inputToCents,
  money,
} from "../labels";
import { ActionButton, AlertNote, ChoiceGroup } from "../parts";
import { useBookingAction } from "./useBookingAction";

const inputClass =
  "mt-1 h-11 w-full border-0 border-b border-line-strong bg-transparent px-0 text-body text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none focus:ring-0";

function FormShell({
  title,
  children,
  onSubmit,
  submitLabel,
  onBack,
  backLabel = "Back",
  busy,
  danger,
}) {
  return (
    <form
      className="border-line space-y-4 border p-4 sm:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <h3 className="caps text-ink">{title}</h3>
      {children}
      <div className="flex flex-wrap gap-2 pt-1">
        <ActionButton
          type="submit"
          solid={!danger}
          danger={danger}
          disabled={busy}
        >
          {busy ? "Saving…" : submitLabel}
        </ActionButton>
        <ActionButton onClick={onBack} disabled={busy}>
          {backLabel}
        </ActionButton>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Record deposit / Mark as paid → POST /:id/payments
// ---------------------------------------------------------------------------
export function PaymentForm({ booking, kind, onClose }) {
  const d = booking.derived ?? {};
  const owed =
    d.balanceCents ?? Math.max(0, booking.totalCents - (d.paidCents ?? 0));
  const suggested =
    kind === "DEPOSIT"
      ? Math.max(0, booking.depositCents - (d.paidCents ?? 0))
      : owed;

  const [amount, setAmount] = useState(centsToInput(suggested));
  const [method, setMethod] = useState("ZELLE");
  const [error, setError] = useState(null);
  const { busy, run } = useBookingAction(booking.id);

  // More than what is owed (a tip, an extra person…) is never saved silently: a modal asks Areli
  // to confirm by hand, and only then the API gets `allowOverpay`.
  const [overpay, setOverpay] = useState(null); // { amountCents, overCents } while the modal is open

  const record = async (amountCents, allowOverpay = false) => {
    const ok = await run(
      recordPaymentThunk(booking.id, {
        kind,
        method,
        amountCents,
        ...(allowOverpay && { allowOverpay }),
      }),
      {
        success: `${money(amountCents)} recorded`,
        fallback: "Could not record the payment",
      },
    );
    if (ok) onClose();
  };

  const save = () => {
    const amountCents = inputToCents(amount);
    if (!amountCents) return setError("Enter an amount above $0.");
    setError(null);
    if (amountCents > owed)
      return setOverpay({ amountCents, overCents: amountCents - owed });
    return record(amountCents);
  };

  const confirmOverpay = async () => {
    const { amountCents } = overpay;
    setOverpay(null);
    await record(amountCents, true);
  };

  return (
    <>
      <FormShell
        title={kind === "DEPOSIT" ? "Record deposit" : "Mark as paid"}
        submitLabel="Save payment"
        onSubmit={save}
        onBack={onClose}
        busy={busy}
      >
        <div>
          <label htmlFor="pay-amount" className="field-label">
            Amount received ($)
          </label>
          <input
            id="pay-amount"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
          />
        </div>
        <ChoiceGroup
          label="Paid with"
          options={PAYMENT_METHODS}
          value={method}
          onChange={setMethod}
          disabled={busy}
        />
        {error && <AlertNote>{error}</AlertNote>}
        <p className="text-small text-ink-muted">
          Check your Zelle or Cash App before saving — payments are made outside
          the site.
        </p>
      </FormShell>
      <ConfirmModal
        show={Boolean(overpay)}
        onClose={() => setOverpay(null)}
        onOk={confirmOverpay}
        confirmLoading={busy}
        state="pending"
        messages={{
          pending: {
            title: "More than what’s owed",
            description: overpay
              ? `You entered ${money(overpay.amountCents)}, but only ${money(owed)} is still owed — ${money(overpay.overCents)} extra. If it’s a tip or an extra charge, save it. If it’s a typo, go back and fix the amount.`
              : "",
            actionText: overpay ? `Save ${money(overpay.amountCents)}` : "Save",
          },
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Reschedule → POST /:id/reschedule { startsAt }
// ---------------------------------------------------------------------------
export function RescheduleForm({ booking, onClose }) {
  const current = toStudio(booking.startsAt);
  const [date, setDate] = useState(current?.toFormat("yyyy-LL-dd") ?? "");
  const [time, setTime] = useState(current?.toFormat("HH:mm") ?? "17:00");
  const [error, setError] = useState(null);
  const { busy, run } = useBookingAction(booking.id);

  const done = booking.rescheduleCount ?? 0;

  const save = async () => {
    const startsAt = studioInputToISO(date, time);
    if (!startsAt) return setError("Pick a date and a time.");
    if (toStudio(startsAt) <= nowInStudio())
      return setError("The new date has to be in the future.");
    setError(null);
    const ok = await run(rescheduleBookingThunk(booking.id, startsAt), {
      success: `Rescheduled to ${formatDate(startsAt, "ccc, LLL d · h:mm a")}`,
      fallback: "Could not reschedule",
    });
    if (ok) onClose();
  };

  return (
    <FormShell
      title="Reschedule"
      submitLabel="Save new date"
      onSubmit={save}
      onBack={onClose}
      busy={busy}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="res-date" className="field-label">
            New date
          </label>
          <input
            id="res-date"
            type="date"
            min={nowInStudio().toFormat("yyyy-LL-dd")}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="res-time" className="field-label">
            Time (Arizona)
          </label>
          <input
            id="res-time"
            type="time"
            step={900}
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      {error && <AlertNote>{error}</AlertNote>}
      <p className="text-small text-ink-muted">
        The deposit moves to the new date.
        {done > 0 ? ` Already rescheduled ${done} ${done === 1 ? "time" : "times"}.` : ""}
      </p>
    </FormShell>
  );
}

// ---------------------------------------------------------------------------
// Cancel booking → POST /:id/cancel { reason, deposit }
// ---------------------------------------------------------------------------
export function CancelForm({ booking, onClose }) {
  const [reason, setReason] = useState(CANCEL_REASONS[0].value);
  const [deposit, setDeposit] = useState("keep");
  const { busy, run } = useBookingAction(booking.id);
  const paid = booking.derived?.paidCents ?? 0;

  const save = async () => {
    const ok = await run(
      cancelBookingThunk(booking.id, {
        reason,
        deposit: paid > 0 ? deposit : "keep",
      }),
      {
        success: "Booking cancelled",
        fallback: "Could not cancel the booking",
      },
    );
    if (ok) onClose();
  };

  return (
    <FormShell
      title="Cancel this booking?"
      submitLabel="Cancel booking"
      backLabel="Keep it"
      onSubmit={save}
      onBack={onClose}
      busy={busy}
      danger
    >
      <div>
        <label htmlFor="cancel-reason" className="field-label">
          Reason
        </label>
        <select
          id="cancel-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={inputClass}
        >
          {CANCEL_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      {paid > 0 ? (
        <ChoiceGroup
          label={`Deposit · ${money(paid)} paid`}
          options={DEPOSIT_CHOICES}
          value={deposit}
          onChange={setDeposit}
          disabled={busy}
        />
      ) : (
        <p className="text-small text-ink-muted">
          Nothing has been paid yet, so there’s nothing to refund.
        </p>
      )}
    </FormShell>
  );
}

// ---------------------------------------------------------------------------
// Mark as expired → POST /:id/expire
// ---------------------------------------------------------------------------
export function ExpireForm({ booking, onClose }) {
  const { busy, run } = useBookingAction(booking.id);
  const save = async () => {
    const ok = await run(expireBookingThunk(booking.id), {
      success: "Marked as expired — date released",
      fallback: "Could not mark as expired",
    });
    if (ok) onClose();
  };
  return (
    <FormShell
      title="Mark as expired?"
      submitLabel="Mark as expired"
      onSubmit={save}
      onBack={onClose}
      busy={busy}
      danger
    >
      <p className="text-small text-ink-muted">
        The deposit didn’t arrive on time. This releases the date so someone
        else can book it.
      </p>
    </FormShell>
  );
}

FormShell.propTypes = {
  title: PropTypes.string,
  children: PropTypes.node,
  onSubmit: PropTypes.func,
  submitLabel: PropTypes.string,
  onBack: PropTypes.func,
  backLabel: PropTypes.string,
  busy: PropTypes.bool,
  danger: PropTypes.bool,
};
PaymentForm.propTypes = {
  booking: PropTypes.object.isRequired,
  kind: PropTypes.oneOf(["DEPOSIT", "BALANCE"]).isRequired,
  onClose: PropTypes.func.isRequired,
};
RescheduleForm.propTypes = {
  booking: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};
CancelForm.propTypes = {
  booking: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};
ExpireForm.propTypes = {
  booking: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};
