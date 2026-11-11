// yup schemas for the public /book API (docs/api-public-booking.md). Anyone on the internet can call
// these, so bodies reject unknown fields, every text has a length cap, and nothing about money is
// accepted: the server prices the request from the catalog.
// Same rules as Frontend/src/views/book/schema.ts — change both together.
import * as yup from 'yup';
import { DateTime } from 'luxon';
import { parsePhone } from '../utils/phone.js';
import { STUDIO_ZONE } from '../utils/date.js';
import { MAX_EXTRA_QUANTITY, parseInstant } from './booking.schemas.js';

export const PUBLIC_LANGS = ['en', 'es'];
const HEARD_FROM = ['INSTAGRAM', 'FRIEND', 'GOOGLE', 'TIKTOK', 'RETURNING_CLIENT', 'OTHER'];
const PARTY_SIZES = ['JUST_ME', 'TWO', 'THREE_TO_FIVE', 'SIX_TO_EIGHT'];
const SHARE_PERMISSIONS = ['YES', 'PARTIAL', 'NO'];
// "Somewhere else" is OTHER with a place typed; the three cards are PRESET (park), CAMPUS and STUDIO.
const LOCATION_KINDS = ['PRESET', 'CAMPUS', 'STUDIO', 'OTHER'];

const body = (shape) => yup.object(shape).noUnknown(true, 'Unknown field: ${unknown}');
// Not strict: trim/lowercase must run (strict mode would reject "  Ana" instead of cleaning it).
const text = (max, label) => yup.string().trim().max(max, `${label} is too long`);
const id = (label) => yup.number().strict().typeError(`Invalid ${label}`).integer(`Invalid ${label}`).positive(`Invalid ${label}`);
const oneOf = (values, label) => yup.string().strict().oneOf(values, `${label} must be one of: ${values.join(', ')}`);

export const availabilityQuery = yup.object({
  month: yup
    .string()
    .required('month is required')
    .test('month', 'month must look like 2026-10', (v) => /^\d{4}-\d{2}$/.test(v ?? '') && DateTime.fromFormat(v, 'yyyy-MM').isValid),
  // Length of the session being chosen (package + extras), only to grey out times it wouldn't fit.
  // The POST recomputes it from the catalog.
  minutes: yup.number().transform((v, o) => (o === '' || o === undefined ? undefined : v)).typeError('Invalid minutes').integer('Invalid minutes').min(15).max(720).default(120),
});

export const publicBookingBody = body({
  lang: oneOf(PUBLIC_LANGS, 'lang').default('en'),
  // Honeypot: a field people never see. Bots that fill every input fill this one.
  website: yup.string().strict().max(200).default(''),

  // 1 · Session
  serviceId: id('serviceId').required('Choose a session'),
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
    .max(10, 'Too many extras')
    .default([]),

  // 2 · Date (a studio-time instant; it must be one of the offered times — checked in the model)
  startsAt: yup
    .string()
    .strict()
    .required('Choose a date and time')
    .test('iso', 'Choose a valid date and time', (v) => Boolean(parseInstant(v))),

  // 3 · Location
  locationKind: oneOf(LOCATION_KINDS, 'locationKind').required('Choose a location'),
  // Typed for CAMPUS ("ASU Tempe") and OTHER ("my grandparents’ ranch"); the park and the studio get
  // their name from the server (PUBLIC_LOCATIONS in models/public-booking.model.js).
  locationName: text(160, 'Place').nullable(),

  // 4 · Your details
  firstName: text(80, 'First name').required('Enter your first name'),
  lastName: text(80, 'Last name').required('Enter your last name'),
  email: text(190, 'Email').lowercase().email('Enter a valid email').required('Enter your email'),
  phone: text(40, 'Phone')
    .required('Enter your phone number')
    .test('phone', 'Enter a valid phone number', (v) => Boolean(parsePhone(v))),
  partySize: oneOf(PARTY_SIZES, 'partySize').nullable(),
  heardFrom: oneOf(HEARD_FROM, 'heardFrom').nullable(),
  schoolAndColors: text(200, 'School & colors').nullable(),
  photosNeededBy: yup
    .string()
    .strict()
    .nullable()
    .test('day', 'Enter a valid date', (v) => v == null || v === '' || (/^\d{4}-\d{2}-\d{2}$/.test(v) && DateTime.fromISO(v, { zone: STUDIO_ZONE }).isValid)),
  inspo: text(1000, 'Inspo').nullable(),
  sharePermission: oneOf(SHARE_PERMISSIONS, 'sharePermission').nullable(),
  doNotPostNotes: text(500, 'Anything you don’t want posted').nullable(),
  clientNotes: text(2000, 'Notes').nullable(),
  minorConsent: yup.boolean().strict().default(false),

  // 5 · Review
  policyAccepted: yup.boolean().strict().oneOf([true], 'Please accept the booking policy').required('Please accept the booking policy'),
});
