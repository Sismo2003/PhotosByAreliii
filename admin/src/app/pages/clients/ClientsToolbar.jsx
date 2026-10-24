// Finding a client: a search that is always visible (name, email, phone, Instagram) and the
// collapsible filters under "Filters" — Group, Found me via, Gallery login and Sort. Search is
// debounced and, like every filter, goes back to page 1. The Sort select and the clickable column
// headers drive the same store values.
import PropTypes from "prop-types";
import { useCallback, useState } from "react";

import { useDebounceCallback } from "hooks";

import { HEARD_FROM, LOGIN_OPTIONS, SORT_OPTIONS, TABS, sortOptionId } from "./labels";

const fieldClass =
  "h-11 w-full border-0 border-b border-line-strong bg-transparent px-0 text-body text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none focus:ring-0";

export function ClientsSearch({ value, onChange }) {
  const [q, setQ] = useState(value);
  // Stable callback (onChange is the store's setQuery) so the debounce isn't rebuilt per keystroke.
  const sendQ = useCallback((text) => onChange({ q: text.trim() }), [onChange]);
  const pushQ = useDebounceCallback(sendQ, 300);

  return (
    <div className="pt-4">
      <label htmlFor="clients-q" className="field-label">
        Find a client
      </label>
      <input
        id="clients-q"
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          pushQ(e.target.value);
        }}
        placeholder="Name, email, phone or Instagram"
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

export function ClientsFilters({ tab, onTab, counts, query, onChange, onClear, hasFilters }) {
  const sortId = sortOptionId(query);
  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-6">
      <Select id="clients-group" label="Group" value={tab} onChange={onTab}>
        <option value="all">All clients{counts.all != null ? ` (${counts.all})` : ""}</option>
        {TABS.filter((t) => t.id !== "all").map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
            {counts[t.id] != null ? ` (${counts[t.id]})` : ""}
          </option>
        ))}
      </Select>
      <Select id="clients-heard" label="Found me via" value={query.heardFrom} onChange={(heardFrom) => onChange({ heardFrom })}>
        <option value="">Anyone</option>
        {HEARD_FROM.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <Select id="clients-login" label="Gallery login" value={query.login} onChange={(login) => onChange({ login })}>
        <option value="">Any</option>
        {LOGIN_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <Select
        id="clients-sort"
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
        {SORT_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </Select>
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="min-h-11 text-small text-ink underline underline-offset-4 hover:text-ink-muted sm:ml-auto"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

ClientsSearch.propTypes = { value: PropTypes.string.isRequired, onChange: PropTypes.func.isRequired };
Select.propTypes = {
  id: PropTypes.string,
  label: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  children: PropTypes.node,
};
ClientsFilters.propTypes = {
  tab: PropTypes.string.isRequired,
  onTab: PropTypes.func.isRequired,
  counts: PropTypes.object.isRequired,
  query: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  hasFilters: PropTypes.bool,
};
