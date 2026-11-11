// Editable templates (docs/correos.md §4.2): one per key + locale. "Save draft" never changes what
// is sent; "Publish" does. An email nobody edited is sent from emails/defaults.js.
//
// Status shown in the admin:
//   default    never edited — the repository text is used
//   published  Areli's version is live and the draft matches it
//   draft      there are changes that aren't published yet
import { isDeepStrictEqual } from 'node:util';
import { CATALOG, CATALOG_BY_KEY, LOCALES, isLocked } from '../../emails/catalog.js';
import { defaultContent } from '../../emails/defaults.js';
import { compile, validateForPublish } from '../../emails/render.js';
import EmailModel from '../../models/email.model.js';
import { HttpError } from '../../utils/http.js';
import { templateEnabled } from './settings.js';

export function assertKnown(key, locale) {
  if (!CATALOG_BY_KEY[key]) throw new HttpError(404, 'Unknown email');
  if (locale !== undefined && !LOCALES.includes(locale)) throw new HttpError(400, 'Language must be en or es');
}

// Content saved in the database keeps only what the layout reads (block ids from the editor too).
export function cleanContent(content) {
  return {
    subject: String(content.subject ?? '').trim(),
    preheader: String(content.preheader ?? '').trim(),
    blocks: (content.blocks ?? []).map((b) => Object.fromEntries(Object.entries(b).filter(([k]) => ['id', 'type', 'text', 'label', 'url', 'card'].includes(k)))),
  };
}

const stripIds = (content) => content && { ...content, blocks: (content.blocks ?? []).map(({ id: _id, ...b }) => b) };
const sameContent = (a, b) => isDeepStrictEqual(stripIds(a), stripIds(b));

function statusOf(row) {
  if (!row || row.isDefault) return 'default';
  const published = row.publishedVersion;
  if (!published) return 'draft';
  const draft = row.draftProject;
  return draft && !sameContent(draft, published.project ?? null) ? 'draft' : 'published';
}

/** The catalog with, per language, its status and last edit, plus the on/off switch. */
export async function listTemplates() {
  const rows = await EmailModel.templates();
  const byKey = new Map(rows.map((r) => [`${r.key}:${r.locale}`, r]));
  return CATALOG.map((entry) => {
    const locales = Object.fromEntries(
      LOCALES.map((locale) => {
        const row = byKey.get(`${entry.key}:${locale}`);
        return [locale, { status: statusOf(row), editedAt: row?.draftUpdatedAt ?? null, publishedAt: row?.publishedVersion?.publishedAt ?? null }];
      }),
    );
    return { ...entry, enabled: isLocked(entry.key) || templateEnabled(entry.key), locales };
  });
}

/** Everything the editor needs for one key + locale. */
export async function getTemplate(key, locale) {
  assertKnown(key, locale);
  const row = await EmailModel.template(key, locale);
  const published = row?.publishedVersion?.project ?? null;
  const fallback = defaultContent(key, locale);
  const versions = row ? await EmailModel.versions(row.id) : [];
  return {
    key,
    locale,
    entry: { ...CATALOG_BY_KEY[key], enabled: isLocked(key) || templateEnabled(key) },
    status: statusOf(row),
    content: row?.draftProject ?? published ?? fallback,
    published: published ?? (row?.isDefault === false ? null : fallback),
    defaultContent: fallback,
    draftUpdatedAt: row?.draftUpdatedAt ?? null,
    publishedAt: row?.publishedVersion?.publishedAt ?? null,
    versions,
  };
}

export async function saveDraft(key, locale, content) {
  assertKnown(key, locale);
  const clean = cleanContent(content);
  // The draft may be half-written: only the layout has to compile (it always does for valid blocks).
  const { mjml } = await compile(clean, locale);
  await EmailModel.saveDraft(key, locale, { subject: clean.subject, mjml, project: clean });
  return getTemplate(key, locale);
}

export async function publish(key, locale, content, actorId) {
  assertKnown(key, locale);
  const clean = cleanContent(content);
  const check = await validateForPublish(key, clean, locale);
  if (!check.ok) throw new HttpError(422, check.problems[0], { problems: check.problems });
  await EmailModel.publish(key, locale, { subject: clean.subject, mjml: check.compiled.mjml, project: clean, html: check.compiled.html }, actorId);
  return getTemplate(key, locale);
}

/** Loads an older version into the draft (it still has to be published). */
export async function draftFromVersion(key, locale, versionId) {
  assertKnown(key, locale);
  const version = await EmailModel.version(versionId);
  const row = await EmailModel.template(key, locale);
  if (!version || !row || version.templateId !== row.id) throw new HttpError(404, 'Version not found');
  return saveDraft(key, locale, version.project);
}

export async function restoreDefault(key, locale, actorId) {
  assertKnown(key, locale);
  await EmailModel.restoreDefault(key, locale, actorId);
  return getTemplate(key, locale);
}

// ─── For the worker ──────────────────────────────────────────────────

const defaultCache = new Map(); // `${key}:${locale}` → { html, subject }

/** What a real email is built from: the published version, or the compiled default. */
export async function templateForSend(key, locale) {
  const row = await EmailModel.template(key, locale);
  if (row?.publishedVersion) {
    return { html: row.publishedVersion.html, subject: row.publishedVersion.subject, versionId: row.publishedVersion.id };
  }
  const cacheKey = `${key}:${locale}`;
  if (!defaultCache.has(cacheKey)) {
    const content = defaultContent(key, locale);
    const { html } = await compile(content, locale);
    defaultCache.set(cacheKey, { html, subject: content.subject });
  }
  return { ...defaultCache.get(cacheKey), versionId: null };
}

