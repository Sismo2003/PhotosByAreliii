// What the client will see, with sample data, rendered by the server exactly like a real email.
// The HTML goes into a sandboxed iframe (no scripts, no same-origin). Desktop / Phone width.
import { ComputerDesktopIcon, DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import PropTypes from "prop-types";
import { useState } from "react";

import { Skeleton } from "components/ui";

const WIDTHS = { desktop: "100%", phone: "390px" };

export function PreviewPane({ preview, loading }) {
  const [device, setDevice] = useState("desktop");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <p className="caps text-ink-muted">Preview · sample client</p>
        <div role="group" aria-label="Preview size" className="flex border border-line">
          {[
            { id: "desktop", label: "Desktop", Icon: ComputerDesktopIcon },
            { id: "phone", label: "Phone", Icon: DevicePhoneMobileIcon },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={device === id}
              title={label}
              onClick={() => setDevice(id)}
              className={clsx("flex h-8 w-10 items-center justify-center transition-colors", device === id ? "bg-ink text-on-ink" : "text-ink-muted hover:text-ink")}
            >
              <Icon className="size-4" aria-hidden="true" />
              <span className="sr-only">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* The inbox line: what the client reads before opening it. */}
      <div className="mt-3 border border-line px-4 py-3">
        {preview ? (
          <>
            <p className="truncate font-medium text-ink">{preview.subject || <span className="text-ink-muted">No subject</span>}</p>
            <p className="truncate text-small text-ink-muted">{preview.preheader || "No preview text"}</p>
          </>
        ) : (
          <>
            <Skeleton className="h-4 w-2/3 rounded" />
            <Skeleton className="mt-2 h-3 w-1/2 rounded" />
          </>
        )}
      </div>

      <div className={clsx("relative mt-3 flex min-h-[32rem] flex-1 justify-center overflow-hidden border border-line bg-paper-alt", loading && preview && "opacity-80")}>
        {preview?.html ? (
          <iframe
            title="Email preview"
            sandbox=""
            srcDoc={preview.html}
            style={{ width: WIDTHS[device] }}
            className={clsx("h-full min-h-[32rem] bg-white transition-[width] duration-200", device === "phone" && "border-x border-line")}
          />
        ) : (
          <Skeleton aria-hidden className="absolute inset-0 opacity-50" />
        )}
      </div>
    </div>
  );
}

PreviewPane.propTypes = { preview: PropTypes.object, loading: PropTypes.bool };
