// "Rebook reminder" of the client page. One open reminder per client: choosing another replaces
// it, "No reminder" clears it. "When baby arrives" has no default date, so it asks for one.
import PropTypes from "prop-types";
import { useState } from "react";
import { toast } from "sonner";

import { setClientReminderThunk } from "slices";
import { formatDay, nowInStudio } from "utils/date";

import { REBOOK_OPTIONS, rebookLabel } from "../../bookings/labels";
import { ActionButton } from "../../bookings/parts";
import { Block } from "../../bookings/booking/layout";

const fieldClass =
  "mt-2 h-11 w-full border-0 border-b border-line-strong bg-transparent px-0 text-body text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none focus:ring-0 disabled:text-ink-muted";

export function ReminderBlock({ clientId, reminder }) {
  const [pending, setPending] = useState(null); // an option waiting for its date
  const [dueOn, setDueOn] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async (body, success) => {
    setBusy(true);
    const res = await setClientReminderThunk(clientId, body);
    setBusy(false);
    if (res.ok) toast.success(success);
    else toast.error(res.error?.message ?? "Could not save the reminder");
    return res.ok;
  };

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

  return (
    <Block title="Rebook reminder" boxed>
      <p className="text-body text-ink">
        {reminder
          ? `${reminder.label || rebookLabel(reminder.kind) || "Reminder"} · ${formatDay(reminder.dueOn, "LLL d, yyyy")}`
          : <span className="text-ink-muted">No reminder set.</span>}
      </p>
      <label htmlFor="client-rebook" className="field-label mt-3 block">
        {reminder ? "Change reminder" : "Remind me to reach out"}
      </label>
      <select
        id="client-rebook"
        value={pending?.value ?? ""}
        disabled={busy}
        onChange={(e) => onSelect(e.target.value)}
        className={fieldClass}
      >
        <option value="">Choose when…</option>
        {REBOOK_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        {reminder && <option value="none">No reminder</option>}
      </select>

      {pending?.needsDate && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end lg:flex-col lg:items-stretch">
          <div className="grow">
            <label htmlFor="client-rebook-due" className="field-label">
              Due date
            </label>
            <input
              id="client-rebook-due"
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
              if (await save({ kind: pending.value, dueOn, label: pending.label }, "Reminder set")) {
                setPending(null);
                setDueOn("");
              }
            }}
          >
            Save reminder
          </ActionButton>
        </div>
      )}
    </Block>
  );
}

ReminderBlock.propTypes = {
  clientId: PropTypes.number.isRequired,
  reminder: PropTypes.shape({ kind: PropTypes.string, label: PropTypes.string, dueOn: PropTypes.string }),
};
