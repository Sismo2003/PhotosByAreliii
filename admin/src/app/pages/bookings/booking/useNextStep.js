// Behavior behind the Next step card and the phone action bar: what the primary / secondary
// buttons do for the booking's current step. Visuals live in NextStepCard.jsx.
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";

import {
  archiveBookingThunk,
  confirmBookingThunk,
  reopenBookingThunk,
  reviewReceivedThunk,
  unarchiveBookingThunk,
} from "slices";

import { bookingFlags } from "../helpers";
import { useBookingAction } from "../detail/useBookingAction";
import { INTEGRATIONS } from "./integrations";
import { describeNext } from "./stage";

// Action ids that open an inline form in the card (see FormFor in NextStepCard).
const FORM_OF = { deposit: "deposit", balance: "balance", reschedule: "res", expire: "expire", cancel: "cancel" };

// Action ids backed by a module that may not exist yet (integrations.js).
const INTEGRATION_OF = { thanks: "thankYouEmail", review_request: "reviewRequestEmail" };

export function useNextStep(booking, setForm) {
  const flags = useMemo(() => bookingFlags(booking), [booking]);
  const next = useMemo(() => describeNext(booking, flags), [booking, flags]);
  const { busy, run } = useBookingAction(booking.id);
  const navigate = useNavigate();

  /** Label / disabled / note for an action id, honoring pending integrations. */
  const describe = useCallback(
    (action) => {
      if (!action) return null;
      const integration = INTEGRATIONS[INTEGRATION_OF[action.id]];
      if (integration && !integration.ready) {
        // INTEGRATION(thankYouEmail | reviewRequestEmail): see docs/bookings-page-integraciones.md
        return { ...action, label: integration.label, disabled: true, note: integration.pendingNote };
      }
      return { ...action, disabled: busy };
    },
    [busy],
  );

  const perform = useCallback(
    async (id) => {
      if (FORM_OF[id]) return setForm(FORM_OF[id]);
      const id_ = booking.id;
      switch (id) {
        case "confirm":
          return run(confirmBookingThunk(id_), {
            success: `${booking.code} confirmed · deposit due in 48 h`,
            fallback: "Could not confirm booking",
          });
        case "archive":
          return run(archiveBookingThunk(id_), { success: "Moved to Done", fallback: "Could not archive the booking" });
        case "unarchive":
          return run(unarchiveBookingThunk(id_), {
            success: "Moved back to Follow-up",
            fallback: "Could not move it back",
          });
        case "reopen":
          return run(reopenBookingThunk(id_), { success: "Booking reopened", fallback: "Could not reopen the booking" });
        case "review_received":
          return run(reviewReceivedThunk(id_), {
            success: "Review marked received",
            fallback: "Could not update the review",
          });
        case "galleries":
          // INTEGRATION(galleries): deep link once Galleries supports it.
          return navigate(INTEGRATIONS.galleries.href(booking));
        case "thanks":
        case "review_request": {
          const integration = INTEGRATIONS[INTEGRATION_OF[id]];
          // INTEGRATION(thankYouEmail | reviewRequestEmail)
          if (!integration.ready || !integration.run) return null;
          return run(integration.run(booking), {
            success: integration.successMessage,
            fallback: "Could not send the email",
          });
        }
        default:
          return null;
      }
    },
    [booking, navigate, run, setForm],
  );

  return {
    flags,
    next,
    busy,
    run,
    primary: describe(next.primary),
    secondary: describe(next.secondary),
    perform,
  };
}
