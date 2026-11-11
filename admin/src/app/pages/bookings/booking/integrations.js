// Features of the booking page that depend on a module that does NOT exist yet.
//
// Each entry is a switch: while `ready` is false the UI shows the action disabled with `pendingNote`;
// once the module exists, an agent only has to set `ready: true` and fill `run` (or `href`).
// Full contract, open questions and where each one is used: docs/bookings-page-integraciones.md.
// Find every usage with:  grep -rn "INTEGRATION(" admin/src
//
// `run(booking)` must resolve `{ ok: true } | { ok: false, error }` — same shape as the thunks in
// slices/bookings/thunks.js — so NextStepCard can toast the result like any other action.

import { sendFollowUpEmailThunk } from "slices";

export const INTEGRATIONS = {
  // Correos module (docs/correos.md #10): thank-you email after the session. Ready since 2026-10-24.
  thankYouEmail: {
    ready: true,
    label: "Send thank-you",
    successMessage: "Thank-you on its way",
    run: (booking) => sendFollowUpEmailThunk(booking.id, "followup.thanks"),
  },

  // Correos module (#11): review request email; also sets reviewStatus REQUESTED. Needs the review
  // link in StudioSettings.reviewUrl — the API answers 409 with that sentence when it is missing.
  reviewRequestEmail: {
    ready: true,
    label: "Ask for a review",
    successMessage: "Review request on its way",
    run: (booking) => sendFollowUpEmailThunk(booking.id, "followup.review_request"),
  },

  // Correos module: email when a booking is created by hand (docs/nuevo-booking-admin.md). The
  // "Email the client" switch of the New booking summary sends `emailClient: true` with the booking;
  // the server picks "Booking confirmed" or "pay the deposit" by the status it starts in.
  newBookingEmail: {
    ready: true,
    label: "Email the client",
  },

  // Galleries module (docs/almacenamiento-fotos.md, docs/api-galleries.md): ready since 2026-10-04.
  // A booking with a gallery opens it; one without goes to "New gallery" with the booking filled in.
  galleries: {
    ready: true,
    label: "Open gallery",
    href: (booking) => (booking?.gallery?.id ? `/galleries/${booking.gallery.id}` : `/galleries/new?booking=${booking?.id}`),
  },
};
