// Settings → Email (docs/correos.md §3, §9.1). Written from Areli's questions, top to bottom:
//   1. "Are my emails going out?"      — one status line + the master switch + four numbers
//   2. "Connect my Hostinger mailbox"  — address + password; the server is pre-filled for Hostinger
//                                        and tucked under "Server settings"; Test connection answers
//                                        in plain words and offers the fix when a port is blocked
//   3. "How do clients see me?"        — sender name with a live inbox preview, where replies go
//   4. "Where do I hear about things?" — the address for new-request notices
//   5. Daily limit (Hostinger plans cap it)
// Nothing is saved until "Save"; the bar at the bottom appears only when something changed.
import { CheckCircleIcon, ChevronDownIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmModal } from "components/shared/ConfirmModal";
import { StatRow } from "components/shared/layout/StatRow";
import { Skeleton } from "components/ui";
import {
  loadEmailSettingsThunk,
  saveEmailSettingsThunk,
  setEmailSendingThunk,
  testEmailConnectionThunk,
  useEmailStore,
} from "slices";
import { formatDate, fromNow } from "utils/date";

import { ActionButton, AlertNote } from "../../bookings/parts";
import { Field, inputClass } from "../../bookings/new/fields";
import { Toggle } from "../../galleries/parts";
import { Group, StatusDot } from "./parts";

const fromSettings = (s, reviewUrl) => ({
  user: s.smtp.user ?? "",
  password: "",
  host: s.smtp.host,
  port: String(s.smtp.port),
  security: s.smtp.security,
  fromName: s.from.name ?? "",
  replyTo: s.replyTo ?? "",
  adminNotifyEmail: s.adminNotifyEmail ?? "",
  dailyLimit: String(s.dailyLimit),
  reviewUrl: reviewUrl ?? "",
});

const toBody = (v) => ({
  smtp: { host: v.host.trim(), port: Number(v.port), security: v.security, user: v.user.trim(), password: v.password },
  // Hostinger only sends as the mailbox that signs in, so the sender address is the mailbox.
  from: { name: v.fromName.trim(), address: v.user.trim() },
  replyTo: v.replyTo.trim(),
  adminNotifyEmail: v.adminNotifyEmail.trim(),
  dailyLimit: Number(v.dailyLimit),
  reviewUrl: v.reviewUrl.trim(),
});

export default function EmailSettingsPage() {
  const { data, loading, error } = useEmailStore((s) => s.settings);

  useEffect(() => {
    loadEmailSettingsThunk();
  }, []);

  if (!data && (loading || !error)) return <SettingsSkeleton />;
  if (!data) return <AlertNote>{error}</AlertNote>;
  // Re-mount the form when the saved settings change (after Save) so it starts clean.
  return <SettingsForm key={JSON.stringify([data.settings, data.reviewUrl])} data={data} />;
}

