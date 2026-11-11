// The email catalog (docs/correos.md §2): every email the system can send, what it needs and how it
// may be switched off. One source for the backend (outbox, worker, publish checks) and the admin
// (GET /api/admin/email/templates sends it as is).
//
//   trigger  auto      — the app sends it after an action (Confirm, Cancel…)
//            manual    — Areli presses a button for it
//            scheduled — the hourly job queues it (deposit, prep, expiry reminders)
//   switch   on        — Areli can turn it off
//            warn      — she can, but she is told what happens first (`warning`)
//            locked    — never off, sent even when sending is paused (`lockedReason`)
//   wired    false while nothing in the app queues it yet (`pending` says what is missing)
//   vars     variable groups the template may use besides the ones every email gets (ALWAYS_VARS)
//   cards    the information boxes the editor offers for this email
//   required variables (or cards that contain them) an email can't be published without

export const GROUPS = [
  { key: 'booking', label: 'Bookings' },
  { key: 'followup', label: 'After the session' },
  { key: 'gallery', label: 'Galleries' },
  { key: 'account', label: 'Client account' },
  { key: 'admin', label: 'For you' },
  { key: 'support', label: 'For support' },
];

const SECURITY = 'Required for account security';
const SUPPORT = 'Required for support alerts';

export const CATALOG = [
  // ─── Bookings ──────────────────────────────────────────────────────
  {
    key: 'booking.request_received', group: 'booking', name: 'Request received', trigger: 'auto', switch: 'on',
    when: 'A client sends a request from the website.',
    vars: ['booking'], cards: ['session'], wired: true,
  },
  {
    key: 'booking.accepted_pay_deposit', group: 'booking', name: 'Accepted — pay the deposit', trigger: 'auto', switch: 'warn',
    when: 'You accept a request.',
    warning: 'Clients won’t get the deposit amount, the deadline or how to pay. You’ll have to send them yourself.',
    vars: ['booking', 'payment'], cards: ['session', 'deposit'], required: ['booking.deposit', 'booking.depositDue'], wired: true,
  },
  {
    key: 'booking.deposit_reminder', group: 'booking', name: 'Deposit reminder', trigger: 'scheduled', switch: 'on',
    when: '12 hours before the deposit is due, if it hasn’t been paid.',
    vars: ['booking', 'payment'], cards: ['session', 'deposit'], wired: true,
  },
  {
    key: 'booking.confirmed', group: 'booking', name: 'Booking confirmed', trigger: 'auto', switch: 'warn',
    when: 'The deposit is paid, or you create a confirmed booking.',
    warning: 'Clients won’t get their confirmation or the calendar invite.',
    vars: ['booking'], cards: ['session', 'balance'], attachesCalendar: true, wired: true,
  },
  {
    key: 'booking.prep_reminder', group: 'booking', name: 'Session reminder', trigger: 'scheduled', switch: 'on',
    when: '48 hours before the session.',
    vars: ['booking'], cards: ['session', 'balance'], wired: true,
  },
  {
    key: 'booking.rescheduled', group: 'booking', name: 'Rescheduled', trigger: 'auto', switch: 'on',
    when: 'You move a session to another date.',
    vars: ['booking'], cards: ['reschedule', 'session'], attachesCalendar: true, wired: true,
  },
  {
    key: 'booking.cancelled', group: 'booking', name: 'Cancelled', trigger: 'auto', switch: 'on',
    when: 'You cancel a booking (not for no-shows).',
    vars: ['booking'], cards: ['session'], wired: true,
  },
  {
    key: 'booking.declined', group: 'booking', name: 'Request declined', trigger: 'auto', switch: 'on',
    when: 'You decline a request.',
    vars: ['booking'], cards: [], wired: true,
  },
  {
    key: 'booking.expired', group: 'booking', name: 'Request expired', trigger: 'auto', switch: 'on',
    when: 'You mark a booking as expired (no deposit).',
    vars: ['booking'], cards: [], wired: true,
  },

  // ─── After the session ─────────────────────────────────────────────
  {
    key: 'followup.thanks', group: 'followup', name: 'Thank you', trigger: 'manual', switch: 'on',
    when: 'You press “Send thank-you” on a booking.',
    vars: ['booking'], cards: [], wired: true,
  },
  {
    key: 'followup.review_request', group: 'followup', name: 'Ask for a review', trigger: 'manual', switch: 'on',
    when: 'You press “Ask for a review” on a booking.',
    vars: ['booking', 'review'], cards: [], required: ['review.url'], wired: true,
  },
  {
    key: 'followup.review_reminder', group: 'followup', name: 'Review reminder', trigger: 'manual', switch: 'on',
    when: 'A gentle second ask, at most once.',
    vars: ['booking', 'review'], cards: [], required: ['review.url'], wired: false, pending: 'No button sends it yet.',
  },

  // ─── Galleries ─────────────────────────────────────────────────────
  {
    key: 'gallery.delivered', group: 'gallery', name: 'Gallery ready', trigger: 'manual', switch: 'warn',
    when: 'You deliver a gallery.',
    warning: 'Clients won’t get the link, their sign-in or the PIN. You’ll have to send them yourself.',
    vars: ['gallery', 'login'], cards: ['gallery', 'login'], required: ['gallery.url'], wired: true,
  },
  {
    key: 'gallery.resent', group: 'gallery', name: 'Gallery sent again', trigger: 'manual', switch: 'on',
    when: 'You deliver a gallery that was already delivered.',
    vars: ['gallery'], cards: ['gallery'], required: ['gallery.url'], wired: true,
  },
  {
    key: 'gallery.extended', group: 'gallery', name: 'Gallery extended', trigger: 'auto', switch: 'on',
    when: 'You give a gallery more days.',
    vars: ['gallery'], cards: ['gallery'], wired: true,
  },
  {
    key: 'gallery.expiry_warning', group: 'gallery', name: 'Gallery closing soon', trigger: 'scheduled', switch: 'warn',
    when: '48 hours before the photos are deleted.',
    warning: 'Clients won’t be told before their photos are deleted.',
    vars: ['gallery'], cards: ['gallery'], required: ['gallery.url', 'gallery.deleteDate'], wired: true,
  },

  // ─── Client account ────────────────────────────────────────────────
  {
    key: 'account.invite', group: 'account', name: 'Account invite', trigger: 'manual', switch: 'warn',
    when: 'You create a login for a client.',
    warning: 'You’ll have to give the client their temporary password yourself.',
    vars: ['login'], cards: ['login'], required: ['login.email', 'login.tempPassword', 'login.url'], wired: false,
    pending: 'Starts with “Create login” on the client page.',
  },
  {
    key: 'account.password_reset', group: 'account', name: 'Reset password', trigger: 'auto', switch: 'locked', lockedReason: SECURITY,
    when: 'A client asks to reset their password.',
    vars: ['reset'], cards: [], required: ['reset.url'], wired: false, pending: 'Starts with “Forgot password” on the sign-in page.',
  },
  {
    key: 'account.password_changed', group: 'account', name: 'Password changed', trigger: 'auto', switch: 'locked', lockedReason: SECURITY,
    when: 'A client changes their password.',
    vars: [], cards: [], wired: true,
  },
  {
    key: 'account.email_changed', group: 'account', name: 'Sign-in email changed', trigger: 'auto', switch: 'locked', lockedReason: SECURITY,
    when: 'You change a client’s email. Goes to the old and the new address.',
    vars: ['change'], cards: [], wired: true,
  },

  // ─── For Areli ─────────────────────────────────────────────────────
  {
    key: 'admin.new_request', group: 'admin', name: 'New request', trigger: 'auto', switch: 'on', audience: 'admin',
    when: 'A request arrives from the website.',
    vars: ['booking'], cards: ['session'], wired: true,
  },
  {
    key: 'admin.daily_digest', group: 'admin', name: 'Daily summary', trigger: 'scheduled', switch: 'on', audience: 'admin',
    when: 'Every morning at 7:00, only when there is something to tell.',
    vars: ['digest'], cards: [], wired: false, pending: 'Waiting on a decision (docs/correos.md §12).',
  },
  {
    key: 'admin.email_bounced', group: 'admin', name: 'Email bounced', trigger: 'auto', switch: 'on', audience: 'admin',
    when: 'A client’s address rejects an email.',
    vars: ['bounce'], cards: [], wired: false, pending: 'Starts with the Mail inbox (phase 2).',
  },

  // ─── For support ───────────────────────────────────────────────────
  {
    key: 'support.storage_level', group: 'support', name: 'Disk almost full', trigger: 'auto', switch: 'locked', lockedReason: SUPPORT, audience: 'support',
    when: 'The photo disk is nearly full.',
    vars: ['storage'], cards: [], wired: false, pending: 'Starts with the storage alerts (docs/almacenamiento-fotos.md §8).',
  },
  {
    key: 'support.email_failures', group: 'support', name: 'Emails failing', trigger: 'auto', switch: 'locked', lockedReason: SUPPORT, audience: 'support',
    when: 'An email gives up after every retry (at most once an hour).',
    vars: ['failure'], cards: [], wired: true,
  },
].map((e) => ({ audience: 'client', required: [], attachesCalendar: false, ...e }));

