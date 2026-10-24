// What the client told us on /book (party size, school, notes, sharing…).
import PropTypes from "prop-types";

import { formatDate, formatDay } from "utils/date";

import { partyLabel } from "../labels";

const SHARE = {
  YES: "Yes, share",
  PARTIAL: "Yes, but not everything",
  NO: "Don't share",
};

export function NotesList({ booking, skipParty }) {
  const items = [
    !skipParty && booking.partySize && ["Party size", partyLabel(booking.partySize)],
    !skipParty && booking.schoolAndColors && ["School & colors", booking.schoolAndColors],
    booking.clientNotes && ["Their notes", booking.clientNotes],
    booking.inspo && ["Inspo", booking.inspo],
    booking.photosNeededBy && ["Photos needed by", formatDay(booking.photosNeededBy, "LLL d, yyyy")],
    booking.sharePermission && ["Sharing", SHARE[booking.sharePermission] ?? booking.sharePermission],
    booking.doNotPostNotes && ["Don't post", booking.doNotPostNotes],
    booking.minorConsentAt && ["Minor consent", formatDate(booking.minorConsentAt, "LLL d, yyyy")],
    booking.privateNotes && ["Private notes", booking.privateNotes],
  ].filter(Boolean);
  if (items.length === 0) {
    return <p className="text-ink-muted">No notes provided.</p>;
  }
  return (
    <dl className="space-y-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="caps text-ink-muted">{label}</dt>
          <dd className="mt-0.5 whitespace-pre-wrap break-words text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

NotesList.propTypes = { booking: PropTypes.object.isRequired, skipParty: PropTypes.bool };
