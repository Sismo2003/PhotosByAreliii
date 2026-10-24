// Add / edit an add-on ("Extra outfit change +$15", "Extra 30 minutes +$50"). `Adds time` is how
// much session time each unit adds: a booking lasts package + Σ(minutes × quantity), so the
// "every 30 mins added is +$50" rule from the price list lives here. The checkboxes pick which
// services can offer it. An add-on that was ever booked can't be deleted, only switched off.
import PropTypes from "prop-types";
import { useState } from "react";
import { toast } from "sonner";

import { createAddonThunk, deleteAddonThunk, setAddonServicesThunk, updateAddonThunk, useServicesStore } from "slices";

import { Field, inputClass } from "../bookings/new/fields";
import { ActionButton, AlertNote } from "../bookings/parts";
import { centsToInput, inputToCents } from "./labels";
import { Modal } from "./Modal";

const MINUTES = [0, 15, 30, 45, 60, 90, 120];
const minuteLabel = (m) => (m === 0 ? "Doesn't change the session length" : `${m} minutes`);

const fromAddon = (a) => ({
  name: a?.name ?? "",
  price: a ? centsToInput(a.priceCents) : "",
  minutes: a?.minutes ?? 0,
  active: a?.active ?? true,
  serviceIds: a?.serviceIds ?? [],
});

export function AddonDialog({ show, onClose, addon }) {
  const options = useServicesStore((s) => s.options);
  const [v, setV] = useState(() => fromAddon(addon));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (next) => setV((prev) => ({ ...prev, ...next }));
  const toggleService = (id) => set({ serviceIds: v.serviceIds.includes(id) ? v.serviceIds.filter((x) => x !== id) : [...v.serviceIds, id] });
  // Minutes that aren't in the list (set some other way) stay selectable.
  const minuteOptions = MINUTES.includes(v.minutes) ? MINUTES : [...MINUTES, v.minutes].sort((a, b) => a - b);

  const save = async () => {
    const found = {};
    if (!v.name.trim()) found.name = "Give it a name";
    const priceCents = inputToCents(v.price);
    if (priceCents == null) found.price = "Enter a price, like 15 or 12.50";
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    setError(null);
    let res;
    if (addon) {
      res = await updateAddonThunk(addon.id, { name: v.name.trim(), priceCents, minutes: v.minutes, active: v.active });
      const before = [...addon.serviceIds].sort().join();
      if (res.ok && [...v.serviceIds].sort().join() !== before) res = await setAddonServicesThunk(addon.id, v.serviceIds);
    } else {
      res = await createAddonThunk({ name: v.name.trim(), priceCents, minutes: v.minutes, active: v.active, serviceIds: v.serviceIds });
    }
    setBusy(false);
    if (res.ok) {
      toast.success(addon ? "Add-on updated" : "Add-on added");
      onClose();
    } else {
      setError(res.error?.message ?? "Could not save the add-on");
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    const res = await deleteAddonThunk(addon.id);
    setBusy(false);
    if (res.ok) {
      toast.success("Add-on deleted");
      onClose();
    } else {
      setConfirmDelete(false);
      setError(res.error?.message ?? "Could not delete the add-on");
    }
  };

  return (
    <Modal show={show} onClose={onClose} busy={busy} title={addon ? "Edit add-on" : "Add an add-on"} subtitle="Something a client can add to a session.">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="mt-5 space-y-5"
      >
        <Field label="Name" error={errors.name}>
          {(p) => <input {...p} value={v.name} onChange={(e) => set({ name: e.target.value })} autoComplete="off" className={inputClass} />}
        </Field>
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Field label="Price" error={errors.price} hint="Each one the client adds">
            {(p) => <input {...p} inputMode="decimal" value={v.price} onChange={(e) => set({ price: e.target.value })} placeholder="15" className={inputClass} />}
          </Field>
          <Field label="Adds session time" hint="Per unit — “every 30 mins added is +$50”">
            {(p) => (
              <select {...p} value={v.minutes} onChange={(e) => set({ minutes: Number(e.target.value) })} className={inputClass}>
                {minuteOptions.map((m) => (
                  <option key={m} value={m}>
                    {minuteLabel(m)}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>

        <fieldset>
          <legend className="field-label">Offered on</legend>
          {options.length === 0 ? (
            <p className="mt-2 text-small text-ink-muted">Add a service first.</p>
          ) : (
            <ul className="mt-1 grid sm:grid-cols-2">
              {options.map((o) => (
                <li key={o.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body text-ink">
                    <input
                      type="checkbox"
                      checked={v.serviceIds.includes(o.id)}
                      onChange={() => toggleService(o.id)}
                      className="size-4 shrink-0 rounded-none border-line-strong bg-transparent text-ink focus:ring-0 focus:ring-offset-0"
                    />
                    <span className="truncate">{o.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-body text-ink">
          <input
            type="checkbox"
            checked={v.active}
            onChange={(e) => set({ active: e.target.checked })}
            className="mt-1 size-4 shrink-0 rounded-none border-line-strong bg-transparent text-ink focus:ring-0 focus:ring-offset-0"
          />
          <span>
            On
            <span className="block text-small text-ink-muted">Clients can add it when they book. Off keeps it for past bookings.</span>
          </span>
        </label>

        {error && <AlertNote>{error}</AlertNote>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {addon ? (
            confirmDelete ? (
              <span className="flex items-center gap-2">
                <ActionButton danger onClick={remove} disabled={busy}>
                  Yes, delete
                </ActionButton>
                <ActionButton onClick={() => setConfirmDelete(false)} disabled={busy}>
                  Keep
                </ActionButton>
              </span>
            ) : (
              <ActionButton danger onClick={() => setConfirmDelete(true)} disabled={busy}>
                Delete
              </ActionButton>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <ActionButton onClick={onClose} disabled={busy}>
              Cancel
            </ActionButton>
            <ActionButton solid type="submit" disabled={busy}>
              {busy ? "Saving…" : addon ? "Save" : "Add add-on"}
            </ActionButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}

AddonDialog.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  addon: PropTypes.object,
};
