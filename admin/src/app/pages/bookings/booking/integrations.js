// Features of the booking page that depend on a module that does NOT exist yet.
//
// Each entry is a switch: while `ready` is false the UI shows the action disabled with `pendingNote`;
// once the module exists, an agent only has to set `ready: true` and fill `run` (or `href`).
// Full contract, open questions and where each one is used: docs/bookings-page-integraciones.md.
// Find every usage with:  grep -rn "INTEGRATION(" admin/src
//
// `run(booking)` must resolve `{ ok: true } | { ok: false, error }` — same shape as the thunks in
// slices/bookings/thunks.js — so NextStepCard can toast the result like any other action.

export const INTEGRATIONS = {
  // Correos module (docs/correos.md): thank-you email after the session.
  thankYouEmail: {
    ready: false,
    label: "Send thank-you",
    pendingNote: "Email sending isn’t available yet. Thank the client by hand for now.",
    successMessage: "Thank-you sent",
    run: null, // (booking) => sendThankYouThunk(booking.id)
  },

  // Correos module: review request email (sets reviewStatus REQUESTED).
  reviewRequestEmail: {
    ready: false,
    label: "Ask for a review",
    pendingNote: "Email sending isn’t available yet. Ask for the review by hand for now.",
    successMessage: "Review request sent",
    run: null, // (booking) => requestReviewThunk(booking.id)
  },

  // Correos module: confirmation email when a booking is created by hand (docs/nuevo-booking-admin.md).
  // Used by the "Email the client" switch in the New booking summary.
  newBookingEmail: {
    ready: false,
    label: "Email the client the confirmation",
    pendingNote: "Email sending isn’t available yet. Let the client know by hand for now.",
    successMessage: "Confirmation sent",
    run: null, // (booking) => sendNewBookingEmailThunk(booking.id)
  },

  // Galleries module (docs/almacenamiento-fotos.md, docs/api-galleries.md): ready since 2026-10-04.
  // A booking with a gallery opens it; one without goes to "New gallery" with the booking filled in.
  galleries: {
    ready: true,
    label: "Open gallery",
    href: (booking) => (booking?.gallery?.id ? `/galleries/${booking.gallery.id}` : `/galleries/new?booking=${booking?.id}`),
  },
};
