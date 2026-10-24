// 5 · Price and payment — admin only (the public form never asks for this).
import PropTypes from "prop-types";

import { ChoiceGroup } from "../parts";
import { PAYMENT_METHODS, money } from "../labels";
import { Field, FormSection, TextArea, inputClass } from "./fields";
import { PAY_MODES } from "./options";

export function PaymentSection({ v, set, errors, price }) {
  return (
    <FormSection n={5} title="Price and payment" hint="Only you see this section." id="payment">
      <Field label="Adjustment ($)" error={errors.adjustment} hint="A discount is negative: -20" optional>
        {(p) => <input {...p} inputMode="decimal" value={v.adjustment} onChange={(e) => set({ adjustment: e.target.value })} placeholder="0" className={inputClass} />}
      </Field>
      <div />

      <div className="sm:col-span-2">
        <ChoiceGroup label="Payment received now?" options={PAY_MODES} value={v.payMode} onChange={(payMode) => set({ payMode })} />
        {v.payMode !== "NONE" && (
          <div className="mt-4">
            <ChoiceGroup label="How did they pay?" options={PAYMENT_METHODS} value={v.payMethod} onChange={(payMethod) => set({ payMethod })} />
            {errors.payMethod && <p role="alert" className="mt-1 text-small text-alert">{errors.payMethod}</p>}
            <p className="mt-3 text-small text-ink-muted">
              {v.payMode === "FULL"
                ? `Records ${money(price.totalCents)}: the ${money(price.depositCents)} deposit and the ${money(price.totalCents - price.depositCents)} balance.`
                : `Records the ${money(price.depositCents)} deposit — the booking starts confirmed.`}
            </p>
          </div>
        )}
      </div>

      <Field label="Private notes" hint="Only you see this." optional className="sm:col-span-2">
        {(p) => <TextArea {...p} value={v.privateNotes} onChange={(e) => set({ privateNotes: e.target.value })} />}
      </Field>
    </FormSection>
  );
}

PaymentSection.propTypes = { v: PropTypes.object, set: PropTypes.func, errors: PropTypes.object, price: PropTypes.object };
