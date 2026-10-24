// yup schemas for the Bookings API (docs/api-bookings.md). Bodies reject unknown fields and
// never coerce money: "8750" or 87.5 as amountCents is a 400, not a guess.
import * as yup from 'yup';
import { DateTime } from 'luxon';
import { STUDIO_ZONE } from '../utils/date.js';
import { TABS } from '../services/booking-derive.js';

export const CANCEL_REASONS = ['CLIENT_REQUEST', 'WEATHER', 'PHOTOGRAPHER_UNAVAILABLE', 'NO_DEPOSIT', 'NO_SHOW'];
export const REBOOK_KINDS = [
  'SIX_MONTHS_FAMILY',
  'ONE_YEAR_ANNIVERSARY_BIRTHDAY',
  'NEXT_SPRING_GRADUATION',
  'NEWBORN',
  'CUSTOM',
];
const PAYMENT_KINDS = ['DEPOSIT', 'BALANCE']; // REFUND only comes from cancel
const PAYMENT_METHODS = ['ZELLE', 'CASH_APP', 'CASH'];

export const MAX_NOTE = 500;
export const MAX_LABEL = 120;
const MAX_CENTS = 10_000_000; // $100,000 — far above any session, keeps Int safe

const body = (shape) => yup.object(shape).noUnknown(true, 'Unknown field: ${unknown}');
// Query strings are text; "" means "not given".
const emptyToUndefined = (value, original) => (original === '' ? undefined : value);

const oneOf = (values, label) =>
  yup
    .string()
    .strict()
    .oneOf(values, `${label} must be one of: ${values.join(', ')}`);

/** An ISO instant with a time. Without an offset it is read as Phoenix time. */
export const parseInstant = (text) => {
  if (typeof text !== 'string' || !text.includes('T')) return null;
  const dt = DateTime.fromISO(text, { zone: STUDIO_ZONE });
  return dt.isValid ? dt : null;
};

const isDay = (text) =>
  typeof text === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(text) && DateTime.fromISO(text, { zone: STUDIO_ZONE }).isValid;

/** Columns the list can be sorted by (GET /?tab=&sort=&dir=). */
export const LIST_SORTS = ['date', 'client', 'service', 'total'];

// ─── Queries ───────────────────────────────────────────────────────────

export const listQuery = yup.object({
  tab: yup.string().required('tab is required').oneOf(TABS, `tab must be one of: ${TABS.join(', ')}`),
  q: yup.string().trim().max(100, 'Search is too long'),
  serviceId: yup.number().transform(emptyToUndefined).typeError('Invalid serviceId').integer('Invalid serviceId').positive('Invalid serviceId'),
  page: yup.number().transform(emptyToUndefined).typeError('Invalid page').integer('Invalid page').min(1, 'Invalid page').default(1),
  // Values above 100 are capped in the model rather than rejected.
  pageSize: yup.number().transform(emptyToUndefined).typeError('Invalid pageSize').integer('Invalid pageSize').min(1, 'Invalid pageSize').default(25),
  // Optional column sort; without it each tab keeps its own default order (tabOrderBy).
  sort: yup.string().transform(emptyToUndefined).oneOf(LIST_SORTS, `sort must be one of: ${LIST_SORTS.join(', ')}`),
  dir: yup.string().transform(emptyToUndefined).oneOf(['asc', 'desc'], 'dir must be asc or desc').default('asc'),
});

export const calendarQuery = yup.object({
  month: yup
    .string()
    .required('month is required')
    .test('month', 'month must look like 2026-10', (v) => /^\d{4}-\d{2}$/.test(v ?? '') && DateTime.fromFormat(v, 'yyyy-MM').isValid),
});

// ─── Action bodies ─────────────────────────────────────────────────────

export const paymentBody = body({
  kind: oneOf(PAYMENT_KINDS, 'kind').required('kind is required'),
  method: oneOf(PAYMENT_METHODS, 'method').required('method is required'),
  amountCents: yup
    .number()
    .strict()
    .typeError('amountCents must be a whole number of cents')
    .required('amountCents is required')
    .integer('amountCents must be a whole number of cents')
    .positive('amountCents must be more than 0')
    .max(MAX_CENTS, 'amountCents is too large'),
  note: yup.string().trim().max(MAX_NOTE, `Keep the note under ${MAX_NOTE} characters`).nullable(),
  // The admin confirmed by hand that more than the balance was received (tip, extra person…).
  allowOverpay: yup.boolean().strict().typeError('allowOverpay must be true or false'),
});

export const rescheduleBody = body({
  startsAt: yup
    .string()
    .strict()
    .typeError('startsAt must be an ISO date and time')
    .required('startsAt is required')
    .test('iso', 'startsAt must be an ISO date and time', (v) => Boolean(parseInstant(v)))
    .test('future', 'The new date must be in the future', (v) => {
      const dt = parseInstant(v);
      return !dt || dt > DateTime.utc();
    }),
});

export const cancelBody = body({
  reason: oneOf(CANCEL_REASONS, 'reason').required('reason is required'),
  deposit: oneOf(['keep', 'refund'], 'deposit').required('deposit is required'),
});

