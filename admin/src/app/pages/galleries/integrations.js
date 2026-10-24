// Features of the Galleries pages that depend on a module that does NOT exist yet.
// Same idea as bookings/booking/integrations.js: a switch while the module is missing, marked in
// code with INTEGRATION(name). Contract, plug-in points and open doubts: docs/galleries-pendientes.md.
// Find every usage with:  grep -rn "INTEGRATION(" admin/src Backend

export const INTEGRATIONS = {
  // Correos module (docs/correos.md): the "Your gallery is ready" email sent by Deliver.
  // Until then delivering only marks the gallery delivered; Areli sends the link, password and PIN by hand.
  deliveryEmail: {
    ready: false,
    pendingNote: "Email sending isn’t available yet. Send the link, password and PIN to the client by hand.",
  },

  // Client gallery (the client's own view, design ClientGallery*.dc.html): "Preview as client".
  previewAsClient: {
    ready: false,
    pendingNote: "The client’s gallery isn’t built yet.",
  },
};
