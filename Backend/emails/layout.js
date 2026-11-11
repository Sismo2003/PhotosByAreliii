// The brand layout every email shares (docs/correos.md §4.1): logo, white page, EB Garamond with
// Georgia as fallback, black and white, signature and footer. Areli edits only the CONTENT —
// { subject, preheader, blocks } — so she can't break the design.
//
// Blocks
//   { type: 'heading', text }        big serif line
//   { type: 'text', text }           paragraph; blank lines split paragraphs, URLs become links
//   { type: 'button', label, url }   black button; url is usually a variable ({{ gallery.url }})
//   { type: 'card', card }           information box from CARDS (session, deposit, gallery…)
//   { type: 'note', text }           small grey print (policies)
//   { type: 'divider' }
//
// Areli's text is plain text: everything is HTML-escaped here, and the only template syntax kept
// is {{ group.name }} for the variables the email allows. The result is MJML with Liquid tags in
// it; render.js compiles it once and fills the variables per email (Liquid escapes them too).
import { CARDS } from './catalog.js';
import { appUrls, footerLinks } from './format.js';

export const BLOCK_TYPES = ['heading', 'text', 'button', 'card', 'note', 'divider'];

const C = { ink: '#151515', muted: '#6e6e6e', line: '#e7e5e1', paper: '#ffffff', page: '#f6f5f3' };
const FONT = "'EB Garamond', Georgia, 'Times New Roman', serif";

const VAR_RE = /\{\{\s*([a-zA-Z]+\.[a-zA-Z]+)\s*\}\}/g;

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Literal "{" is written as an entity so text like "{% x %}" can never become a Liquid tag.
const escapeLiteral = (s) => escapeHtml(s).replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');

const linkify = (escaped) =>
  escaped.replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (url) => `<a href="${url}" style="color:${C.ink}">${url}</a>`);

/** Plain text with {{ vars }} → safe HTML with Liquid output tags. */
export function richText(raw, { links = true } = {}) {
  const parts = String(raw ?? '').split(VAR_RE);
  // split() with one capture group alternates: text, varName, text, varName…
  return parts
    .map((part, i) => (i % 2 ? `{{ ${part} }}` : links ? linkify(escapeLiteral(part)) : escapeLiteral(part)))
    .join('')
    .replace(/\r?\n/g, '<br />');
}

/** Variable names written in a piece of text. */
export const varsIn = (raw) => [...String(raw ?? '').matchAll(VAR_RE)].map((m) => m[1]);

/** Every variable a content uses, counting what its cards show. */
export function usedVariables(content) {
  const used = new Set([...varsIn(content.subject), ...varsIn(content.preheader)]);
  for (const b of content.blocks ?? []) {
    for (const field of ['text', 'label', 'url']) varsIn(b[field]).forEach((v) => used.add(v));
    if (b.type === 'card') (CARDS[b.card]?.vars ?? []).forEach((v) => used.add(v));
  }
  return used;
}

// ─── Cards ─────────────────────────────────────────────────────────────

const L = {
  en: {
    session: 'Session', when: 'When', where: 'Where', total: 'Total', deposit: 'Deposit', due: 'Due by',
    zelle: 'Zelle', cashApp: 'Cash App', balance: 'Balance due at the session', was: 'Was', now: 'Now',
    gallery: 'Gallery', open: 'Open your gallery', until: 'Available until', pin: 'Download PIN',
    password: 'Gallery password', signIn: 'Sign in at', user: 'Email', temp: 'Temporary password',
    tempHint: 'You’ll choose your own password the first time you sign in.',
    signature: 'With love,',
  },
  es: {
    session: 'Sesión', when: 'Cuándo', where: 'Dónde', total: 'Total', deposit: 'Depósito', due: 'Antes de',
    zelle: 'Zelle', cashApp: 'Cash App', balance: 'Saldo a pagar en la sesión', was: 'Antes', now: 'Ahora',
    gallery: 'Galería', open: 'Abrir tu galería', until: 'Disponible hasta', pin: 'PIN de descarga',
    password: 'Contraseña de la galería', signIn: 'Inicia sesión en', user: 'Correo', temp: 'Contraseña temporal',
    tempHint: 'La primera vez que entres elegirás tu propia contraseña.',
    signature: 'Con cariño,',
  },
};

// A row shows only when its value is not blank (Zelle not set, no PIN…).
// Padding sits on the cells: Outlook ignores it on <table>.
const LEFT = `padding:7px 12px 7px 22px;color:${C.muted};font-size:14px;width:40%;vertical-align:top`;
const RIGHT = `padding:7px 22px 7px 0;color:${C.ink};font-size:16px;text-align:right;vertical-align:top`;
const tr = (label, valueHtml, rightExtra = '') => `<tr><td style="${LEFT}">${escapeHtml(label)}</td><td style="${RIGHT}${rightExtra}">${valueHtml}</td></tr>`;
const row = (label, value, { mono = false } = {}) =>
  `{% if ${value} != blank %}${tr(label, `{{ ${value} }}`, mono ? ';letter-spacing:2px;font-family:Menlo,Consolas,monospace' : '')}{% endif %}`;