function SettingsForm({ data }) {
  const busy = useEmailStore((s) => s.busy);
  const saved = data.settings;
  const base = useMemo(() => (saved ? fromSettings(saved, data.reviewUrl) : null), [saved, data.reviewUrl]);
  const [v, setV] = useState(base);
  const [showServer, setShowServer] = useState(false);
  const [formError, setFormError] = useState(null);
  const set = (next) => setV((prev) => ({ ...prev, ...next }));

  if (!saved) {
    return (
      <AlertNote>
        The email settings file is invalid, so emails are paused. Contact Alexis.
        {data.fileError && <span className="mt-1 block text-ink-muted">{data.fileError}</span>}
      </AlertNote>
    );
  }

  const dirty = Object.keys(v).some((k) => v[k] !== base[k]);
  const hostinger = data.hostinger.smtp;
  const isHostinger = v.host === hostinger.host;

  const save = async () => {
    setFormError(null);
    if (!v.user.trim()) return setFormError("Enter your mailbox address.");
    if (!saved.smtp.passwordSet && !v.password) return setFormError("Enter the mailbox password.");
    const res = await saveEmailSettingsThunk(toBody(v));
    if (res.ok) toast.success("Email settings saved");
    else setFormError(res.error?.message ?? "Could not save");
  };

  return (
    <div className="max-w-3xl pb-28">
      <SendingStatus data={data} />

      <div className="mt-10 divide-y divide-line">
        <Group
          title="Your mailbox"
          hint="The Hostinger email your clients get messages from and reply to. You’ll find it in hPanel → Emails."
        >
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            <Field label="Email address">
              {(p) => (
                <input {...p} type="email" autoComplete="off" placeholder="hello@example.com" value={v.user} onChange={(e) => set({ user: e.target.value })} className={inputClass} />
              )}
            </Field>
            <Field label="Password" hint={saved.smtp.passwordSet && !v.password ? "Saved. Type a new one to replace it." : "The one you chose for this mailbox in Hostinger."}>
              {(p) => (
                <input
                  {...p}
                  type="password"
                  autoComplete="new-password"
                  placeholder={saved.smtp.passwordSet ? "••••••••••" : ""}
                  value={v.password}
                  onChange={(e) => set({ password: e.target.value })}
                  className={inputClass}
                />
              )}
            </Field>
          </div>

          <ConnectionTest v={v} saved={saved} dirty={dirty} onUse={(alt) => set({ port: String(alt.port), security: alt.security })} />

          <div>
            <button
              type="button"
              aria-expanded={showServer}
              onClick={() => setShowServer((x) => !x)}
              className="inline-flex min-h-11 items-center gap-1.5 text-small text-ink-muted transition-colors hover:text-ink"
            >
              Server settings
              <span className="text-ink-muted">· {isHostinger ? "Hostinger" : v.host}</span>
              <ChevronDownIcon className={clsx("size-3.5 transition-transform", showServer && "rotate-180")} />
            </button>
            {showServer && (
              <div className="mt-3 grid gap-x-8 gap-y-6 border-l border-line pl-5 sm:grid-cols-3">
                <Field label="Server" className="sm:col-span-3">
                  {(p) => <input {...p} value={v.host} onChange={(e) => set({ host: e.target.value })} className={inputClass} />}
                </Field>
                <Field label="Port">
                  {(p) => <input {...p} inputMode="numeric" value={v.port} onChange={(e) => set({ port: e.target.value.replace(/\D/g, "") })} className={inputClass} />}
                </Field>
                <div className="sm:col-span-2">
                  <span className="field-label">Security</span>
                  <div role="group" aria-label="Security" className="mt-2 flex flex-wrap gap-2">
                    {[
                      { value: "starttls", label: "STARTTLS · 587", port: "587" },
                      { value: "ssl", label: "SSL · 465", port: "465" },
                    ].map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        aria-pressed={v.security === o.value}
                        onClick={() => set({ security: o.value, port: o.port })}
                        className={clsx(
                          "min-h-11 border px-4 text-small transition-colors",
                          v.security === o.value ? "border-ink bg-ink text-on-ink" : "border-line-strong text-ink hover:border-ink",
                        )}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                {!isHostinger && (
                  <button
                    type="button"
                    onClick={() => set({ host: hostinger.host, port: String(hostinger.port), security: hostinger.security })}
                    className="text-left text-small text-ink-muted underline underline-offset-4 hover:text-ink sm:col-span-3"
                  >
                    Use Hostinger’s settings
                  </button>
                )}
              </div>
            )}
          </div>
        </Group>

        <Group title="How clients see you">
          <Field label="Sender name">
            {(p) => <input {...p} maxLength={120} value={v.fromName} onChange={(e) => set({ fromName: e.target.value })} className={inputClass} />}
          </Field>
          <InboxPreview name={v.fromName || v.user || "Your name"} />
          <Field label="Replies go to" optional hint="Leave it empty to get replies in the same mailbox.">
            {(p) => <input {...p} type="email" placeholder={v.user || "Same mailbox"} value={v.replyTo} onChange={(e) => set({ replyTo: e.target.value })} className={inputClass} />}
          </Field>
        </Group>

        <Group title="Notices for you" hint="Where we tell you about new requests and anything that needs you.">
          <Field label="Your email">
            {(p) => <input {...p} type="email" placeholder="you@example.com" value={v.adminNotifyEmail} onChange={(e) => set({ adminNotifyEmail: e.target.value })} className={inputClass} />}
          </Field>
        </Group>

        <Group title="Reviews" hint="Where “Ask for a review” sends your clients — your Google Business review link, for example.">
          <Field label="Review link" optional>
            {(p) => <input {...p} type="url" placeholder="https://g.page/r/…/review" value={v.reviewUrl} onChange={(e) => set({ reviewUrl: e.target.value })} className={inputClass} />}
          </Field>
        </Group>

        <Group title="Daily limit" hint="Hostinger allows 1,000 emails a day on Business Starter. Anything over the limit waits for the next day.">
          <Field label="Emails per day" className="sm:w-48">
            {(p) => <input {...p} inputMode="numeric" value={v.dailyLimit} onChange={(e) => set({ dailyLimit: e.target.value.replace(/\D/g, "") })} className={inputClass} />}
          </Field>
        </Group>
      </div>

      <SaveBar
        show={dirty || Boolean(formError)}
        busy={busy}
        error={formError}
        onSave={save}
        onDiscard={() => {
          setV(base);
          setFormError(null);
        }}
      />
    </div>
  );
}

// ─── Status ─────────────────────────────────────────────────────────────

const STATE_COPY = {
  on: { title: "Emails are on", text: (s) => `Clients get their emails from ${s.smtp.user || "your mailbox"}.` },
  paused: {
    title: "Emails are paused",
    text: () => "Clients get nothing for now. What would have been sent waits in the list, so you can send it later. Account and support emails still go out.",
  },
  not_connected: { title: "Not connected yet", text: () => "Connect your Hostinger mailbox below, then turn emails on." },
  invalid: { title: "Something is wrong", text: () => "The settings file can’t be read. Contact Alexis." },
};

function SendingStatus({ data }) {
  const busy = useEmailStore((s) => s.busy);
  const [confirmPause, setConfirmPause] = useState(false);
  const { status, settings } = data;
  const copy = STATE_COPY[status.state] ?? STATE_COPY.paused;
  const canEnable = status.state !== "not_connected";

  const setSending = async (enabled) => {
    const res = await setEmailSendingThunk(enabled);
    if (!res.ok) toast.error(res.error?.message ?? "Could not change it");
    else toast.success(enabled ? "Emails are on" : "Emails are paused");
  };

  return (
    <section aria-live="polite">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="flex items-center gap-3 text-[1.75rem] leading-tight text-ink">
            <StatusDot state={status.state} className="size-3" />
            {copy.title}
          </p>
          <p className="mt-2 max-w-xl text-small text-ink-muted">{copy.text(settings)}</p>
          {status.delivery?.mode === "mailpit" && (
            <p className="mt-2 text-small text-ink-muted">
              Development: every email lands in{" "}
              <a href={status.delivery.url} target="_blank" rel="noreferrer" className="text-ink underline underline-offset-4">
                Mailpit
              </a>
              , never in a real inbox.
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 pt-1.5">
          <Toggle
            checked={settings.enabled}
            disabled={busy || (!settings.enabled && !canEnable)}
            label="Send emails"
            onChange={(next) => (next ? setSending(true) : setConfirmPause(true))}
          />
          <span className="text-tiny text-ink-muted">{settings.enabled ? "On" : "Off"}</span>
        </div>
      </div>

      <StatRow
        items={[
          { label: "Sent · 24 h", value: `${status.sent24h} / ${status.dailyLimit ?? "—"}` },
          { label: "Waiting", value: status.pending },
          { label: "Failed · 7 days", value: <span className={clsx(status.failed > 0 && "text-alert")}>{status.failed}</span> },
          { label: "Paused · 7 days", value: status.skipped },
        ]}
      />
      {status.lastSent && (
        <p className="mt-3 text-small text-ink-muted">
          Last email {fromNow(status.lastSent.sentAt)}: “{status.lastSent.subject}” to {status.lastSent.toEmail}.
        </p>
      )}

      <ConfirmModal
        show={confirmPause}
        onClose={() => setConfirmPause(false)}
        onOk={async () => {
          setConfirmPause(false);
          await setSending(false);
        }}
        state="pending"
        messages={{
          pending: {
            title: "Pause emails?",
            description: "Clients won’t get confirmations, reminders or their gallery. You can send what was paused later, one by one.",
            actionText: "Pause",
          },
        }}
      />
    </section>
  );
}

// ─── Test connection ───────────────────────────────────────────────────

function ConnectionTest({ v, saved, dirty, onUse }) {
  const [result, setResult] = useState(null); // { ok, message, suggestion }
  const [testing, setTesting] = useState(false);
  const last = saved.lastTest;
  const canTest = v.user.trim() && (v.password || saved.smtp.passwordSet);

  const run = async () => {
    setTesting(true);
    setResult(null);
    // Unsaved values are tested as typed; otherwise the saved server (and its result is remembered).
    const res = await testEmailConnectionThunk(
      dirty || v.password ? { host: v.host.trim(), port: Number(v.port), security: v.security, user: v.user.trim(), password: v.password } : undefined,
    );
    setTesting(false);
    setResult(res.ok ? res.data : { ok: false, message: res.error?.message ?? "Could not test the connection" });
  };

  const shown = result ?? (last && !dirty ? { ...last, remembered: true } : null);

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <ActionButton disabled={!canTest || testing} onClick={run}>
        {testing ? "Testing…" : "Test connection"}
      </ActionButton>
      {shown && (
        <p role="status" className={clsx("flex items-start gap-2 text-small", shown.ok ? "text-success" : "text-alert")}>
          {shown.ok ? <CheckCircleIcon className="size-5 shrink-0" /> : <ExclamationCircleIcon className="size-5 shrink-0" />}
          <span>
            {shown.message}
            {shown.remembered && shown.at && <span className="text-ink-muted"> · checked {formatDate(shown.at, "LLL d, h:mm a")}</span>}
          </span>
        </p>
      )}
      {result?.suggestion && (
        <ActionButton
          solid
          onClick={() => {
            onUse(result.suggestion);
            setResult({ ok: true, message: `Switched to port ${result.suggestion.port}. Save to keep it.` });
          }}
        >
          Use port {result.suggestion.port}
        </ActionButton>
      )}
    </div>
  );
}

// ─── Inbox preview ─────────────────────────────────────────────────────

function InboxPreview({ name }) {
  return (
    <div aria-hidden="true" className="max-w-md border border-line bg-paper-alt/60 px-4 py-3">
      <p className="caps text-ink-muted">In your client’s inbox</p>
      <div className="mt-3 flex gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-on-ink">{name.trim().charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate font-medium text-ink">{name}</p>
            <span className="shrink-0 text-tiny text-ink-muted">9:41 AM</span>
          </div>
          <p className="truncate text-small text-ink">You’re booked, Emily!</p>
          <p className="truncate text-small text-ink-muted">Thursday, October 30 · 5:15 PM Arizona time</p>
        </div>
      </div>
    </div>
  );
}

// ─── Save bar ──────────────────────────────────────────────────────────

/** Floating island at the bottom while there are unsaved changes (like the pagination island). */
export function SaveBar({ show, busy, error, onSave, onDiscard, saveLabel = "Save" }) {
  return (
    <div
      className={clsx(
        "fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 transition-all duration-200 motion-reduce:transition-none",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <div role="region" aria-label="Unsaved changes" className="flex max-w-full flex-wrap items-center gap-3 border border-line-strong bg-paper px-4 py-2 shadow-soft dark:shadow-none">
        <p className={clsx("text-small", error ? "text-alert" : "text-ink-muted")}>{error ?? "Unsaved changes"}</p>
        <ActionButton className="min-h-9" disabled={busy} onClick={onDiscard}>
          Discard
        </ActionButton>
        <ActionButton solid className="min-h-9" disabled={busy} onClick={onSave}>
          {busy ? "Saving…" : saveLabel}
        </ActionButton>
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div aria-busy="true" className="max-w-3xl space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-8 w-64 rounded" />
        <Skeleton className="h-4 w-96 max-w-full rounded" />
      </div>
      <Skeleton className="h-24 w-full rounded" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="h-3 w-32 rounded" />
          <div className="grid gap-6 sm:grid-cols-2">
            <Skeleton className="h-11 w-full rounded" />
            <Skeleton className="h-11 w-full rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

SettingsForm.propTypes = { data: PropTypes.object.isRequired };
SendingStatus.propTypes = { data: PropTypes.object.isRequired };
ConnectionTest.propTypes = { v: PropTypes.object, saved: PropTypes.object, dirty: PropTypes.bool, onUse: PropTypes.func };
InboxPreview.propTypes = { name: PropTypes.string };
SaveBar.propTypes = {
  show: PropTypes.bool,
  busy: PropTypes.bool,
  error: PropTypes.string,
  onSave: PropTypes.func,
  onDiscard: PropTypes.func,
  saveLabel: PropTypes.string,
};
