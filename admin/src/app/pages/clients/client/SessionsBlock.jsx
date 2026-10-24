// "Sessions" of the client page: every booking of this client (any stage), newest first.
// A row opens the booking page, which comes back to the tab that booking belongs to.
import PropTypes from "prop-types";
import { Link } from "react-router";

import { formatDate } from "utils/date";

import { bookingPath } from "../../bookings/helpers";
import { statusLabel } from "../../bookings/labels";
import { ToneTag } from "../../bookings/parts";
import { Block } from "../../bookings/booking/layout";
import { money } from "../labels";

export function SessionsBlock({ sessions }) {
  return (
    <Block title="Sessions">
      {sessions.length === 0 ? (
        <p className="text-ink-muted">No sessions yet.</p>
      ) : (
        <ul className="max-h-96 divide-y divide-line overflow-y-auto overscroll-contain">
          {sessions.map((s) => {
            const balance = s.derived?.balanceCents ?? 0;
            const open = s.status === "AWAITING_DEPOSIT" || s.status === "CONFIRMED";
            return (
              <li key={s.id}>
                <Link
                  to={bookingPath(s.id)}
                  state={{ from: s.derived?.tab }}
                  viewTransition
                  className="-mx-2 flex min-h-14 items-center gap-4 px-2 py-3 transition-colors hover:bg-paper-alt"
                >
                  <span className="flex w-10 shrink-0 flex-col items-center leading-none">
                    <span className="text-[1.5rem] text-ink">{formatDate(s.startsAt, "d")}</span>
                    <span className="caps mt-1 text-tiny text-ink-muted">{formatDate(s.startsAt, "LLL")}</span>
                  </span>
                  <span className="flex min-w-0 grow flex-col">
                    <span className="truncate text-body text-ink">{s.packageNameSnapshot ?? s.serviceNameSnapshot}</span>
                    <span className="mt-0.5 truncate text-small text-ink-muted">
                      {[s.code, formatDate(s.startsAt, "h:mm a"), money(s.totalCents) + (open && balance > 0 ? ` · ${money(balance)} due` : "")].join(" · ")}
                    </span>
                  </span>
                  <ToneTag tone={s.derived?.status?.tone} className="shrink-0 text-right whitespace-normal">
                    {statusLabel(s)}
                  </ToneTag>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Block>
  );
}

SessionsBlock.propTypes = { sessions: PropTypes.array.isRequired };
