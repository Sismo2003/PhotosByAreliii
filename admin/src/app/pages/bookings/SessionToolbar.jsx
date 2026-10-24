// Search + Service filter for the server-side tabs (Upcoming, Follow-up, Done, Expired,
// Cancelled), and the pager under the list. Search is debounced; both reset to page 1.
import PropTypes from "prop-types";
import { useCallback, useState } from "react";

import { useDebounceCallback } from "hooks";

const fieldClass =
  "h-11 w-full border-0 border-b border-line-strong bg-transparent px-0 text-body text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none focus:ring-0";

export function SessionToolbar({ query, onChange, serviceOptions }) {
  const [q, setQ] = useState(query.q);
  // Stable callback (onChange is the store's setQuery) so the debounce isn't rebuilt per keystroke.
  const sendQ = useCallback((value) => onChange({ q: value.trim() }), [onChange]);
  const pushQ = useDebounceCallback(sendQ, 300);

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:gap-6 lg:w-auto">
      <div className="flex min-w-0 grow flex-col sm:w-64 sm:grow-0">
        <label htmlFor="bookings-q" className="field-label">
          Search
        </label>
        <input
          id="bookings-q"
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            pushQ(e.target.value);
          }}
          placeholder="Name, email, phone or code"
          className={fieldClass}
        />
      </div>
      <div className="flex min-w-0 flex-col sm:w-52">
        <label htmlFor="bookings-service" className="field-label">
          Session
        </label>
        <select
          id="bookings-service"
          value={query.serviceId}
          onChange={(e) => onChange({ serviceId: e.target.value })}
          className={fieldClass}
        >
          <option value="">All sessions</option>
          {serviceOptions.map((s) => (
            <option key={s.id} value={String(s.id)}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

SessionToolbar.propTypes = {
  query: PropTypes.shape({ q: PropTypes.string, serviceId: PropTypes.string }).isRequired,
  onChange: PropTypes.func.isRequired,
  serviceOptions: PropTypes.array,
};
