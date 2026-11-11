// What each step needs before "Continue" (yup in the browser; the API checks the same rules again in
// Backend/validators/public-booking.schemas.js — change both together). Messages are i18n keys
// under book.errors.
import * as yup from "yup";
import { DateTime } from "luxon";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { STUDIO_ZONE } from "../../utils/date";

export type FieldErrors = Record<string, string>;

const LOCATION_TYPED = ["CAMPUS", "OTHER"];

const isPhone = (v?: string | null) => Boolean(v && parsePhoneNumberFromString(v, "US")?.isValid());

const today = () => DateTime.now().setZone(STUDIO_ZONE).startOf("day");

const step1 = yup.object({
  serviceId: yup.number().nullable().required("session"),
  packageId: yup.number().nullable().required("package"),
});

const step2 = yup.object({
  date: yup.string().nullable().required("date"),
  // Only one message at a time: "choose a day and a time" under the calendar.
  time: yup.string().nullable().when("date", { is: (d: string | null) => Boolean(d), then: (x) => x.required("date") }),
});

const step3 = yup.object({
  locationKind: yup.string().nullable().required("place"),
  place: yup
    .string()
    .trim()
    .max(160, "tooLong")
    .when("locationKind", { is: (k: string) => LOCATION_TYPED.includes(k), then: (s) => s.required("place") }),
});

const step4 = yup.object({
  firstName: yup.string().trim().required("firstName").max(80, "tooLong"),
  lastName: yup.string().trim().required("lastName").max(80, "tooLong"),
  email: yup.string().trim().required("email").max(190, "tooLong").email("email"),
  phone: yup.string().trim().required("phone").max(40, "tooLong").test("phone", "phone", isPhone),
  schoolAndColors: yup.string().nullable().trim().max(200, "tooLong"),
  photosNeededBy: yup
    .string()
    .nullable()
    .test("future", "photosBy", (v) => !v || (DateTime.fromISO(v, { zone: STUDIO_ZONE }).isValid && DateTime.fromISO(v, { zone: STUDIO_ZONE }) >= today())),
  inspo: yup.string().nullable().trim().max(1000, "tooLong"),
  doNotPostNotes: yup.string().nullable().trim().max(500, "tooLong"),
  clientNotes: yup.string().nullable().trim().max(2000, "tooLong"),
});

const step5 = yup.object({ policyAccepted: yup.boolean().oneOf([true], "policy") });

const STEPS = [step1, step2, step3, step4, step5];

/** Errors of one step (1–5) as { field: i18nKey }; empty when it can continue. */
export function validateStep(step: number, values: Record<string, unknown>): FieldErrors {
  const schema = STEPS[step - 1];
  try {
    schema.validateSync(values, { abortEarly: false });
    return {};
  } catch (error) {
    if (!(error instanceof yup.ValidationError)) throw error;
    const out: FieldErrors = {};
    for (const e of error.inner.length ? error.inner : [error]) {
      if (e.path && !out[e.path]) out[e.path] = String(e.message);
    }
    return out;
  }
}
