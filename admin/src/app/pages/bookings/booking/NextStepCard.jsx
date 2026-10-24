// The heart of the booking page: ONE card that says what to do next with this client, with one
// primary button. Forms (record payment, reschedule, cancel…) open inside this same card.
import clsx from "clsx";
import PropTypes from "prop-types";

import { TONE_DOT } from "../labels";
import { ActionButton } from "../parts";
import { CancelForm, ExpireForm, PaymentForm, RescheduleForm } from "../detail/ActionForms";
import { RebookReminder } from "../detail/FollowUpChecklist";
import { Card } from "./layout";

function FormFor({ form, booking, onClose }) {
  if (form === "deposit") return <PaymentForm booking={booking} kind="DEPOSIT" onClose={onClose} />;
  if (form === "balance") return <PaymentForm booking={booking} kind="BALANCE" onClose={onClose} />;
  if (form === "res") return <RescheduleForm booking={booking} onClose={onClose} />;
  if (form === "cancel") return <CancelForm booking={booking} onClose={onClose} />;
  if (form === "expire") return <ExpireForm booking={booking} onClose={onClose} />;
  return null;
}

export function NextStepCard({ booking, step, form, onCloseForm }) {
  const { next, primary, secondary, perform, busy, run } = step;
  const quiet = !primary && !secondary && next.tone !== "alert";

  return (
    <Card id="next-step" className="scroll-mt-6" aria-labelledby="next-step-title">
      <p className="flex items-center gap-2 caps text-ink-muted">
        <span
          aria-hidden="true"
          className={clsx("size-[7px] rounded-full border", TONE_DOT[next.tone] ?? TONE_DOT.pending)}
        />
        {quiet ? "Status" : "Next step"}
      </p>
      <h2 id="next-step-title" className="mt-2 text-[1.5rem] leading-snug text-ink sm:text-[1.75rem]">
        {next.title}
      </h2>
      {next.detail && <p className="mt-1.5 max-w-prose text-body text-ink-muted">{next.detail}</p>}

      <div className="mt-5">
        {form ? (
          <FormFor form={form} booking={booking} onClose={onCloseForm} />
        ) : next.primary?.id === "rebook" ? (
          <RebookReminder booking={booking} busy={busy} run={run} />
        ) : (
          (primary || secondary) && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              {primary && (
                // Phones get this same button in the fixed bottom bar (BottomBar in index.jsx).
                <ActionButton
                  solid
                  disabled={primary.disabled}
                  onClick={() => perform(primary.id)}
                  className="hidden min-w-48 lg:inline-flex"
                >
                  {busy ? "Working…" : primary.label}
                </ActionButton>
              )}
              {secondary && (
                <button
                  type="button"
                  disabled={secondary.disabled}
                  onClick={() => perform(secondary.id)}
                  className="min-h-11 text-body text-ink underline underline-offset-4 hover:text-ink-muted disabled:opacity-40"
                >
                  {secondary.label}
                </button>
              )}
            </div>
          )
        )}
        {!form && primary?.note && <p className="mt-3 text-small text-ink-muted">{primary.note}</p>}
      </div>
    </Card>
  );
}

FormFor.propTypes = { form: PropTypes.string, booking: PropTypes.object, onClose: PropTypes.func };
NextStepCard.propTypes = {
  booking: PropTypes.object.isRequired,
  step: PropTypes.object.isRequired,
  form: PropTypes.string,
  onCloseForm: PropTypes.func,
};
