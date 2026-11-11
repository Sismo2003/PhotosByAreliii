// "Send all as test" (docs/correos.md §6): every email in one language to one address, 5 seconds
// apart, with sample data — the way to review the whole catalog in a real inbox at once.
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import PropTypes from "prop-types";
import { useState } from "react";
import { toast } from "sonner";

import { sendAllTestsThunk, useEmailStore } from "slices";

import { ActionButton, ChoiceGroup } from "../../bookings/parts";
import { Field, inputClass } from "../../bookings/new/fields";
import { readTestAddress, rememberTestAddress } from "./testAddress";

export function TestAllDialog({ show, onClose, count }) {
  const busy = useEmailStore((s) => s.busy);
  const [to, setTo] = useState(readTestAddress);
  const [locale, setLocale] = useState("en");
  const [error, setError] = useState(null);

  const send = async () => {
    setError(null);
    const res = await sendAllTestsThunk(locale, to.trim());
    if (!res.ok) return setError(res.error?.message ?? "Could not send the tests");
    rememberTestAddress(to.trim());
    toast.success(`${res.data.count} test emails on their way to ${res.data.to}`);
    onClose();
  };

  return (
    <Transition appear show={show} as={Dialog} onClose={busy ? () => {} : onClose} className="fixed inset-0 z-100 flex items-center justify-center px-4 py-6">
      <TransitionChild as="div" enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0" className="absolute inset-0 bg-black/50" />
      <TransitionChild
        as={DialogPanel}
        enter="ease-out duration-200"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-150"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
        className="relative w-full max-w-md border border-line-strong bg-paper p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[1.5rem] leading-tight text-ink">Send all as test</h2>
            <p className="mt-1 text-small text-ink-muted">
              All {count} emails with sample data, one every 5 seconds. Subjects start with [TEST].
            </p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="-mt-2 -mr-2 flex size-11 items-center justify-center text-ink-muted hover:text-ink">
            <XMarkIcon className="size-6" />
          </button>
        </div>
        <form
          noValidate
          className="mt-6 space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <Field label="Send to" error={error ?? undefined}>
            {(p) => <input {...p} type="email" required value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />}
          </Field>
          <ChoiceGroup label="Language" options={[{ value: "en", label: "English" }, { value: "es", label: "Español" }]} value={locale} onChange={setLocale} />
          <div className="flex flex-wrap gap-3">
            <ActionButton solid type="submit" disabled={busy || !to.trim()}>
              {busy ? "Sending…" : `Send ${count} emails`}
            </ActionButton>
            <ActionButton onClick={onClose} disabled={busy}>
              Cancel
            </ActionButton>
          </div>
        </form>
      </TransitionChild>
    </Transition>
  );
}

TestAllDialog.propTypes = { show: PropTypes.bool, onClose: PropTypes.func.isRequired, count: PropTypes.number };
