// 2 · Session: service → package → extras (with quantity: several outfit changes) → people.
import clsx from "clsx";
import PropTypes from "prop-types";
import { MinusIcon, PlusIcon } from "@heroicons/react/24/outline";

import { ChoiceGroup } from "../parts";
import { money } from "../labels";
import { durationLabel } from "../../services/labels";
import { Field, FormSection, inputClass } from "./fields";
import { PARTY_SIZES } from "./options";

export const MAX_EXTRA_QTY = 10;

function Stepper({ value, onChange, label }) {
  const btn = "flex size-9 items-center justify-center border border-line-strong text-ink transition-colors hover:border-ink disabled:opacity-35";
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <button type="button" aria-label={`Fewer ${label}`} className={btn} disabled={value <= 0} onClick={() => onChange(value - 1)}>
        <MinusIcon className="size-4" />
      </button>
      <span className="w-6 text-center tabular-nums text-ink" aria-live="polite">{value}</span>
      <button type="button" aria-label={`More ${label}`} className={btn} disabled={value >= MAX_EXTRA_QTY} onClick={() => onChange(value + 1)}>
        <PlusIcon className="size-4" />
      </button>
    </div>
  );
}

export function SessionSection({ v, set, errors, catalog }) {
  const service = catalog.services.find((s) => String(s.id) === v.serviceId);
  const extras = service ? catalog.extras.filter((e) => e.serviceIds.includes(service.id)) : [];
  const isGraduation = /graduat/i.test(service?.name ?? "");

  const pickService = (id) => {
    const next = catalog.services.find((s) => String(s.id) === id);
    set({
      serviceId: id,
      packageId: next?.packages.length === 1 ? String(next.packages[0].id) : "",
      extraQty: {}, // extras differ per service
      schoolAndColors: "",
    });
  };

  return (
    <FormSection n={2} title="Session" hint="What they booked." id="session">
      <Field label="Service" error={errors.serviceId} className="sm:col-span-2">
        {(p) => (
          <select {...p} value={v.serviceId} onChange={(e) => pickService(e.target.value)} className={inputClass}>
            <option value="">Choose a service…</option>
            {catalog.services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </Field>

      {service && (
        <div className="sm:col-span-2">
          <span className="field-label">Package</span>
          <div role="radiogroup" aria-label="Package" className="mt-2 grid gap-2 sm:grid-cols-2">
            {service.packages.map((pkg) => {
              const on = String(pkg.id) === v.packageId;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set({ packageId: String(pkg.id) })}
                  className={clsx(
                    "flex min-h-14 items-center justify-between gap-4 border px-4 py-3 text-left transition-colors",
                    on
                      ? "border-ink bg-paper-alt text-ink ring-1 ring-ink"
                      : "border-line-strong bg-transparent text-ink hover:border-ink",
                  )}
                >
                  <span>
                    <span className="block text-body">{pkg.name}</span>
                    <span className="block text-small text-ink-muted">
                      {pkg.customDescription || `${pkg.durationMinutes} min`}
                      {pkg.isFeatured && " · Most booked"}
                    </span>
                  </span>
                  <span className="text-body">{money(pkg.priceCents)}</span>
                </button>
              );
            })}
          </div>
          {errors.packageId && <p role="alert" className="mt-1 text-small text-alert">{errors.packageId}</p>}
        </div>
      )}

      {extras.length > 0 && (
        <div className="sm:col-span-2">
          <span className="field-label">Extras</span>
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {extras.map((e) => (
              <li key={e.id} className="flex min-h-14 items-center justify-between gap-4 py-2">
                <span>
                  <span className="block text-body text-ink">{e.name}</span>
                  <span className="block text-small text-ink-muted">
                    +{money(e.priceCents)} each{e.minutes > 0 && ` · adds ${durationLabel(e.minutes)}`}
                  </span>
                </span>
                <Stepper
                  label={e.name}
                  value={v.extraQty[e.id] ?? 0}
                  onChange={(n) => set((prev) => ({ extraQty: { ...prev.extraQty, [e.id]: n } }))}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="sm:col-span-2">
        <ChoiceGroup
          label="How many people?"
          options={PARTY_SIZES}
          value={v.partySize}
          onChange={(value) => set({ partySize: v.partySize === value ? "" : value })}
        />
      </div>

      {isGraduation && (
        <Field label="School & colors" optional className="sm:col-span-2">
          {(p) => (
            <input {...p} value={v.schoolAndColors} onChange={(e) => set({ schoolAndColors: e.target.value })} placeholder="ASU · maroon & gold" className={inputClass} />
          )}
        </Field>
      )}
    </FormSection>
  );
}

Stepper.propTypes = { value: PropTypes.number, onChange: PropTypes.func, label: PropTypes.string };
SessionSection.propTypes = { v: PropTypes.object, set: PropTypes.func, errors: PropTypes.object, catalog: PropTypes.object };
