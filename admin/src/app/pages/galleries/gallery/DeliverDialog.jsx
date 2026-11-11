// "Deliver gallery" (design: GalleryDeliver / GalleryDelivered). Marks the gallery delivered and the
// server emails "Your photos are ready" (docs/correos.md #17): link, password, PIN and — for a client
// who never signed in — a temporary password. Subject and note are optional: left empty, the
// template's text in the client's language is used. The second step shows the details again, to
// copy them for a text message.
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { deliverGalleryThunk, loadEmailSettingsThunk, useEmailStore } from "slices";
import { formatDate } from "utils/date";

import { ActionButton, AlertNote, KeyValueRows } from "../../bookings/parts";
import { Field, inputClass, TextArea } from "../../bookings/new/fields";
import { publicGalleryUrl } from "../helpers";

async function copy(text, what) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error("Could not copy");
  }
}

export function DeliverDialog({ gallery, show, onClose }) {
  const first = gallery.client?.firstName ?? gallery.client?.displayName ?? "";
  const [to, setTo] = useState(gallery.deliveredToEmail ?? gallery.client?.email ?? "");
  const [subject, setSubject] = useState(gallery.deliverySubject ?? "");
  const [message, setMessage] = useState(gallery.deliveryMessage ?? "");
  const sending = useEmailStore((s) => s.settings.data?.status?.state);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null); // the delivered gallery
  const resend = gallery.status === "DELIVERED";

  const submit = async () => {
    setBusy(true);
    setError(null);
    const res = await deliverGalleryThunk(gallery.id, { to: to.trim() || undefined, subject: subject.trim() || undefined, message: message.trim() || undefined });
    setBusy(false);
    if (res.ok) setSent(res.data);
    else setError(res.error?.message ?? "Could not deliver the gallery");
  };

  const link = publicGalleryUrl(gallery.slug);

  // Whether the email really goes out now (paused → it waits in the list until sent by hand).
  useEffect(() => {
    if (show) loadEmailSettingsThunk();
  }, [show]);
  const emailNote =
    sending === "on"
      ? null
      : sending === "paused"
        ? "Emails are paused, so this one will wait until you send it from Settings → Email. Copy the details below for now."
        : sending
          ? "Email isn’t connected yet (Settings → Email). Copy the details below and send them yourself."
          : null;

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
        className="bg-paper border-line-strong relative flex max-h-full w-full max-w-lg flex-col overflow-y-auto border p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[1.5rem] leading-tight text-ink">{sent ? "Gallery delivered" : resend ? "Send gallery again" : "Deliver gallery"}</h2>
            <p className="mt-1 text-small text-ink-muted">{gallery.title}</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="-mt-2 -mr-2 flex size-11 items-center justify-center text-ink-muted hover:text-ink">
            <XMarkIcon className="size-6" />
          </button>
        </div>

        {sent ? (
          <div className="mt-6 space-y-5">
            <KeyValueRows
              rows={[
                ["Link", link],
                sent.privacy === "PASSWORD" && ["Password", sent.accessPassword],
                sent.pinRequired && ["Download PIN", sent.downloadPin],
                ["Available until", formatDate(sent.expiresAt, "LLL d, yyyy")],
              ]}
            />
            {emailNote ? <AlertNote>{emailNote}</AlertNote> : <p className="text-small text-ink">Emailed to {sent.deliveredToEmail}.</p>}
            <div className="flex flex-wrap gap-3">
              <ActionButton solid onClick={() => copy(link, "Link")}>
                Copy link
              </ActionButton>
              {sent.pinRequired && sent.downloadPin && <ActionButton onClick={() => copy(sent.downloadPin, "PIN")}>Copy PIN</ActionButton>}
              <ActionButton onClick={onClose}>Done</ActionButton>
            </div>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="mt-6 space-y-5"
          >
            <Field label="To">{(p) => <input {...p} type="email" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />}</Field>
            <Field label="Subject" optional>
              {(p) => <input {...p} value={subject} placeholder={`Your photos are ready${first ? `, ${first}` : ""}!`} onChange={(e) => setSubject(e.target.value)} className={inputClass} />}
            </Field>
            <Field label="Personal note" optional hint="Shows under “Your photos are ready!”. Your signature is added for you.">
              {(p) => <TextArea {...p} rows={4} value={message} placeholder="I loved working with you — I hope you love the photos as much as I do." onChange={(e) => setMessage(e.target.value)} />}
            </Field>
            <p className="text-small text-ink-muted">
              Added for you: the gallery link{gallery.privacy === "PASSWORD" ? ", the password" : ""}
              {gallery.pinRequired && gallery.downloadMode !== "OFF" ? ", the download PIN" : ""}
              {gallery.privacy === "CLIENT_LOGIN" ? " and, if they’ve never signed in, a temporary password" : ""}.
            </p>
            {emailNote && <AlertNote>{emailNote}</AlertNote>}
            {error && (
              <p role="alert" className="text-small text-alert">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <ActionButton solid type="submit" disabled={busy}>
                {busy ? "Delivering…" : resend ? "Send again" : "Deliver gallery"}
              </ActionButton>
              <ActionButton disabled={busy} onClick={onClose}>
                Cancel
              </ActionButton>
            </div>
          </form>
        )}
      </TransitionChild>
    </Transition>
  );
}

DeliverDialog.propTypes = { gallery: PropTypes.object.isRequired, show: PropTypes.bool, onClose: PropTypes.func.isRequired };
