// An existing client → the Client section values of the New booking form.
export const fromClient = (c) => ({
  clientMode: "existing",
  client: c,
  firstName: c.firstName ?? "",
  lastName: c.lastName ?? "",
  displayName: c.displayName ?? "",
  displayNameTouched: true,
  email: c.email,
  phone: c.phone ?? "",
  instagram: c.instagram ?? "",
  heardFrom: c.heardFrom ?? "",
  clientPrivateNotes: c.privateNotes ?? "",
});
