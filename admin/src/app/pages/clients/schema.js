// Validation of the Add client / Edit details forms (yup). The backend validates again.
import * as yup from "yup";

import { isValidPhone } from "utils/phone";

const schema = yup.object({
  firstName: yup.string().trim().required("First name is required"),
  displayName: yup.string().trim().required("Name is required"),
  email: yup.string().trim().required("Email is required").email("Enter a valid email"),
  phone: yup.string().trim().test("phone", "Enter a valid US phone number", (v) => isValidPhone(v)),
});

/** → { field: message } (empty when valid). */
export function validateClient(values) {
  try {
    schema.validateSync(values, { abortEarly: false });
    return {};
  } catch (err) {
    const errors = {};
    for (const e of err.inner ?? []) if (!errors[e.path]) errors[e.path] = e.message;
    return errors;
  }
}
