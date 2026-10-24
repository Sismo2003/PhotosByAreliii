// 1 · Client. Search an existing client, or type a new one. If the email or phone already
// belongs to a client, that client is loaded: everything but email and phone can be edited here
// (those change from the client's own page — docs/nuevo-booking-admin.md §4).
import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import * as yup from "yup";

import { lookupClientForBooking, searchClientsForBooking } from "services/bookings";
import { formatPhone, formatPhoneInput, isValidPhone } from "utils/phone";

import { ActionButton, AlertNote, ChoiceGroup } from "../parts";
import { fromClient } from "./clientDraft";
import { Field, FormSection, TextArea, inputClass } from "./fields";
import { HEARD_FROM } from "./options";

const emailOk = (v) => yup.string().email().isValidSync(v);


export function ClientSection({ v, set, errors }) {
  const existing = v.clientMode === "existing" && v.client;
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [conflict, setConflict] = useState(null);
  const [phoneNote, setPhoneNote] = useState(null); // phone already registered with another email

  // Search box
  useEffect(() => {
    if (existing || q.trim().length < 2) return undefined;
    let stale = false; // a slower, older search must not overwrite the newer results
    const t = setTimeout(async () => {
      try {
        const { data } = await searchClientsForBooking(q.trim());
        if (!stale) setResults(data.data ?? []);
      } catch {
        if (!stale) setResults([]);
      }
    }, 300);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [q, existing]);

  // Typing a new client's email/phone: is it someone we already have?
  useEffect(() => {
    if (existing) return undefined;
    const email = emailOk(v.email) ? v.email.trim() : "";
    // A half-typed email must not be replaced by the client that owns the phone.
    const phone = v.phone && isValidPhone(v.phone) && (email || !v.email.trim()) ? v.phone : "";
    if (!email && !phone) {
      setConflict(null);
      setPhoneNote(null);
      return undefined;
    }
    let stale = false;
    const t = setTimeout(async () => {
      try {
        const { data } = await lookupClientForBooking({ email, phone });
        if (stale) return;
        const hit = data.data;
        setConflict(hit.conflict);
        setPhoneNote(hit.message);
        if (hit.client) set({ ...fromClient(hit.client), foundBy: hit.matchedBy === "PHONE" ? "phone" : "email" });
      } catch {
        /* the server checks again when the booking is created */
      }
    }, 500);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [v.email, v.phone, existing, set]);

  const setName = (key) => (e) => {
    const next = { [key]: e.target.value };
    if (!v.displayNameTouched) {
      const first = key === "firstName" ? e.target.value : v.firstName;
      const last = key === "lastName" ? e.target.value : v.lastName;
      next.displayName = [first, last].filter(Boolean).join(" ").trim();
    }
    set(next);
  };

  const startOver = () => {
    set({ clientMode: "new", client: null, foundBy: "", email: "", phone: "", displayNameTouched: false });
    setPhoneNote(null);
    setConflict(null);
    setQ("");
    setResults([]);
  };

  return (
    <FormSection n={1} title="Client" hint="Find who this is for, or add them. Their email becomes their login." id="client">
      {!existing && (
        <div className="relative sm:col-span-2">
          <Field label="Find an existing client" hint="Name, email or phone" optional>
            {(p) => (
              <input
                {...p}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Start typing…"
                autoComplete="off"
                className={inputClass}
              />
            )}
          </Field>
          {results.length > 0 && q.trim().length >= 2 && (
            <ul className="absolute inset-x-0 z-20 mt-1 max-h-64 overflow-auto border border-line-strong bg-paper shadow-soft">
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      set({ ...fromClient(c), foundBy: "" });
                      setQ("");
                      setResults([]);
                    }}
                    className="flex min-h-11 w-full flex-col px-3 py-2 text-left hover:bg-paper-alt"
                  >
                    <span className="text-body text-ink">{c.displayName}</span>
                    <span className="text-small text-ink-muted">
                      {[c.email, c.phone && formatPhone(c.phone)].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {existing && (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-line p-4 sm:col-span-2">
          <p className="text-small text-ink">
            <span className="caps text-ink-muted">Existing client</span>
            <br />
            {v.foundBy
              ? `Found by ${v.foundBy}. Their details were loaded — edit anything except email and phone.`
              : "Edit anything except email and phone."}
          </p>
          <ActionButton onClick={startOver}>Not them · start over</ActionButton>
        </div>
      )}

      {conflict && (
        <AlertNote className="sm:col-span-2">
          That email belongs to {conflict.byEmail.displayName} and that phone to {conflict.byPhone.displayName}.
          Pick the right client or fix one of them.
        </AlertNote>
      )}

      {phoneNote && <AlertNote className="sm:col-span-2">{phoneNote}</AlertNote>}

      <Field label="First name" error={errors.firstName}>
        {(p) => <input {...p} value={v.firstName} onChange={setName("firstName")} autoComplete="off" className={inputClass} />}
      </Field>
      <Field label="Last name" optional>
        {(p) => <input {...p} value={v.lastName} onChange={setName("lastName")} autoComplete="off" className={inputClass} />}
      </Field>
      <Field label="Name on the booking" hint="How it appears in lists — “The Ortega family”" optional>
        {(p) => (
          <input
            {...p}
            value={v.displayName}
            onChange={(e) => set({ displayName: e.target.value, displayNameTouched: true })}
            className={inputClass}
          />
        )}
      </Field>
      <Field label="Instagram" optional>
        {(p) => (
          <input {...p} value={v.instagram} onChange={(e) => set({ instagram: e.target.value })} placeholder="@handle" className={inputClass} />
        )}
      </Field>

      <Field label="Email" error={errors.email} hint={existing ? "Change it from the client’s page." : undefined}>
        {(p) => (
          <input
            {...p}
            type="email"
            value={v.email}
            readOnly={Boolean(existing)}
            onChange={(e) => set({ email: e.target.value })}
            autoComplete="off"
            className={inputClass}
          />
        )}
      </Field>
      <Field label="Phone" error={errors.phone} hint={existing ? "Change it from the client’s page." : undefined}>
        {(p) => (
          <input
            {...p}
            type="tel"
            value={v.phone}
            readOnly={Boolean(existing)}
            onChange={(e) => set({ phone: formatPhoneInput(e.target.value, v.phone) })}
            onBlur={() => !existing && v.phone && isValidPhone(v.phone) && set({ phone: formatPhone(v.phone) })}
            placeholder="(480) 555-0123"
            autoComplete="off"
            className={inputClass}
          />
        )}
      </Field>

      <div className="sm:col-span-2">
        <ChoiceGroup
          label="How did they find us?"
          options={HEARD_FROM}
          value={v.heardFrom}
          onChange={(value) => set({ heardFrom: v.heardFrom === value ? "" : value })}
        />
      </div>
      <Field label="Private notes about the client" hint="Only you see this." optional className="sm:col-span-2">
        {(p) => <TextArea {...p} value={v.clientPrivateNotes} onChange={(e) => set({ clientPrivateNotes: e.target.value })} />}
      </Field>
    </FormSection>
  );
}

ClientSection.propTypes = { v: PropTypes.object, set: PropTypes.func, errors: PropTypes.object };
