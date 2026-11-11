// Small pieces shared by Settings → Email, the templates list and the template editor.
// Black/white design: hairlines, caps labels, square buttons (see bookings/parts.jsx).
import { LockClosedIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import PropTypes from "prop-types";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmModal } from "components/shared/ConfirmModal";
import { setTemplateEnabledThunk } from "slices";

import { Toggle } from "../../galleries/parts";

/** Titled block of a settings page: caps title over a hairline, optional one-line hint. */
export function Group({ title, hint, children, className }) {
  return (
    <section className={clsx("py-8 first:pt-0", className)}>
      <h2 className="caps border-b border-line pb-2 text-ink-muted">{title}</h2>
      {hint && <p className="mt-3 max-w-xl text-small text-ink-muted">{hint}</p>}
      <div className="mt-5 space-y-6">{children}</div>
    </section>
  );
}

const DOT = {
  on: "border-success bg-success",
  paused: "border-ink-muted bg-transparent",
  not_connected: "border-warning bg-warning",
  invalid: "border-alert bg-alert",
};

/** Round status light (filled = working). */
export function StatusDot({ state, className }) {
  return <span aria-hidden="true" className={clsx("inline-block size-2.5 shrink-0 rounded-full border", DOT[state] ?? DOT.paused, className)} />;
}

/**
 * On/off switch of one email. Locked emails show a lock with the reason; "warn" emails ask before
 * turning off (docs/correos.md §3.4). The change is saved at once (optimistic).
 */
export function TemplateSwitch({ entry, size = "md", onChanged }) {
  const [confirm, setConfirm] = useState(false);

  if (entry.switch === "locked") {
    return (
      <span title={entry.lockedReason} className="inline-flex items-center gap-1.5 text-small text-ink-muted">
        <LockClosedIcon className="size-4" aria-hidden="true" />
        <span className={clsx(size === "sm" && "sr-only")}>Always on</span>
        <span className="sr-only">{entry.lockedReason}</span>
      </span>
    );
  }

  const change = async (enabled) => {
    const res = await setTemplateEnabledThunk(entry.key, enabled);
    if (!res.ok) toast.error(res.error?.message ?? "Could not change the email");
    else {
      toast.success(enabled ? `“${entry.name}” is on` : `“${entry.name}” is off`);
      onChanged?.(enabled);
    }
  };

  return (
    // The switch sits inside clickable rows: keep its clicks to itself.
    <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} className="inline-flex" role="presentation">
      <Toggle
        checked={entry.enabled}
        label={`Send “${entry.name}”`}
        onChange={(next) => (!next && entry.switch === "warn" ? setConfirm(true) : change(next))}
      />
      <ConfirmModal
        show={confirm}
        onClose={() => setConfirm(false)}
        onOk={async () => {
          setConfirm(false);
          await change(false);
        }}
        state="pending"
        messages={{ pending: { title: `Turn off “${entry.name}”?`, description: entry.warning, actionText: "Turn off" } }}
      />
    </span>
  );
}

Group.propTypes = { title: PropTypes.string, hint: PropTypes.node, children: PropTypes.node, className: PropTypes.string };
StatusDot.propTypes = { state: PropTypes.string, className: PropTypes.string };
TemplateSwitch.propTypes = { entry: PropTypes.object.isRequired, size: PropTypes.string, onChanged: PropTypes.func };
