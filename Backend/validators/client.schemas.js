// yup schemas for the Clients API (docs/api-clients.md). Same conventions as booking.schemas.js:
// bodies reject unknown fields; "" in a query string means "not given".
import * as yup from 'yup';
import { CLIENT_LOGINS, CLIENT_SORTS, CLIENT_TABS } from '../services/client-derive.js';

export { rebookBody as reminderBody } from './booking.schemas.js';

const HEARD_FROM = ['INSTAGRAM', 'FRIEND', 'GOOGLE', 'TIKTOK', 'RETURNING_CLIENT', 'OTHER'];


const body = (shape) => yup.object(shape).noUnknown(true, 'Unknown field: ${unknown}');
const emptyToUndefined = (value, original) => (original === '' ? undefined : value);
const text = (max, label) => yup.string().trim().max(max, `${label} is too long`);

export const clientListQuery = yup.object({
  tab: yup.string().transform(emptyToUndefined).oneOf(CLIENT_TABS, `tab must be one of: ${CLIENT_TABS.join(', ')}`).default('all'),
  q: yup.string().trim().max(100, 'Search is too long'),
  heardFrom: yup.string().transform(emptyToUndefined).oneOf(HEARD_FROM, `heardFrom must be one of: ${HEARD_FROM.join(', ')}`),
  login: yup.string().transform(emptyToUndefined).oneOf(CLIENT_LOGINS, `login must be one of: ${CLIENT_LOGINS.join(', ')}`),
  page: yup.number().transform(emptyToUndefined).typeError('Invalid page').integer('Invalid page').min(1, 'Invalid page').default(1),
  // Values above 100 are capped in the model rather than rejected.
  pageSize: yup.number().transform(emptyToUndefined).typeError('Invalid pageSize').integer('Invalid pageSize').min(1, 'Invalid pageSize').default(25),
  // No sort = recent activity.
  sort: yup.string().transform(emptyToUndefined).oneOf(CLIENT_SORTS, `sort must be one of: ${CLIENT_SORTS.join(', ')}`),
  dir: yup.string().transform(emptyToUndefined).oneOf(['asc', 'desc'], 'dir must be asc or desc').default('asc'),
});

const fields = {
  firstName: text(80, 'First name'),
  lastName: text(80, 'Last name').nullable(),
  displayName: text(120, 'Name'),
  email: text(190, 'Email').email('Enter a valid email'),
  phone: text(40, 'Phone').nullable(),
  instagram: text(80, 'Instagram').nullable(),
  heardFrom: yup.string().strict().oneOf([...HEARD_FROM, null], `heardFrom must be one of: ${HEARD_FROM.join(', ')}`).nullable(),
  privateNotes: text(5000, 'Notes').nullable(),
};

export const createClientBody = body({
  ...fields,
  firstName: fields.firstName.required('First name is required'),
  email: fields.email.required('Email is required'),
});

// Every field optional: send only what changed.
export const updateClientBody = body({
  ...fields,
  firstName: fields.firstName.min(1, 'First name is required'),
  email: fields.email.min(1, 'Email is required'),
  displayName: fields.displayName.min(1, 'Name is required'),
});
