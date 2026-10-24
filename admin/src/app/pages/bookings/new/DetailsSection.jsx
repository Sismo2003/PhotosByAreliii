// 4 · Details from Areli's "Info needed" list: notes, inspo, delivery date, sharing, consent.
import PropTypes from "prop-types";

import { ChoiceGroup } from "../parts";
import { CheckField, Field, FormSection, TextArea, inputClass } from "./fields";
import { SHARE_OPTIONS } from "./options";
import { todayInput } from "./pricing";

export function DetailsSection({ v, set, errors }) {
  return (
    <FormSection n={4} title="Details" hint="What Areli needs to know before the session." id="details">
      <Field label="Anything I should know?" optional className="sm:col-span-2">
        {(p) => <TextArea {...p} value={v.clientNotes} onChange={(e) => set({ clientNotes: e.target.value })} />}
      </Field>
      <Field label="Inspo" hint="Links or ideas" optional className="sm:col-span-2">
        {(p) => <TextArea {...p} value={v.inspo} onChange={(e) => set({ inspo: e.target.value })} />}
      </Field>
      <Field label="When do they need the photos?" hint="Book with enough time to deliver by then." optional>
        {(p) => <input {...p} type="date" min={todayInput()} value={v.photosNeededBy} onChange={(e) => set({ photosNeededBy: e.target.value })} className={inputClass} />}
      </Field>

      <div className="sm:col-span-2">
        <ChoiceGroup
          label="Can I share the photos?"
          options={SHARE_OPTIONS}
          value={v.sharePermission}
          onChange={(value) => set({ sharePermission: v.sharePermission === value ? "" : value })}
        />
      </div>
      {v.sharePermission === "PARTIAL" && (
        <Field label="Anything you don’t want posted?" hint="For example, kids’ faces." className="sm:col-span-2">
          {(p) => <TextArea {...p} value={v.doNotPostNotes} onChange={(e) => set({ doNotPostNotes: e.target.value })} />}
        </Field>
      )}

      <div className="sm:col-span-2">
        <CheckField checked={v.minorConsent} onChange={(minorConsent) => set({ minorConsent })}>
          Someone in the session is under 18 — a parent or guardian gave consent.
        </CheckField>
        <CheckField checked={v.policyAccepted} onChange={(policyAccepted) => set({ policyAccepted })} error={errors.policyAccepted}>
          The client accepted the booking policy (50% non-refundable deposit, 48 h notice, one reschedule, 30-minute grace).
        </CheckField>
      </div>
    </FormSection>
  );
}

DetailsSection.propTypes = { v: PropTypes.object, set: PropTypes.func, errors: PropTypes.object };
