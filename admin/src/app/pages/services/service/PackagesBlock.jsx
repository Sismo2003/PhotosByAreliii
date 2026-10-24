// "Packages" of the service page: every package, in the order New booking shows them. A row opens
// the package dialog; "Add package" and "Reorder" sit in the block's header. Hidden packages stay
// in the list (muted) so they can be switched back on.
import PropTypes from "prop-types";
import { useState } from "react";

import { reorderPackagesThunk } from "slices";

import { Block } from "../../bookings/booking/layout";
import { ActionButton } from "../../bookings/parts";
import { money, packageSummary, plural } from "../labels";
import { PackageDialog } from "../PackageDialog";
import { ReorderDialog } from "../ReorderDialog";

export function PackagesBlock({ service }) {
  const [dialog, setDialog] = useState(null); // { pkg } | null
  const [reordering, setReordering] = useState(false);
  const packages = service.packages;

  return (
    <Block title="Packages">
      <div className="-mt-1 mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-muted">What a client picks in step 1 of a booking.</p>
        <div className="flex items-center gap-4">
          {packages.length > 1 && (
            <button type="button" onClick={() => setReordering(true)} className="min-h-11 text-small text-ink underline underline-offset-4 hover:text-ink-muted">
              Reorder
            </button>
          )}
          <ActionButton onClick={() => setDialog({ pkg: null })}>Add package</ActionButton>
        </div>
      </div>

      {packages.length === 0 ? (
        <p className="border-t border-line py-8 text-center text-ink-muted">No packages yet. A service needs one before it can be booked.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {packages.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setDialog({ pkg: p })}
                className="-mx-2 flex min-h-16 w-[calc(100%+1rem)] items-center gap-4 px-2 py-3 text-left transition-colors hover:bg-paper-alt"
              >
                <span className="flex min-w-0 grow flex-col">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={p.hidden ? "truncate text-body text-ink-muted" : "truncate text-body text-ink"}>{p.name}</span>
                    {p.isFeatured && <span className="caps border border-line px-1.5 py-px text-tiny text-ink-muted">Most booked</span>}
                    {p.hidden && <span className="caps border border-line px-1.5 py-px text-tiny text-ink-muted">Hidden</span>}
                  </span>
                  <span className="mt-0.5 truncate text-small text-ink-muted">{p.customDescription || packageSummary(p)}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className={p.hidden ? "text-ink-muted" : "text-ink"}>{money(p.priceCents)}</span>
                  <span className="mt-0.5 text-small text-ink-muted">{plural(p.bookingCount, "booking")}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {dialog && <PackageDialog key={dialog.pkg?.id ?? "new"} show onClose={() => setDialog(null)} serviceId={service.id} pkg={dialog.pkg} />}
      {reordering && (
        <ReorderDialog
          show
          onClose={() => setReordering(false)}
          title="Reorder packages"
          items={packages.map((p) => ({ id: p.id, label: p.name }))}
          onSave={(ids) => reorderPackagesThunk(service.id, ids)}
        />
      )}
    </Block>
  );
}

PackagesBlock.propTypes = { service: PropTypes.object.isRequired };
