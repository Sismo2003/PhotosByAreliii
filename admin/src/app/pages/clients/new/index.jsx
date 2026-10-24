// Admin · Add client (/clients/new) — for people who reach Areli by Instagram, text or phone.
// Same fields as the client page's Edit details. A taken email or phone is a 409 that says who
// owns it, with a link to open that client (or Restore if they were deleted). The client's
// login is not part of this form: there is no client login yet (see client/index.jsx).
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

import { Page } from "components/shared/Page";
import { PageHeader } from "components/shared/layout/PageHeader";
import { createClientThunk, restoreClientThunk } from "slices";
import { todayLabel } from "utils/date";
import { formatPhone, formatPhoneInput, isValidPhone } from "utils/phone";

import { ActionButton, AlertNote, ChoiceGroup } from "../../bookings/parts";
import { Field, TextArea, inputClass } from "../../bookings/new/fields";
import { clientPath } from "../helpers";
import { HEARD_FROM } from "../labels";
import { validateClient } from "../schema";

const initial = {
  firstName: "",
  lastName: "",
  displayName: "",
  displayNameTouched: false,
  email: "",
  phone: "",
  instagram: "",
  heardFrom: "",
  privateNotes: "",
};

export default function NewClient() {
  const navigate = useNavigate();
  const location = useLocation();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState({});
  const [taken, setTaken] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (next) => setV((prev) => ({ ...prev, ...next }));

  // The list name follows first + last name until it is edited by hand.
  const setName = (key) => (e) => {
    const next = { [key]: e.target.value };
    if (!v.displayNameTouched) {
      const first = key === "firstName" ? e.target.value : v.firstName;
      const last = key === "lastName" ? e.target.value : v.lastName;
      next.displayName = [first, last].filter(Boolean).join(" ").trim();
    }
    set(next);
  };

  const goBack = () => (location.key !== "default" ? navigate(-1) : navigate("/clients", { replace: true }));

  const submit = async () => {
    const found = validateClient(v);
    setErrors(found);
    if (Object.keys(found).length) {
      toast.error("Check the highlighted fields");
      return;
    }
    setBusy(true);
    setTaken(null);
    const { displayNameTouched, ...fields } = v; // eslint-disable-line no-unused-vars
    const body = Object.fromEntries(Object.entries(fields).map(([k, val]) => [k, val.trim() || undefined]));
    const res = await createClientThunk(body);
    setBusy(false);
    if (res.ok) {
      toast.success(`${res.data.client.displayName} added`);
      navigate(clientPath(res.data.client.id), { replace: true, viewTransition: true });
    } else if (res.error?.status === 409 && res.error.details) {
      setTaken(res.error);
    } else {
      toast.error(res.error?.message ?? "Could not add the client");
    }
  };

  return (
    <Page title="Add client">
      <div className="page-vt px-(--margin-x) pb-32 lg:pb-12">
        <div className="flex min-h-14 items-center justify-between gap-3 pt-3">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            className="-ml-2 inline-flex min-h-11 items-center gap-2 px-2 caps text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeftIcon className="size-5" aria-hidden="true" />
            <span>Clients</span>
          </button>
        </div>

        <PageHeader eyebrow={todayLabel()} title="Add client" />
        <p className="mt-3 max-w-xl text-ink-muted">
          For people who reach you by Instagram, text or phone. You can book their session now or later.
        </p>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="mt-6 max-w-3xl"
        >
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            <Field label="First name" error={errors.firstName}>
              {(p) => <input {...p} value={v.firstName} onChange={setName("firstName")} autoComplete="off" className={inputClass} />}
            </Field>
            <Field label="Last name" optional>
              {(p) => <input {...p} value={v.lastName} onChange={setName("lastName")} autoComplete="off" className={inputClass} />}
            </Field>
            <Field label="Name in lists" error={errors.displayName} hint="How it appears everywhere — “The Ortega family”" className="sm:col-span-2">
              {(p) => (
                <input
                  {...p}
                  value={v.displayName}
                  onChange={(e) => set({ displayName: e.target.value, displayNameTouched: true })}
                  className={inputClass}
                />
              )}
            </Field>
            <Field label="Email" error={errors.email} hint="Also their gallery login.">
              {(p) => <input {...p} type="email" value={v.email} onChange={(e) => set({ email: e.target.value })} autoComplete="off" className={inputClass} />}
            </Field>
            <Field label="Phone" error={errors.phone} optional>
              {(p) => (
                <input
                  {...p}
                  type="tel"
                  value={v.phone}
                  onChange={(e) => set({ phone: formatPhoneInput(e.target.value, v.phone) })}
                  onBlur={() => v.phone && isValidPhone(v.phone) && set({ phone: formatPhone(v.phone) })}
                  placeholder="(480) 555-0123"
                  autoComplete="off"
                  className={inputClass}
                />
              )}
            </Field>
            <Field label="Instagram" optional>
              {(p) => <input {...p} value={v.instagram} onChange={(e) => set({ instagram: e.target.value })} placeholder="@handle" className={inputClass} />}
            </Field>
            <div className="sm:col-span-2">
              <ChoiceGroup
                label="Found me via"
                options={HEARD_FROM}
                value={v.heardFrom}
                onChange={(value) => set({ heardFrom: v.heardFrom === value ? "" : value })}
              />
            </div>
            <Field label="Private notes" hint="Only you see this." optional className="sm:col-span-2">
              {(p) => <TextArea {...p} value={v.privateNotes} onChange={(e) => set({ privateNotes: e.target.value })} />}
            </Field>
          </div>

          {taken && (
            <AlertNote className="mt-6">
              {taken.message}.{" "}
              {taken.details.deleted ? (
                <button
                  type="button"
                  className="underline underline-offset-2"
                  onClick={async () => {
                    const res = await restoreClientThunk(taken.details.clientId);
                    if (res.ok) {
                      toast.success(`${taken.details.name} restored`);
                      navigate(clientPath(taken.details.clientId), { replace: true });
                    } else toast.error(res.error?.message ?? "Could not restore the client");
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

          <div className="mt-8 flex flex-wrap gap-3">
            <ActionButton solid type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save client"}
            </ActionButton>
            <ActionButton disabled={busy} onClick={goBack}>
              Cancel
            </ActionButton>
          </div>
        </form>
      </div>
    </Page>
  );
}
