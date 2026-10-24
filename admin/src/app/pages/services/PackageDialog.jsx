// Add / edit a package of a service (design: AdminServices → Packages). Price and length are
// what the booking freezes; outfits, people and sessions only describe it. "Most booked" is one
// per service. A package with bookings can't be deleted, only hidden.
import PropTypes from "prop-types";
import { useState } from "react";
import { toast } from "sonner";

import { createPackageThunk, deletePackageThunk, updatePackageThunk } from "slices";

import { CheckField, Field, inputClass, TextArea } from "../bookings/new/fields";
import { ActionButton, AlertNote, ChoiceGroup } from "../bookings/parts";
import { centsToInput, DURATIONS, durationLabel, inputToCents } from "./labels";
import { Modal } from "./Modal";

const fromPackage = (p) => ({
  name: p?.name ?? "",
  price: p ? centsToInput(p.priceCents) : "",
  durationMinutes: p?.durationMinutes ?? 120,
  outfits: p?.outfits != null ? String(p.outfits) : "",
  maxPeople: p?.maxPeople != null ? String(p.maxPeople) : "",
  sessionCount: String(p?.sessionCount ?? 1),
  customDescription: p?.customDescription ?? "",
  isFeatured: p?.isFeatured ?? false,
  hidden: p?.hidden ?? false,
});

const count = (value) => (value.trim() === "" ? null : Number(value));

export function PackageDialog({ show, onClose, serviceId, pkg }) {
  const [v, setV] = useState(() => fromPackage(pkg));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (next) => setV((prev) => ({ ...prev, ...next }));
  const durations = DURATIONS.includes(v.durationMinutes) ? DURATIONS : [...DURATIONS, v.durationMinutes].sort((a, b) => a - b);

  const save = async () => {
    const found = {};
    if (!v.name.trim()) found.name = "Give it a name";
    const priceCents = inputToCents(v.price);
    if (priceCents == null) found.price = "Enter a price, like 160 or 87.50";
    const outfits = count(v.outfits);
    if (outfits != null && (!Number.isInteger(outfits) || outfits < 0)) found.outfits = "Use a whole number, or leave it empty";
    const maxPeople = count(v.maxPeople);
    if (maxPeople != null && (!Number.isInteger(maxPeople) || maxPeople < 1)) found.maxPeople = "Use a whole number, or leave it empty";
    setErrors(found);
    if (Object.keys(found).length) return;

    const body = {
      name: v.name.trim(),
      priceCents,
      durationMinutes: v.durationMinutes,
      outfits,
      maxPeople,
      sessionCount: Number(v.sessionCount),
      customDescription: v.customDescription.trim() || null,
      isFeatured: v.isFeatured,
      hidden: v.hidden,
    };
    setBusy(true);
    setError(null);
    const res = pkg ? await updatePackageThunk(pkg.id, body) : await createPackageThunk(serviceId, body);
    setBusy(false);
    if (res.ok) {
      toast.success(pkg ? "Package updated" : "Package added");
      onClose();
    } else {
      setError(res.error?.message ?? "Could not save the package");
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    const res = await deletePackageThunk(pkg.id);
    setBusy(false);
    if (res.ok) {
      toast.success("Package deleted");
      onClose();
    } else {
      setConfirmDelete(false);
      setError(res.error?.message ?? "Could not delete the package");
    }
  };

  return (
    <Modal show={show} onClose={onClose} busy={busy} title={pkg ? "Edit package" : "Add a package"} subtitle="A price and a length a client can pick.">
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
          <Field label="Price" error={errors.price} hint="Starting price, before add-ons">
            {(p) => <input {...p} inputMode="decimal" value={v.price} onChange={(e) => set({ price: e.target.value })} placeholder="160" className={inputClass} />}
          </Field>
          <Field label="Length">
            {(p) => (
              <select {...p} value={v.durationMinutes} onChange={(e) => set({ durationMinutes: Number(e.target.value) })} className={inputClass}>
                {durations.map((m) => (
                  <option key={m} value={m}>
                    {durationLabel(m)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Outfits" optional error={errors.outfits}>
            {(p) => <input {...p} inputMode="numeric" value={v.outfits} onChange={(e) => set({ outfits: e.target.value })} className={inputClass} />}
          </Field>
          <Field label="Up to how many people" optional error={errors.maxPeople}>
            {(p) => <input {...p} inputMode="numeric" value={v.maxPeople} onChange={(e) => set({ maxPeople: e.target.value })} className={inputClass} />}
          </Field>
        </div>
        <ChoiceGroup
          label="Sessions"
          value={v.sessionCount}
          onChange={(sessionCount) => set({ sessionCount })}
          options={[
            { value: "1", label: "One session" },
            { value: "2", label: "Two sessions" },
          ]}
        />
        <Field label="Description" optional hint="Replaces the line made from length, outfits and people.">
          {(p) => <TextArea {...p} value={v.customDescription} maxLength={300} onChange={(e) => set({ customDescription: e.target.value })} />}
        </Field>
        <div>
          <CheckField checked={v.isFeatured} onChange={(isFeatured) => set({ isFeatured })}>
            Most booked <span className="text-small text-ink-muted">— one per service</span>
          </CheckField>
          <CheckField checked={v.hidden} onChange={(hidden) => set({ hidden })}>
            Hidden <span className="text-small text-ink-muted">— can’t be picked in new bookings</span>
          </CheckField>
        </div>

        {error && <AlertNote>{error}</AlertNote>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {pkg ? (
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
              {busy ? "Saving…" : pkg ? "Save" : "Add package"}
            </ActionButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}

PackageDialog.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  serviceId: PropTypes.number.isRequired,
  pkg: PropTypes.object,
};
