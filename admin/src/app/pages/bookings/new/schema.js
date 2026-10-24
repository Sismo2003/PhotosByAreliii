// Initial values, yup validation and the API payload of the New booking form.
import * as yup from "yup";

import { studioInputToISO, nowInStudio } from "utils/date";
import { isValidPhone } from "utils/phone";

import { dollarsToCents } from "./pricing";

export const initialValues = {
  // Client
  clientMode: "new", // "new" | "existing"
  client: null, // the existing client (from search or matched by email/phone)
  foundBy: "", // "email" | "phone" when it was matched while typing
  firstName: "",
  lastName: "",
  displayName: "",
  displayNameTouched: false,
  email: "",
  phone: "",
  instagram: "",
  heardFrom: "",
  clientPrivateNotes: "",
  // Session
  serviceId: "",
  packageId: "",
  extraQty: {}, // { [extraId]: quantity }
  partySize: "",
  schoolAndColors: "",
  // When and where
  date: "",
  time: "",
  locationKind: "",
  locationName: "",
  locationAddress: "",
  travelFee: "",
  // Details
  clientNotes: "",
  inspo: "",
  photosNeededBy: "",
  sharePermission: "",
  doNotPostNotes: "",
  minorConsent: false,
  policyAccepted: false,
  // Price & payment
  adjustment: "",
  privateNotes: "",
  payMode: "NONE",
  payMethod: "",
};

const isMoney = (opts) => (v) => dollarsToCents(v, opts) !== null;

export const schema = yup.object({
  firstName: yup.string().trim().when("clientMode", { is: "new", then: (s) => s.required("First name is required") }),
  email: yup.string().trim().when("clientMode", {
    is: "new",
    then: (s) => s.required("Email is required").email("Enter a valid email"),
  }),
  // Both are how the client is found again, so a new client needs both.
  phone: yup.string().trim().when("clientMode", {
    is: "new",
    then: (s) => s.required("Phone is required").test("phone", "Enter a valid US phone number", (v) => isValidPhone(v)),
  }),
  client: yup.object().nullable().when("clientMode", { is: "existing", then: (s) => s.required("Pick a client") }),
  serviceId: yup.string().required("Choose a service"),
  packageId: yup.string().required("Choose a package"),
  date: yup.string().required("Choose a date"),
  time: yup
    .string()
    .required("Choose a time")
    .test("future", "That time has already passed", function check(time) {
      const iso = studioInputToISO(this.parent.date, time);
      return !iso || new Date(iso).getTime() > nowInStudio().toMillis();
    }),
  locationKind: yup.string().required("Choose a location type"),
  locationName: yup.string().trim().required("Where is the session?"),
  travelFee: yup.string().test("money", "Enter an amount like 25 or 12.50", isMoney({})),
  adjustment: yup.string().test("money", "Enter an amount like 20 or -15", isMoney({ allowNegative: true })),
  policyAccepted: yup.boolean().oneOf([true], "The client has to accept the policy"),
  payMethod: yup.string().when("payMode", { is: (m) => m !== "NONE", then: (s) => s.required("How was it paid?") }),
});

/** { field: message } for the first problem of each field (empty object = valid). */
export function validate(values) {
  try {
    schema.validateSync(values, { abortEarly: false });
    return {};
  } catch (err) {
    const out = {};
    for (const e of err.inner ?? []) if (!out[e.path]) out[e.path] = e.message;
    return out;
  }
}

const orUndef = (s) => (String(s ?? "").trim() === "" ? undefined : String(s).trim());

export function toPayload(v, extras) {
  const existing = v.clientMode === "existing" && v.client;
  const clientFields = {
    firstName: orUndef(v.firstName),
    lastName: orUndef(v.lastName),
    displayName: orUndef(v.displayName),
    instagram: orUndef(v.instagram),
    heardFrom: v.heardFrom || null,
    clientPrivateNotes: v.clientPrivateNotes.trim(),
  };
  return {
    ...(existing ? { clientId: v.client.id } : { email: v.email.trim(), phone: v.phone.trim() }),
    ...clientFields,
    serviceId: Number(v.serviceId),
    packageId: Number(v.packageId),
    extras: extras
      .filter((e) => (v.extraQty[e.id] ?? 0) > 0)
      .map((e) => ({ extraId: e.id, quantity: v.extraQty[e.id] })),
    partySize: v.partySize || null,
    schoolAndColors: orUndef(v.schoolAndColors),
    startsAt: studioInputToISO(v.date, v.time),
    locationKind: v.locationKind,
    locationName: v.locationName.trim(),
    locationAddress: orUndef(v.locationAddress),
    travelFeeCents: dollarsToCents(v.travelFee) ?? 0,
    clientNotes: orUndef(v.clientNotes),
    inspo: orUndef(v.inspo),
    photosNeededBy: v.photosNeededBy || null,
    sharePermission: v.sharePermission || null,
    doNotPostNotes: v.sharePermission === "PARTIAL" ? orUndef(v.doNotPostNotes) : undefined,
    minorConsent: v.minorConsent,
    policyAccepted: v.policyAccepted,
    adjustmentCents: dollarsToCents(v.adjustment, { allowNegative: true }) ?? 0,
    privateNotes: orUndef(v.privateNotes),
    payment: v.payMode === "NONE" ? { mode: "NONE" } : { mode: v.payMode, method: v.payMethod },
  };
}