export const CATALOG_BY_KEY = Object.fromEntries(CATALOG.map((e) => [e.key, e]));
export const LOCALES = ['en', 'es'];

export const isLocked = (key) => CATALOG_BY_KEY[key]?.switch === 'locked';

// Every email can use these.
export const ALWAYS_VARS = ['client', 'business'];

// What the editor shows for each variable: a label and the group it belongs to. Values come from
// emails/context.js (real sends) and emails/fixtures.js (previews and tests).
export const VARIABLES = {
  client: [
    ['client.firstName', 'First name'],
    ['client.displayName', 'Client name'],
  ],
  business: [
    ['business.name', 'Business name'],
    ['business.owner', 'Your name'],
    ['business.phone', 'Phone'],
    ['business.instagram', 'Instagram'],
    ['business.email', 'Email'],
  ],
  booking: [
    ['booking.code', 'Booking code'],
    ['booking.service', 'Service'],
    ['booking.date', 'Date'],
    ['booking.time', 'Time'],
    ['booking.location', 'Location'],
    ['booking.total', 'Total'],
    ['booking.deposit', 'Deposit'],
    ['booking.depositDue', 'Deposit due'],
    ['booking.balance', 'Balance'],
    ['booking.previousDate', 'Previous date'],
    ['booking.reason', 'Reason'],
    ['booking.portalUrl', 'Booking link'],
  ],
  payment: [
    ['payment.zelle', 'Zelle'],
    ['payment.cashApp', 'Cash App'],
  ],
  gallery: [
    ['gallery.title', 'Gallery name'],
    ['gallery.url', 'Gallery link'],
    ['gallery.pin', 'Download PIN'],
    ['gallery.password', 'Gallery password'],
    ['gallery.availableUntil', 'Available until'],
    ['gallery.deleteDate', 'Photos deleted on'],
    ['gallery.photoCount', 'Number of photos'],
    ['gallery.message', 'Your personal message'],
  ],
  login: [
    ['login.email', 'Sign-in email'],
    ['login.tempPassword', 'Temporary password'],
    ['login.url', 'Sign-in link'],
  ],
  reset: [
    ['reset.url', 'Reset link'],
    ['reset.expiresIn', 'Link valid for'],
  ],
  review: [['review.url', 'Review link']],
  change: [
    ['change.oldEmail', 'Old email'],
    ['change.newEmail', 'New email'],
  ],
  digest: [['digest.summary', 'Summary']],
  bounce: [
    ['bounce.email', 'Address'],
    ['bounce.reason', 'Reason'],
  ],
  storage: [
    ['storage.level', 'Level'],
    ['storage.free', 'Free space'],
  ],
  failure: [
    ['failure.count', 'Failed emails'],
    ['failure.lastError', 'Last error'],
    ['failure.adminUrl', 'Admin link'],
  ],
};

// Information boxes. `vars` = what the box shows (it also counts for `required`); the rows are
// drawn by emails/layout.js. `label` is for the editor.
export const CARDS = {
  session: { label: 'Session details', vars: ['booking.service', 'booking.date', 'booking.time', 'booking.location', 'booking.total'] },
  deposit: { label: 'Deposit and how to pay', vars: ['booking.deposit', 'booking.depositDue', 'payment.zelle', 'payment.cashApp'] },
  balance: { label: 'Balance', vars: ['booking.balance'] },
  reschedule: { label: 'Old and new date', vars: ['booking.previousDate', 'booking.date', 'booking.time'] },
  gallery: { label: 'Gallery link and PIN', vars: ['gallery.url', 'gallery.pin', 'gallery.availableUntil'] },
  login: { label: 'Sign-in details', vars: ['login.email', 'login.tempPassword', 'login.url'] },
};

/** Variable names an email may use (its own groups + the always-available ones). */
export function allowedVariables(key) {
  const entry = CATALOG_BY_KEY[key];
  if (!entry) return [];
  return [...ALWAYS_VARS, ...entry.vars].flatMap((group) => (VARIABLES[group] ?? []).map(([name]) => name));
}
