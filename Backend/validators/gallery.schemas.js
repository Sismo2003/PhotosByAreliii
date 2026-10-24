// yup schemas for the Galleries API (docs/api-galleries.md). Bodies reject unknown fields.
import * as yup from 'yup';

export const GALLERY_TABS = ['all', 'draft', 'delivered', 'expired'];
export const GALLERY_SORTS = ['newest', 'oldest', 'size', 'title'];
const COVER_LAYOUTS = ['FULL', 'SPLIT', 'MINIMAL'];
const DOWNLOAD_MODES = ['HIGH_AND_WEB', 'WEB_ONLY', 'OFF'];
const PRIVACY = ['CLIENT_LOGIN', 'PASSWORD', 'PUBLIC_LINK'];
export const BULK_ACTIONS = ['move', 'hide', 'show', 'delete', 'pick', 'unpick'];

const body = (shape) => yup.object(shape).noUnknown(true, 'Unknown field: ${unknown}');
const emptyToUndefined = (value, original) => (original === '' ? undefined : value);
const id = (label) => yup.number().strict().typeError(`Invalid ${label}`).integer(`Invalid ${label}`).positive(`Invalid ${label}`);
const oneOf = (values, label) => yup.string().strict().oneOf(values, `${label} must be one of: ${values.join(', ')}`);
const text = (max, label) => yup.string().trim().max(max, `${label} is too long`);

export const galleryListQuery = yup.object({
  tab: yup.string().transform(emptyToUndefined).oneOf(GALLERY_TABS, `tab must be one of: ${GALLERY_TABS.join(', ')}`).default('all'),
  q: yup.string().trim().max(100, 'Search is too long'),
  sort: yup.string().transform(emptyToUndefined).oneOf(GALLERY_SORTS, `sort must be one of: ${GALLERY_SORTS.join(', ')}`).default('newest'),
  page: yup.number().transform(emptyToUndefined).typeError('Invalid page').integer('Invalid page').min(1, 'Invalid page').default(1),
  pageSize: yup.number().transform(emptyToUndefined).typeError('Invalid pageSize').integer('Invalid pageSize').min(1, 'Invalid pageSize').default(25),
});

export const createGalleryBody = body({
  clientId: id('clientId').required('Pick a client'),
  bookingId: id('bookingId'),
  title: text(160, 'Gallery name'),
  sets: yup.array().of(text(60, 'Set name').min(1, 'Set names can’t be empty')).max(20, 'Too many sets'),
});

export const updateGalleryBody = body({
  title: text(160, 'Gallery name').min(1, 'Gallery name is required'),
  coverLayout: oneOf(COVER_LAYOUTS, 'coverLayout'),
  downloadMode: oneOf(DOWNLOAD_MODES, 'downloadMode'),
  pinRequired: yup.boolean().strict(),
  newPin: yup.boolean().strict(), // "Create a new download PIN"
  privacy: oneOf(PRIVACY, 'privacy'),
  accessPassword: text(80, 'Password').min(4, 'The password needs at least 4 characters'),
  favoritesEnabled: yup.boolean().strict(),
  favoritesLimit: yup.number().strict().integer().positive().max(10000).nullable(), // null = no limit
  watermark: yup.boolean().strict(),
  socialSharing: yup.boolean().strict(),
  expiresOn: yup.string().strict().test('day', 'expiresOn must look like 2026-12-31', (v) => v == null || /^\d{4}-\d{2}-\d{2}$/.test(v)),
});

export const setBody = body({ name: text(60, 'Set name').min(1, 'Set name is required').required('Set name is required') });
export const updateSetBody = body({
  name: text(60, 'Set name').min(1, 'Set name is required'),
  position: yup.number().strict().integer().min(0),
});

export const bulkBody = body({
  action: oneOf(BULK_ACTIONS, 'action').required('action is required'),
  photoIds: yup.array().of(id('photo id').required()).min(1, 'Select at least one photo').max(1000).required('Select at least one photo'),
  setId: id('setId').nullable(), // for "move": null = no set
}).test('move-needs-set', 'setId is required to move photos (null = no set)', (v) => v?.action !== 'move' || v.setId !== undefined);

export const coverBody = body({ photoId: id('photoId').nullable().defined('photoId is required (null clears the cover)') });

export const deliverBody = body({
  to: text(190, 'To').email('Enter a valid email'),
  subject: text(200, 'Subject'),
  message: text(5000, 'Message'),
  newPin: yup.boolean().strict(),
});

export const extendBody = body({ days: yup.number().strict().integer().min(1).max(365).default(30) });

export const storageCheckBody = body({
  bytes: yup.number().strict().min(0).required('bytes is required'),
  count: yup.number().strict().integer().min(0),
});

const fraction = (label) => yup.number().strict().typeError(`Invalid ${label}`).min(0, `Invalid ${label}`).max(1, `Invalid ${label}`);
const pixels = (label) => yup.number().strict().typeError(`Invalid ${label}`).integer(`Invalid ${label}`).min(1, `Invalid ${label}`).max(20000, `Invalid ${label}`);

// Focus point set by hand: fractions of the photo as displayed. { reset: true } recomputes it.
export const photoFocusBody = body({
  x: fraction('x').when('reset', { is: true, then: (s) => s.strip(), otherwise: (s) => s.required('x is required') }),
  y: fraction('y').when('reset', { is: true, then: (s) => s.strip(), otherwise: (s) => s.required('y is required') }),
  reset: yup.boolean().strict().default(false),
});

// Edits replace the original (admin only). Crop is in fractions (0–1) of the image after rotating.
export const editPhotoBody = body({
  rotate: yup.number().strict().integer().oneOf([-270, -180, -90, 0, 90, 180, 270], 'rotate must be a multiple of 90').default(0),
  straighten: yup.number().strict().min(-15, 'straighten goes from -15 to 15').max(15, 'straighten goes from -15 to 15').default(0),
  flipH: yup.boolean().strict().default(false),
  flipV: yup.boolean().strict().default(false),
  crop: yup
    .object({ x: fraction('crop x').required(), y: fraction('crop y').required(), width: fraction('crop width').min(0.01).required(), height: fraction('crop height').min(0.01).required() })
    .noUnknown(true)
    .nullable()
    .default(null)
    .test('inside', 'The crop is outside the photo', (c) => !c || (c.x + c.width <= 1.0001 && c.y + c.height <= 1.0001)),
  resize: yup.object({ width: pixels('width').required(), height: pixels('height').required() }).noUnknown(true).nullable().default(null),
}).test('something', 'Nothing to change', (v) => !!v && (v.rotate !== 0 || v.straighten !== 0 || v.flipH || v.flipV || v.crop || v.resize));
