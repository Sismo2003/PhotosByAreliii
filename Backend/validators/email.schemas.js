// Bodies of /api/admin/email (docs/correos.md §3, §4, §6).
import * as yup from 'yup';
import { BLOCK_TYPES } from '../emails/layout.js';
import { LOCALES } from '../emails/catalog.js';

const email = (label) => yup.string().trim().lowercase().max(254).email(`Enter a valid ${label}`);

const smtp = yup.object({
  host: yup.string().trim().max(253).required('Enter the server name'),
  port: yup.number().typeError('The port is a number').integer().min(1).max(65535).required('Enter the port'),
  security: yup.string().oneOf(['ssl', 'starttls', 'none'], 'Choose SSL or STARTTLS').required(),
  user: email('mailbox address').required('Enter the mailbox address'),
  // Empty = keep the saved password.
  password: yup.string().max(500).default(''),
}).noUnknown();

export const settingsBody = yup.object({
  smtp: smtp.required(),
  from: yup.object({
    name: yup.string().trim().max(120).default(''),
    address: email('sender address').default(''),
  }).noUnknown().required(),
  replyTo: email('reply-to address').default(''),
  adminNotifyEmail: email('notification address').default(''),
  dailyLimit: yup.number().typeError('The daily limit is a number').integer().min(1, 'At least 1 a day').max(10000).required(),
  // Stored in StudioSettings, edited here because only the review emails use it.
  reviewUrl: yup.string().trim().max(500).url('The review link must start with https://').default(''),
}).noUnknown();

export const enabledBody = yup.object({ enabled: yup.boolean().required() }).noUnknown();

export const testConnectionBody = yup.object({ smtp: smtp.optional().default(undefined) }).noUnknown();

const block = yup.object({
  id: yup.string().max(64),
  type: yup.string().oneOf(BLOCK_TYPES).required(),
  text: yup.string().max(5000),
  label: yup.string().max(120),
  url: yup.string().max(2000),
  card: yup.string().max(40),
}).noUnknown();

export const contentBody = yup.object({
  content: yup.object({
    subject: yup.string().max(250).default(''),
    preheader: yup.string().max(250).default(''),
    blocks: yup.array().of(block).max(40, 'Keep it to 40 blocks').default([]),
  }).required(),
}).noUnknown();

export const testBody = contentBody.shape({ to: email('email address').required('Enter where to send the test') });

export const testAllBody = yup.object({
  locale: yup.string().oneOf(LOCALES).default('en'),
  to: email('email address').required('Enter where to send the tests'),
}).noUnknown();

export const outboxQuery = yup.object({
  status: yup.string().oneOf(['PENDING', 'SENDING', 'SENT', 'FAILED', 'CANCELLED', 'SKIPPED']),
  key: yup.string().max(80),
  q: yup.string().trim().max(120),
  page: yup.number().integer().min(1).default(1),
  pageSize: yup.number().integer().min(1).max(100).default(25),
});
