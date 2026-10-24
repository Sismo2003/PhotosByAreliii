// "Edit details" of the client page: the same fields as Add client, in the Contact block.
// Sends only what changed. A taken email/phone comes back as a 409 with who owns it, so the
// message can offer "Open that client" (or "Restore" when they were deleted).
import PropTypes from "prop-types";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { restoreClientThunk, updateClientThunk } from "slices";
import { formatPhone, formatPhoneInput } from "utils/phone";

import { ActionButton, AlertNote, ChoiceGroup } from "../../bookings/parts";
import { Field, inputClass } from "../../bookings/new/fields";
import { clientPath } from "../helpers";
import { HEARD_FROM } from "../labels";
import { validateClient } from "../schema";

const fromClient = (c) => ({
  firstName: c.firstName ?? "",
  lastName: c.lastName ?? "",
  displayName: c.displayName ?? "",
  email: c.email ?? "",
  phone: c.phone ? formatPhone(c.phone) : "",
  instagram: c.instagram ?? "",
  heardFrom: c.heardFrom ?? "",
});

export function EditDetails({ client, onClose }) {
  const [v, setV] = useState(() => fromClient(client));
  const [errors, setErrors] = useState({});
  const [taken, setTaken] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (next) => setV((prev) => ({ ...prev, ...next }));
  const emailChanged = v.email.trim().toLowerCase() !== client.email;

  const save = async () => {
    const found = validateClient(v);
    setErrors(found);
    if (Object.keys(found).length) return;
    // Only the fields that differ from what is stored.
    const before = fromClient(client);
    const body = {};
    for (const key of Object.keys(v)) {
      if (v[key].trim() !== before[key].trim()) body[key] = v[key].trim() || null;
    }
    if (Object.keys(body).length === 0) return onClose();
    setBusy(true);
    setTaken(null);
    const res = await updateClientThunk(client.id, body);
    setBusy(false);
    if (res.ok) {
      toast.success("Client updated");
      onClose();
    } else if (res.error?.status === 409 && res.error.details) {
      setTaken(res.error);
    } else {
      toast.error(res.error?.message ?? "Could not update the client");
    }
  };

  const input = (key, props) =>
    function Control(p) {
      return <input {...p} value={v[key]} onChange={(e) => set({ [key]: e.target.value })} className={inputClass} {...props} />;
    };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="divide-y divide-line [&>*]:py-5 [&>:first-child]:pt-0 [&>:last-child]:pb-0"
    >
      {/* Name */}
      <fieldset className="space-y-5">
        <legend className="caps mb-4 text-ink-muted">Name</legend>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <Field label="First name" error={errors.firstName}>
            {input("firstName", { autoComplete: "off" })}
          </Field>
          <Field label="Last name" optional>
            {input("lastName", { autoComplete: "off" })}
          </Field>
        </div>
        <Field label="Name in lists" error={errors.displayName} hint="“The Ortega family”, “Marco & Lucía”">
          {input("displayName")}
        </Field>
      </fieldset>

      {/* How to reach them */}
      <fieldset className="space-y-5">
        <legend className="caps mb-4 text-ink-muted">Contact</legend>
        <Field
          label="Email"
          error={errors.email}
          hint={emailChanged ? "Changing the email also changes the address they sign in with." : "Also their gallery login."}
        >
          {input("email", { type: "email", autoComplete: "off" })}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <Field label="Phone" error={errors.phone} optional>
            {(p) => (
              <input
                {...p}
                type="tel"
                value={v.phone}
                onChange={(e) => set({ phone: formatPhoneInput(e.target.value, v.phone) })}
                placeholder="(480) 555-0123"
                autoComplete="off"
                className={inputClass}
              />
            )}
          </Field>
          <Field label="Instagram" optional>
            {input("instagram", { placeholder: "@handle" })}
          </Field>
        </div>
      </fieldset>

      {/* Where they came from */}
      <div>
        <ChoiceGroup
          label="Found me via"
          options={HEARD_FROM}
          value={v.heardFrom}
          onChange={(value) => set({ heardFrom: v.heardFrom === value ? "" : value })}
          disabled={busy}
        />
      </div>

      {taken && (
        <AlertNote>
          {taken.message}.{" "}
          {taken.details.deleted ? (
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={async () => {
                const res = await restoreClientThunk(taken.details.clientId);
                if (res.ok) toast.success(`${taken.details.name} restored`);
                else toast.error(res.error?.message ?? "Could not restore the client");
              }}
            >
              Restore them
            </button>
          ) : (
            <Link to={clientPath(taken.details.clientId)} className="underline underline-offset-2">
              Open that client
            </Link>
          )}
        </AlertNote>
      )}

      <div className="flex flex-wrap gap-3">
        <ActionButton solid disabled={busy} type="submit">
          {busy ? "Saving…" : "Save changes"}
        </ActionButton>
        <ActionButton disabled={busy} onClick={onClose}>
          Cancel
        </ActionButton>
      </div>
    </form>
  );
}

EditDetails.propTypes = { client: PropTypes.object.isRequired, onClose: PropTypes.func.isRequired };
