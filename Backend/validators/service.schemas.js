// yup schemas for the Services and Add-ons API (docs/api-services.md). Same conventions as
// client.schemas.js: bodies reject unknown fields; "" in a query string means "not given".
import * as yup from 'yup';

export const SERVICE_STATUSES = ['LIVE', 'HIDDEN', 'DRAFT'];
export const SERVICE_SORTS = ['name', 'price', 'bookings'];
export const EXTRA_SORTS = ['name', 'price', 'bookings'];
export const MAX_PRICE_CENTS = 1_000_000; // $10,000
export const MAX_SESSION_MINUTES = 720;

const body = (shape) => yup.object(shape).noUnknown(true, 'Unknown field: ${unknown}');
const emptyToUndefined = (value, original) => (original === '' ? undefined : value);
const text = (max, label) => yup.string().trim().max(max, `${label} is too long`);
const int = (label) => yup.number().strict().typeError(`${label} must be a number`).integer(`${label} must be a whole number`);
const cents = (label) => int(label).min(0, `${label} can't be negative`).max(MAX_PRICE_CENTS, `${label} is too high`);
const ids = (label) =>
  yup
    .array()
    .of(int(label).min(1, `Invalid ${label}`))
    .strict()
    .required(`${label} is required`)
    .test('unique', `${label} has repeated values`, (v) => !v || new Set(v).size === v.length);

const page = {
  q: yup.string().trim().max(100, 'Search is too long'),
  page: yup.number().transform(emptyToUndefined).typeError('Invalid page').integer('Invalid page').min(1, 'Invalid page').default(1),
  // Values above 100 are capped in the model rather than rejected.
  pageSize: yup.number().transform(emptyToUndefined).typeError('Invalid pageSize').integer('Invalid pageSize').min(1, 'Invalid pageSize').default(25),
  dir: yup.string().transform(emptyToUndefined).oneOf(['asc', 'desc'], 'dir must be asc or desc').default('asc'),
};

export const serviceListQuery = yup.object({
  ...page,
  status: yup.string().transform(emptyToUndefined).oneOf(SERVICE_STATUSES, `status must be one of: ${SERVICE_STATUSES.join(', ')}`),
  // No sort = the admin's own order (position).
  sort: yup.string().transform(emptyToUndefined).oneOf(SERVICE_SORTS, `sort must be one of: ${SERVICE_SORTS.join(', ')}`),
});

export const extraListQuery = yup.object({
  ...page,
  active: yup.string().transform(emptyToUndefined).oneOf(['yes', 'no'], 'active must be yes or no'),
  serviceId: yup.number().transform(emptyToUndefined).typeError('Invalid serviceId').integer('Invalid serviceId').min(1, 'Invalid serviceId'),
  sort: yup.string().transform(emptyToUndefined).oneOf(EXTRA_SORTS, `sort must be one of: ${EXTRA_SORTS.join(', ')}`),
});

const serviceFields = {
  name: text(80, 'Name'),
  status: yup.string().strict().oneOf(SERVICE_STATUSES, `status must be one of: ${SERVICE_STATUSES.join(', ')}`),
};

export const createServiceBody = body({ ...serviceFields, name: serviceFields.name.required('Name is required') });
export const updateServiceBody = body({ ...serviceFields, name: serviceFields.name.min(1, 'Name is required') });

// Reorder: the full list of ids, in the new order.
export const orderBody = body({ ids: ids('ids').min(1, 'Nothing to order') });

const packageFields = {
  name: text(80, 'Name'),
  priceCents: cents('Price'),
  durationMinutes: int('Duration')
    .min(15, 'Duration is at least 15 minutes')
    .max(MAX_SESSION_MINUTES, 'Duration is too long')
    .test('step', 'Duration goes in steps of 5 minutes', (v) => v == null || v % 5 === 0),
  outfits: int('Outfits').min(0, 'Outfits can\'t be negative').max(20, 'Outfits is too high').nullable(),
  maxPeople: int('People').min(1, 'People is at least 1').max(200, 'People is too high').nullable(),
  sessionCount: int('Sessions').oneOf([1, 2], 'Sessions must be 1 or 2'),
  customDescription: text(300, 'Description').nullable(),
  isFeatured: yup.boolean().strict(),
  hidden: yup.boolean().strict(),
};

export const createPackageBody = body({
  ...packageFields,
  name: packageFields.name.required('Name is required'),
  priceCents: packageFields.priceCents.required('Price is required'),
  durationMinutes: packageFields.durationMinutes.required('Duration is required'),
});
export const updatePackageBody = body({ ...packageFields, name: packageFields.name.min(1, 'Name is required') });

export const serviceExtrasBody = body({ extraIds: ids('extraIds') });
export const extraServicesBody = body({ serviceIds: ids('serviceIds') });

const extraFields = {
  name: text(80, 'Name'),
  priceCents: cents('Price'),
  // Session time added per unit; 0 = the add-on doesn't change the session length.
  minutes: int('Minutes')
    .min(0, 'Minutes can\'t be negative')
    .max(MAX_SESSION_MINUTES, 'Minutes is too high')
    .test('step', 'Minutes go in steps of 5', (v) => v == null || v % 5 === 0),
  active: yup.boolean().strict(),
  serviceIds: ids('serviceIds'),
};

export const createExtraBody = body({
  ...extraFields,
  name: extraFields.name.required('Name is required'),
  priceCents: extraFields.priceCents.required('Price is required'),
  // Optional on create: an add-on can start off with no service and be assigned later.
  serviceIds: yup.array().of(int('serviceIds').min(1, 'Invalid serviceIds')).strict().default([]),
});
const { serviceIds: _omit, ...extraUpdateFields } = extraFields;
export const updateExtraBody = body({ ...extraUpdateFields, name: extraFields.name.min(1, 'Name is required') });
