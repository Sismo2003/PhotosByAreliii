// 3 · When and where. Warns when another booking falls on the same studio day.
import PropTypes from "prop-types";
import { useEffect, useState } from "react";

import { getCalendar } from "services/bookings";
import { formatDate } from "utils/date";

import { ChoiceGroup, AlertNote } from "../parts";
import { Field, FormSection, inputClass } from "./fields";
import { LOCATION_KINDS } from "./options";
import { todayInput } from "./pricing";

function useSameDay(date) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!date) return undefined;
    let live = true;
    getCalendar(date.slice(0, 7))
      .then(({ data }) => {
        const day = (data.data?.days ?? []).find((d) => d.date === date);
        if (live) setItems(day?.items ?? []);
      })
      .catch(() => live && setItems([]));
    return () => {
      live = false;
    };
  }, [date]);
  return date ? items : [];
}

export function WhenWhereSection({ v, set, errors }) {
  const sameDay = useSameDay(v.date);
  return (
    <FormSection n={3} title="When and where" hint="Times are Phoenix time." id="when">
      <Field label="Date" error={errors.date}>
        {(p) => <input {...p} type="date" min={todayInput()} value={v.date} onChange={(e) => set({ date: e.target.value })} className={inputClass} />}
      </Field>
      <Field label="Start time" error={errors.time}>
        {(p) => <input {...p} type="time" step={900} value={v.time} onChange={(e) => set({ time: e.target.value })} className={inputClass} />}
      </Field>

      {sameDay.length > 0 && (
        <AlertNote className="sm:col-span-2">
          Already that day:{" "}
          {sameDay.map((b) => `${b.client?.displayName ?? b.code} at ${formatDate(b.startsAt, "h:mm a")}`).join(" · ")}. Check
          travel time.
        </AlertNote>
      )}

      <div className="sm:col-span-2">
        <ChoiceGroup
          label="Location"
          options={LOCATION_KINDS}
          value={v.locationKind}
          onChange={(value) => set({ locationKind: value })}
        />
        {errors.locationKind && <p role="alert" className="mt-1 text-small text-alert">{errors.locationKind}</p>}
      </div>
      <Field label="Place" error={errors.locationName} hint="Lost Dutchman State Park, ASU Tempe campus…">
        {(p) => <input {...p} value={v.locationName} onChange={(e) => set({ locationName: e.target.value })} className={inputClass} />}
      </Field>
      <Field label="Address" optional>
        {(p) => <input {...p} value={v.locationAddress} onChange={(e) => set({ locationAddress: e.target.value })} className={inputClass} />}
      </Field>
      <Field label="Travel fee ($)" error={errors.travelFee} hint="Only if the place is farther than the free miles." optional>
        {(p) => <input {...p} inputMode="decimal" value={v.travelFee} onChange={(e) => set({ travelFee: e.target.value })} placeholder="0" className={inputClass} />}
      </Field>
    </FormSection>
  );
}

WhenWhereSection.propTypes = { v: PropTypes.object, set: PropTypes.func, errors: PropTypes.object };
