// Side column of the service page: Details (name and status, saved with one button) and Add-ons
// (which add-ons this service allows — each checkbox saves right away). Add-ons themselves are
// created and priced on the Add-ons view of the Services list.
import PropTypes from "prop-types";
import { useState } from "react";
import { toast } from "sonner";

import { setServiceExtrasThunk, updateServiceThunk, useServicesStore } from "slices";

import { Block } from "../../bookings/booking/layout";
import { Field, inputClass } from "../../bookings/new/fields";
import { ActionButton, AlertNote, ChoiceGroup } from "../../bookings/parts";
import { addsLabel, money, STATUS_OPTIONS } from "../labels";

export function DetailsBlock({ service }) {
  const busy = useServicesStore((s) => s.busy);
  const [name, setName] = useState(service.name);
  const [status, setStatus] = useState(service.status);
  const [error, setError] = useState(null);
  const changed = name.trim() !== service.name || status !== service.status;

  const save = async () => {
    if (!name.trim()) {
      setError("Give the service a name");
      return;
    }
    setError(null);
    const body = {};
    if (name.trim() !== service.name) body.name = name.trim();
    if (status !== service.status) body.status = status;
    const res = await updateServiceThunk(service.id, body);
    if (res.ok) toast.success("Service updated");
    else setError(res.error?.message ?? "Could not update the service");
  };

  return (
    <Block title="Details" boxed>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="space-y-4"
      >
        <Field label="Name">{(p) => <input {...p} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" className={inputClass} />}</Field>
        <div>
          <ChoiceGroup label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} disabled={busy} />
          <p className="mt-2 text-small text-ink-muted">{STATUS_OPTIONS.find((o) => o.value === status)?.hint}</p>
        </div>
        {error && <AlertNote>{error}</AlertNote>}
        <ActionButton solid type="submit" disabled={busy || !changed}>
          {busy ? "Saving…" : "Save"}
        </ActionButton>
      </form>
    </Block>
  );
}

export function ExtrasBlock({ service }) {
  const busy = useServicesStore((s) => s.busy);
  const [error, setError] = useState(null);
  const offered = service.extras.filter((e) => e.offered).map((e) => e.id);

  const toggle = async (id) => {
    setError(null);
    const next = offered.includes(id) ? offered.filter((x) => x !== id) : [...offered, id];
    const res = await setServiceExtrasThunk(service.id, next);
    if (!res.ok) setError(res.error?.message ?? "Could not save the add-ons");
  };

  return (
    <Block title="Add-ons" boxed>
      {service.extras.length === 0 ? (
        <p className="text-ink-muted">No add-ons yet. Create them in the Add-ons view of Services.</p>
      ) : (
        <ul className="divide-y divide-line">
          {service.extras.map((e) => (
            <li key={e.id}>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 py-2">
                <input
                  type="checkbox"
                  checked={e.offered}
                  disabled={busy}
                  onChange={() => toggle(e.id)}
                  className="size-4 shrink-0 rounded-none border-line-strong bg-transparent text-ink focus:ring-0 focus:ring-offset-0"
                />
                <span className="flex min-w-0 grow flex-col">
                  <span className={e.active ? "truncate text-ink" : "truncate text-ink-muted"}>{e.name}</span>
                  <span className="text-small text-ink-muted">
                    {[money(e.priceCents), e.minutes ? addsLabel(e.minutes) : null, e.active ? null : "Off"].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {error && <AlertNote className="mt-3">{error}</AlertNote>}
    </Block>
  );
}

DetailsBlock.propTypes = { service: PropTypes.object.isRequired };
ExtrasBlock.propTypes = { service: PropTypes.object.isRequired };
