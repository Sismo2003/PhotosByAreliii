// Finding things: an always-visible search and the collapsible filters under "Filters" — for
// services Status and Sort, for add-ons Status, Offered on and Sort. Search is debounced and, like
// every filter, goes back to page 1. The Sort select and the clickable column headers drive the
// same store values.
import PropTypes from "prop-types";
import { useCallback, useState } from "react";

import { useDebounceCallback } from "hooks";
import { useServicesStore } from "slices";

import { SORT_OPTIONS, STATUS_OPTIONS, sortOptionId } from "./labels";

const fieldClass =
  "h-11 w-full border-0 border-b border-line-strong bg-transparent px-0 text-body text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none focus:ring-0";

export function ServicesSearch({ id, label, placeholder, value, onChange }) {
  const [q, setQ] = useState(value);
  // Stable callback (onChange is a store setter) so the debounce isn't rebuilt per keystroke.
  const sendQ = useCallback((text) => onChange({ q: text.trim() }), [onChange]);
  const pushQ = useDebounceCallback(sendQ, 300);

  return (
    <div className="pt-4">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          pushQ(e.target.value);
        }}
        placeholder={placeholder}
        className={fieldClass}
      />
    </div>
  );
}

function Select({ id, label, value, onChange, children }) {
  return (
    <div className="flex min-w-0 flex-col sm:w-48">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
        {children}
      </select>
    </div>
  );
}

function SortSelect({ query, onChange, only }) {
  const sortId = sortOptionId(query);
  const options = SORT_OPTIONS.filter((o) => !only || only.includes(o.id));
  return (
    <Select
      id="services-sort"
      label="Sort"
      value={sortId}
      onChange={(id) => {
        const o = SORT_OPTIONS.find((x) => x.id === id);
        if (o) onChange({ sort: o.sort, dir: o.dir });
      }}
    >
      {sortId === "custom" && (
        <option value="custom" disabled hidden>
          Column order
        </option>
      )}
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

function ClearButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="min-h-11 text-small text-ink underline underline-offset-4 hover:text-ink-muted sm:ml-auto">
      Clear filters
    </button>
  );
}

export function ServicesFilters({ query, counts, onChange, onClear, hasFilters }) {
  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-6">
      <Select id="services-status" label="Status" value={query.status} onChange={(status) => onChange({ status })}>
        <option value="">All{counts.all != null ? ` (${counts.all})` : ""}</option>
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
            {counts[o.value] != null ? ` (${counts[o.value]})` : ""}
          </option>
        ))}
      </Select>
      <SortSelect query={query} onChange={onChange} />
      {hasFilters && <ClearButton onClick={onClear} />}
    </div>
  );
}

export function AddonsFilters({ query, onChange, onClear, hasFilters }) {
  const options = useServicesStore((s) => s.options);
  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-6">
      <Select id="addons-active" label="Status" value={query.active} onChange={(active) => onChange({ active })}>
        <option value="">All</option>
        <option value="yes">On</option>
        <option value="no">Off</option>
      </Select>
      <Select id="addons-service" label="Offered on" value={String(query.serviceId)} onChange={(serviceId) => onChange({ serviceId })}>
        <option value="">Any service</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </Select>
      <SortSelect query={query} onChange={onChange} only={["order", "name", "price", "price-desc", "bookings"]} />
      {hasFilters && <ClearButton onClick={onClear} />}
    </div>
  );
}

ServicesSearch.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};
Select.propTypes = { id: PropTypes.string, label: PropTypes.string, value: PropTypes.string, onChange: PropTypes.func, children: PropTypes.node };
SortSelect.propTypes = { query: PropTypes.object.isRequired, onChange: PropTypes.func.isRequired, only: PropTypes.array };
ClearButton.propTypes = { onClick: PropTypes.func.isRequired };
ServicesFilters.propTypes = {
  query: PropTypes.object.isRequired,
  counts: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  hasFilters: PropTypes.bool,
};
AddonsFilters.propTypes = {
  query: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  hasFilters: PropTypes.bool,
};