function cardRows(card, t) {
  switch (card) {
    case 'session':
      return [
        row(t.session, 'booking.service'),
        tr(t.when, '{{ booking.date }}<br />{{ booking.time }}'),
        row(t.where, 'booking.location'),
        row(t.total, 'booking.total'),
      ];
    case 'deposit':
      return [row(t.deposit, 'booking.deposit'), row(t.due, 'booking.depositDue'), row(t.zelle, 'payment.zelle'), row(t.cashApp, 'payment.cashApp')];
    case 'balance':
      return [row(t.balance, 'booking.balance')];
    case 'reschedule':
      return [
        tr(t.was, '{{ booking.previousDate }}', `;color:${C.muted};text-decoration:line-through`),
        tr(t.now, '{{ booking.date }}<br />{{ booking.time }}'),
      ];
    case 'gallery':
      return [row(t.gallery, 'gallery.title'), row(t.until, 'gallery.availableUntil'), row(t.password, 'gallery.password', { mono: true }), row(t.pin, 'gallery.pin', { mono: true })];
    case 'login':
      return [row(t.signIn, 'login.url'), row(t.user, 'login.email'), row(t.temp, 'login.tempPassword', { mono: true })];
    default:
      return [];
  }
}

function cardBlock(card, t) {
  const rows = cardRows(card, t);
  if (!rows.length) return '';
  // The login box only makes sense with a temporary password (a returning client gets none).
  const [open, close] = card === 'login' ? ['{% if login.tempPassword != blank %}', '{% endif %}'] : ['', ''];
  const hint = card === 'login' ? `<tr><td colspan="2" style="padding:6px 22px 0;color:${C.muted};font-size:13px">${escapeHtml(t.tempHint)}</td></tr>` : '';
  const spacer = (h) => `<tr><td colspan="2" style="height:${h}px;line-height:${h}px;font-size:0">&nbsp;</td></tr>`;
  // The grey fills the whole padding box, so the space after the card is a separate spacer.
  return `${open}<mj-table padding="0" font-family="${FONT}" cellpadding="0" border="none" width="100%" container-background-color="${C.page}">
    ${spacer(12)}${rows.join('')}${hint}${spacer(14)}
  </mj-table>
  <mj-spacer height="24px" />${close}`;
}

// ─── Blocks ────────────────────────────────────────────────────────────

function block(b, t) {
  switch (b.type) {
    case 'heading':
      return `<mj-text font-size="30px" line-height="1.2" padding="0 0 20px">${richText(b.text, { links: false })}</mj-text>`;
    case 'text':
      return String(b.text ?? '')
        .split(/\r?\n\s*\r?\n/)
        .filter((p) => p.trim())
        .map((p) => {
          // A paragraph that is only a field (Areli's personal note) disappears when it is empty.
          const only = p.trim().match(/^\{\{\s*([a-zA-Z]+\.[a-zA-Z]+)\s*\}\}$/);
          const html = `<mj-text>${richText(p.trim())}</mj-text>`;
          return only ? `{% if ${only[1]} != blank %}${html}{% endif %}` : html;
        })
        .join('\n');
    case 'note':
      return `<mj-text font-size="14px" color="${C.muted}" line-height="1.5">${richText(b.text)}</mj-text>`;
    case 'button': {
      const url = String(b.url ?? '').trim();
      if (!url || !b.label) return '';
      return `<mj-button href="${richText(url, { links: false })}" align="left" background-color="${C.ink}" color="${C.paper}"
        font-size="13px" letter-spacing="2px" text-transform="uppercase" border-radius="0" inner-padding="16px 28px" padding="8px 0 24px">${richText(b.label, { links: false })}</mj-button>`;
    }
    case 'card':
      return cardBlock(b.card, t);
    case 'divider':
      return `<mj-divider border-width="1px" border-color="${C.line}" padding="8px 0 24px" />`;
    default:
      return '';
  }
}

/** Content → MJML document (with Liquid tags for the variables). */
export function toMjml(content, locale = 'en') {
  const t = L[locale] ?? L.en;
  const urls = appUrls();
  const foot = footerLinks();
  const contact = [
    '{% if business.phone != blank %}{{ business.phone }}{% endif %}',
    foot.instagramUrl ? `<a href="${escapeHtml(foot.instagramUrl)}" style="color:${C.muted}">{{ business.instagram }}</a>` : '',
    '{% if business.email != blank %}{{ business.email }}{% endif %}',
  ].filter(Boolean).join(' &nbsp;·&nbsp; ');

  return `<mjml lang="${locale}">
  <mj-head>
    <mj-title>${richText(content.subject, { links: false })}</mj-title>
    <mj-preview>${richText(content.preheader ?? '', { links: false })}</mj-preview>
    <mj-font name="EB Garamond" href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500&amp;display=swap" />
    <mj-attributes>
      <mj-all font-family="${FONT}" />
      <mj-text color="${C.ink}" font-size="17px" line-height="1.6" padding="0 0 16px" />
    </mj-attributes>
    <mj-style>a { color: ${C.ink}; }</mj-style>
  </mj-head>
  <mj-body background-color="${C.page}" width="600px">
    <mj-section padding="36px 0 20px">
      <mj-column>
        <mj-image src="${urls.assets}/logo.png" alt="{{ business.name }}" width="132px" padding="0" />
      </mj-column>
    </mj-section>
    <mj-section background-color="${C.paper}" padding="44px 40px 28px">
      <mj-column>
        ${(content.blocks ?? []).map((b) => block(b, t)).join('\n        ')}
        <mj-text padding="12px 0 0" color="${C.muted}" font-size="15px">${t.signature}</mj-text>
        <mj-text padding="2px 0 0" font-size="22px" font-style="italic">{{ business.owner }}</mj-text>
      </mj-column>
    </mj-section>
    <mj-section padding="24px 24px 44px">
      <mj-column>
        <mj-text align="center" font-size="13px" color="${C.muted}" line-height="1.7" padding="0">
          ${contact}<br />${escapeHtml(foot.legalName ?? '')}
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;
}