export const emptyBody = body({});

export const rebookBody = body({
  kind: yup
    .string()
    .strict()
    .nullable()
    .defined('kind is required (null clears the reminder)')
    .oneOf([...REBOOK_KINDS, null], `kind must be one of: ${REBOOK_KINDS.join(', ')} or null`),
  dueOn: yup
    .string()
    .strict()
    .nullable()
    .test('day', 'dueOn must look like 2026-10-16', (v) => v == null || isDay(v)),
  label: yup.string().trim().max(MAX_LABEL, `Keep the label under ${MAX_LABEL} characters`).nullable(),
}).test('needs-due', 'dueOn is required for this kind', (v) => !['NEWBORN', 'CUSTOM'].includes(v?.kind) || Boolean(v?.dueOn));

// ─── Manual booking (POST /) ───────────────────────────────────────────

const HEARD_FROM = ['INSTAGRAM', 'FRIEND', 'GOOGLE', 'TIKTOK', 'RETURNING_CLIENT', 'OTHER'];
const PARTY_SIZES = ['JUST_ME', 'TWO', 'THREE_TO_FIVE', 'SIX_TO_EIGHT'];
const LOCATION_KINDS = ['PRESET', 'CAMPUS', 'STUDIO', 'OTHER'];
const SHARE_PERMISSIONS = ['YES', 'PARTIAL', 'NO'];
export const MAX_EXTRA_QUANTITY = 10; // outfit changes etc. — same cap on the public form

const text = (max, label) => yup.string().trim().max(max, `${label} is too long`);
const cents = (label) =>
  yup.number().strict().typeError(`${label} must be whole cents`).integer(`${label} must be whole cents`).min(-MAX_CENTS).max(MAX_CENTS);
const id = (label) => yup.number().strict().typeError(`Invalid ${label}`).integer(`Invalid ${label}`).positive(`Invalid ${label}`);

export const clientSearchQuery = yup.object({ q: yup.string().trim().max(100).default('') });
export const clientLookupQuery = yup.object({
  email: yup.string().trim().max(190).default(''),
  phone: yup.string().trim().max(40).default(''),
});

/**
 * Body of POST /api/admin/bookings — one form creates the client (or reuses the existing one)
 * and the booking. Prices are never taken from the body: the server reads package, extras and
 * studio settings, and recomputes total / deposit (the form's summary is only a preview).
 */
export const createBookingBody = body({
  // Client — `clientId` = existing client picked from search; otherwise matched by email/phone.
  clientId: id('clientId'),
  firstName: text(80, 'First name'),
  lastName: text(80, 'Last name'),
  displayName: text(120, 'Display name'),
  email: text(190, 'Email').email('Enter a valid email'),
  phone: text(40, 'Phone'),
  instagram: text(80, 'Instagram'),
  heardFrom: oneOf(HEARD_FROM, 'heardFrom').nullable(),
  clientPrivateNotes: text(2000, 'Client notes'),

  // Session
  serviceId: id('serviceId').required('Choose a service'),
  packageId: id('packageId').required('Choose a package'),
  extras: yup
    .array()
    .of(
      yup
        .object({
          extraId: id('extraId').required(),
          quantity: yup.number().strict().integer().min(1).max(MAX_EXTRA_QUANTITY, `At most ${MAX_EXTRA_QUANTITY} of each extra`).required(),
        })
        .noUnknown(true),
    )
    .default([]),
  partySize: oneOf(PARTY_SIZES, 'partySize').nullable(),
  schoolAndColors: text(200, 'School & colors'),

  // When and where
  startsAt: yup.string().strict().required('Choose a date and time'),
  locationKind: oneOf(LOCATION_KINDS, 'locationKind').required('Choose a location type'),
  locationName: text(160, 'Place').required('Where is the session?'),
  locationAddress: text(255, 'Address'),
  travelFeeCents: cents('Travel fee').min(0).default(0),

  // Details
  clientNotes: text(2000, 'Notes'),
  inspo: text(2000, 'Inspo'),
  photosNeededBy: yup.string().strict().matches(/^\d{4}-\d{2}-\d{2}$/, 'Date must look like 2026-11-20').nullable(),
  sharePermission: oneOf(SHARE_PERMISSIONS, 'sharePermission').nullable(),
  doNotPostNotes: text(2000, 'Do-not-post notes'),
  minorConsent: yup.boolean().strict().default(false),
  policyAccepted: yup.boolean().strict().oneOf([true], 'The client has to accept the policy').required(),

  // Price & payment (admin only)
  adjustmentCents: cents('Adjustment').default(0),
  privateNotes: text(2000, 'Private notes'),
  payment: yup
    .object({
      mode: oneOf(['NONE', 'DEPOSIT', 'FULL'], 'payment.mode').required(),
      method: oneOf(PAYMENT_METHODS, 'payment.method').when('mode', {
        is: (m) => m && m !== 'NONE',
        then: (s) => s.required('How was it paid?'),
      }),
    })
    .noUnknown(true)
    .default({ mode: 'NONE' }),
});
