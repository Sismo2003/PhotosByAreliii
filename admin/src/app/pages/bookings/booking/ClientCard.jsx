// Client block of the booking page: contact, where the booking came from, and (for requests) the
// client-match review. Ported from the old request view.
import PropTypes from "prop-types";

import { resolveMatchThunk } from "slices";
import { formatPhone, telHref } from "utils/phone";

import { ActionButton, KeyValueRows } from "../parts";
import { Block } from "./layout";

const SOURCE_LABEL = {
  WEBSITE: "Booking form on the website",
  MANUAL: "Added manually by the studio",
};

export function ClientCard({ booking, conflictWith, busy, canReview, run }) {
  const client = booking.client;
  const kind = booking.clientMatchedBy;
  const reviewed = Boolean(booking.matchReviewedAt);
  const needsReview = !reviewed && (kind === "PHONE" || kind === "CONFLICT");
  const detailChanges = booking.detailChanges ?? [];

  const match = (action) =>
    run(resolveMatchThunk(booking.id, action), {
      success: "Client updated",
      fallback: "Could not update the client",
    });

  return (
    <Block title="Client">
      <div className="flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center border border-line text-[1.25rem] text-ink">
          {initials(client?.displayName)}
        </div>
        <div className="min-w-0 text-small">
          <div className="text-[1.1rem] text-ink">{client?.displayName ?? "—"}</div>
          {client?.phone && (
            <a
              href={telHref(client.phone)}
              className="block text-ink underline-offset-2 hover:underline"
            >
              {formatPhone(client.phone)}
            </a>
          )}
          {client?.email ? (
            <a
              href={`mailto:${client.email}`}
              className="block truncate text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              {client.email}
            </a>
          ) : (
            <span className="block text-ink-muted">—</span>
          )}
        </div>
      </div>

      <div className="mt-4 text-small">
        <KeyValueRows
          rows={[
            ["Came from", SOURCE_LABEL[booking.source] ?? booking.source ?? "—"],
            ["Client record", matchSummary(kind, reviewed)],
          ]}
        />
      </div>

      {canReview && needsReview && kind === "PHONE" && (
        <ReviewBox
          question={`The phone number matches ${client?.displayName ?? "an existing client"}, but the email is different. Is this the same person?`}
        >
          <ActionButton disabled={busy} onClick={() => match("looks_right")}>
            Yes, same person
          </ActionButton>
          <ActionButton disabled={busy} onClick={() => match("not_same")}>
            No, create a new client
          </ActionButton>
        </ReviewBox>
      )}

      {canReview && needsReview && kind === "CONFLICT" && (
        <ReviewBox
          question={`The email belongs to ${client?.displayName ?? "this client"}, but the phone belongs to another client. The request stays with ${client?.displayName ?? "this client"}.`}
        >
          {conflictWith && (
            <div className="w-full border border-alert p-3 text-small">
              <p className="caps text-ink-muted">Phone belongs to</p>
              <div className="mt-1 text-ink">
                {conflictWith.displayName}{" "}
                <span className="text-ink-muted">({conflictWith.email})</span>
              </div>
              {conflictWith.phone && (
                <div className="text-ink-muted">{formatPhone(conflictWith.phone)}</div>
              )}
            </div>
          )}
          <ActionButton disabled={busy} onClick={() => match("looks_right")}>
            OK, keep {client?.displayName ?? "this client"}
          </ActionButton>
        </ReviewBox>
      )}

      {canReview && detailChanges.length > 0 && (
        <ReviewBox
          question="The client typed different details than the ones on file:"
          detail={
            <ul className="mt-2 space-y-1 text-ink">
              {detailChanges.map((c) => (
                <li key={c.field}>{describeChange(c)}</li>
              ))}
            </ul>
          }
        >
          <ActionButton disabled={busy} onClick={() => match("update_client")}>
            Use the new details
          </ActionButton>
          <ActionButton disabled={busy} onClick={() => match("keep")}>
            Keep what’s on file
          </ActionButton>
        </ReviewBox>
      )}
    </Block>
  );
}

function ReviewBox({ question, detail, children }) {
  return (
    <div className="mt-4 border-l-2 border-alert pl-3 text-small">
      <p className="text-alert">{question}</p>
      {detail}
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function matchSummary(kind, reviewed) {
  switch (kind) {
    case "NEW":
      return "New client — first booking";
    case "EMAIL":
      return "Returning client (same email)";
    case "BOTH":
      return "Returning client (same email and phone)";
    case "PHONE":
      return reviewed ? "Returning client (same phone, checked)" : "Same phone — needs your check";
    case "CONFLICT":
      return reviewed ? "Email/phone conflict — checked" : "Email and phone don’t match — check";
    default:
      return kind ?? "—";
  }
}

// One per-field diff from the backend (BookingModel.detailChanges): { field, from, to }.
function describeChange({ field, from, to }) {
  if (field === "phone") return `Phone: ${formatPhone(from) || "—"} → ${formatPhone(to)}`;
  if (field === "name") return `Name: ${from ?? "—"} → ${to}`;
  if (field === "email") return `Email: ${from ?? "—"} → ${to}`;
  return `${field}: ${from ?? "—"} → ${to}`;
}

function initials(name) {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

ClientCard.propTypes = {
  booking: PropTypes.object.isRequired,
  conflictWith: PropTypes.object,
  busy: PropTypes.bool,
  canReview: PropTypes.bool,
  run: PropTypes.func,
};
ReviewBox.propTypes = { question: PropTypes.string, detail: PropTypes.node, children: PropTypes.node };
