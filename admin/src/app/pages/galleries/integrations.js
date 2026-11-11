// Features of the Galleries pages that depend on a module that does NOT exist yet.
// Same idea as bookings/booking/integrations.js: a switch while the module is missing, marked in
// code with INTEGRATION(name). Contract, plug-in points and open doubts: docs/galleries-pendientes.md.
// Find every usage with:  grep -rn "INTEGRATION(" admin/src Backend

export const INTEGRATIONS = {
  // Correos module (docs/correos.md #17): "Your photos are ready" is sent by Deliver since 2026-10-24.
  deliveryEmail: { ready: true },

  // Client gallery (the client's own view, design ClientGallery*.dc.html): "Preview as client".
  previewAsClient: {
    ready: false,
    pendingNote: "The client’s gallery isn’t built yet.",
  },
};
