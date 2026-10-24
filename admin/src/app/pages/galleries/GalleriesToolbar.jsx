// Finding a gallery: an always-visible search (name, client, email, booking code) and the
// collapsible filters — State and Sort. Same layout as clients/ClientsToolbar.jsx.
import PropTypes from "prop-types";
import { useCallback, useState } from "react";

import { useDebounceCallback } from "hooks";

import { SORT_OPTIONS, TABS } from "./labels";

const fieldClass =
  "h-11 w-full border-0 border-b border-line-strong bg-transparent px-0 text-body text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none focus:ring-0";

export function GalleriesSearch({ value, onChange }) {
  const [q, setQ] = useState(value);
  const sendQ = useCallback((text) => onChange({ q: text.trim() }), [onChange]);
  const pushQ = useDebounceCallback(sendQ, 300);
  return (
    <div className="pt-4">
      <label htmlFor="galleries-q" className="field-label">
        Find a gallery
      </label>
      <input
        id="galleries-q"
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          pushQ(e.target.value);
        }}
        placeholder="Gallery name, client or booking code"
        className={fieldClass}
      />
    </div>
  );
}

function Select({ id, label, value, onChange, children }) {
  return (
    <div className="flex min-w-0 flex-col sm:w-52">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
        {children}
      </select>
    </div>
  );
}

export function GalleriesFilters({ tab, onTab, counts, query, onChange, onClear, hasFilters }) {
  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-6">
      <Select id="galleries-state" label="State" value={tab} onChange={onTab}>
        {TABS.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
            {counts[t.id] != null ? ` (${counts[t.id]})` : ""}
          </option>
        ))}
      </Select>
      <Select id="galleries-sort" label="Sort" value={query.sort} onChange={(sort) => onChange({ sort })}>
        {SORT_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </Select>
      {hasFilters && (
        <button type="button" onClick={onClear} className="min-h-11 text-small text-ink underline underline-offset-4 hover:text-ink-muted sm:ml-auto">
          Clear filters
        </button>
      )}
    </div>
  );
}

GalleriesSearch.propTypes = { value: PropTypes.string.isRequired, onChange: PropTypes.func.isRequired };
Select.propTypes = { id: PropTypes.string, label: PropTypes.string, value: PropTypes.string, onChange: PropTypes.func, children: PropTypes.node };
GalleriesFilters.propTypes = {
  tab: PropTypes.string.isRequired,
  onTab: PropTypes.func.isRequired,
  counts: PropTypes.object.isRequired,
  query: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  hasFilters: PropTypes.bool,
};
