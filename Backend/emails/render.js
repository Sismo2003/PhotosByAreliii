// Content → email (docs/correos.md §4): blocks → MJML (layout.js) → HTML with Liquid tags (compiled
// once, at publish) → variables filled per email with Liquid, which escapes every value → plain-text
// version with html-to-text.
import { convert } from 'html-to-text';
import { Liquid } from 'liquidjs';
import mjml2html from 'mjml';
import { BLOCK_TYPES, toMjml, usedVariables, varsIn } from './layout.js';
import { CARDS, CATALOG_BY_KEY, allowedVariables } from './catalog.js';
import { sampleData } from './fixtures.js';

// HTML body: every {{ value }} is HTML-escaped. Subject: plain text (it is a header, not HTML).
const htmlEngine = new Liquid({ outputEscape: 'escape', strictFilters: true, cache: 200 });
const textEngine = new Liquid({ strictFilters: true, cache: 200 });

/** Content → { mjml, html } where html still has the Liquid tags. Throws when MJML fails. */
export async function compile(content, locale = 'en') {
  const mjml = toMjml(content, locale);
  const { html, errors } = await mjml2html(mjml, { validationLevel: 'soft', keepComments: false });
  if (errors?.length) {
    const first = errors[0];
    throw new Error(`Layout error: ${first.formattedMessage ?? first.message}`);
  }
  return { mjml, html };
}

const toText = (html) =>
  convert(html, {
    wordwrap: 90,
    selectors: [
      { selector: 'img', format: 'skip' },
      { selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
      { selector: 'h1', options: { uppercase: false } },
      { selector: 'table', format: 'dataTable' },
    ],
  });

/** Compiled html + subject/preheader + data → the email that goes out. */
export async function fill({ html, subject, preheader = '' }, data, { strict = false } = {}) {
  const opts = { strictVariables: strict };
  const oneLine = (t) => t.replace(/\s+/g, ' ').trim();
  const [filledHtml, filledSubject, filledPreheader] = await Promise.all([
    htmlEngine.parseAndRender(html, data, opts),
    textEngine.parseAndRender(String(subject ?? ''), data, opts),
    textEngine.parseAndRender(String(preheader ?? ''), data, opts),
  ]);
  return { subject: oneLine(filledSubject), preheader: oneLine(filledPreheader), html: filledHtml, text: toText(filledHtml) };
}

/** One step for previews and tests: compile + fill. */
export async function render(content, locale, data, opts) {
  const { html } = await compile(content, locale);
  return fill({ html, subject: content.subject, preheader: content.preheader }, data, opts);
}

// ─── Checks ───────────────────────────────────────────────────────────

const LINK_RE = /^(https?:\/\/|mailto:|tel:|\{\{\s*[a-zA-Z]+\.[a-zA-Z]+\s*\}\}$)/;

/** Shape check (the API's yup schema covers types; this covers meaning). Returns a list of problems. */
export function problemsOf(key, content) {
  const entry = CATALOG_BY_KEY[key];
  const problems = [];
  if (!String(content.subject ?? '').trim()) problems.push('Add a subject.');
  const blocks = content.blocks ?? [];
  if (!blocks.length) problems.push('Add at least one block.');

  const allowed = new Set(allowedVariables(key));
  const texts = [content.subject, content.preheader, ...blocks.flatMap((b) => [b.text, b.label, b.url])];
  const unknown = [...new Set(texts.flatMap(varsIn))].filter((v) => !allowed.has(v));
  for (const v of unknown) problems.push(`{{ ${v} }} isn’t available in this email.`);

  for (const b of blocks) {
    if (!BLOCK_TYPES.includes(b.type)) problems.push(`Unknown block “${b.type}”.`);
    if (b.type === 'button' && (!String(b.label ?? '').trim() || !LINK_RE.test(String(b.url ?? '').trim()))) {
      problems.push('Every button needs a label and a link (https://… or a link field).');
    }
    if (b.type === 'card' && !(entry?.cards ?? []).includes(b.card)) problems.push(`The “${CARDS[b.card]?.label ?? b.card}” box isn’t available in this email.`);
  }

  const used = usedVariables(content);
  const missing = (entry?.required ?? []).filter((v) => !used.has(v));
  for (const v of missing) problems.push(`This email must include {{ ${v} }}.`);
  return problems;
}

/** Publish gate: no problems, compiles, and renders with sample data under strict variables. */
export async function validateForPublish(key, content, locale) {
  const problems = problemsOf(key, content);
  if (problems.length) return { ok: false, problems };
  try {
    const compiled = await compile(content, locale);
    await fill({ html: compiled.html, subject: content.subject }, sampleData(key, locale), { strict: true });
    return { ok: true, compiled };
  } catch (error) {
    return { ok: false, problems: [error.message] };
  }
}
