// Landing i18n: English at /, Spanish at /es/ (hreflang pairs). Copy lives in en.json / es.json.
// The language choice is stored under the same key as the client portal (client/src/i18n/config.js),
// so the site and /client/ open in the language the visitor picked last.
import en from "./en.json";
import es from "./es.json";

export const LANGS = ["en", "es"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "en";
export const LANG_STORAGE_KEY = "pba-client-lang";
export const HTML_LANG: Record<Lang, string> = { en: "en-US", es: "es-US" };
export const OG_LOCALE: Record<Lang, string> = { en: "en_US", es: "es_US" };

const DICTS: Record<Lang, unknown> = { en, es };

export type Vars = Record<string, string | number | undefined>;

/** "{name} sessions" + { name: "Solos" } → "Solos sessions". Unknown placeholders stay as they are. */
export function interpolate(text: string, vars: Vars = {}): string {
  return text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined ? m : String(vars[k])));
}

function lookup(lang: Lang, key: string): unknown {
  return key.split(".").reduce<any>((node, part) => (node == null ? node : node[part]), DICTS[lang]);
}

/** Translator bound to a language and to the variables every page shares (brand, region, prices…). */
export function useT(lang: Lang, shared: Vars = {}) {
  const t = (key: string, vars: Vars = {}): string => {
    const value = lookup(lang, key) ?? lookup(DEFAULT_LANG, key);
    if (typeof value !== "string") throw new Error(`i18n: "${key}" is not a string`);
    return interpolate(value, { ...shared, ...vars });
  };
  /** Arrays/objects (lists of items); strings inside are interpolated. */
  const tl = <T = any>(key: string, vars: Vars = {}): T => {
    const value = lookup(lang, key) ?? lookup(DEFAULT_LANG, key);
    const walk = (v: any): any =>
      typeof v === "string" ? interpolate(v, { ...shared, ...vars }) : Array.isArray(v) ? v.map(walk) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : v;
    return walk(value) as T;
  };
  return { t, tl, lang };
}

/** "/services/" + "es" → "/es/services/". Paths are written in their English form everywhere. */
export function localizePath(path: string, lang: Lang): string {
  const clean = stripLang(path);
  return lang === DEFAULT_LANG ? clean : `/${lang}${clean === "/" ? "/" : clean}`;
}

/** "/es/services/" → "/services/". */
export function stripLang(path: string): string {
  const m = path.match(/^\/(es)(\/.*)?$/);
  return m ? m[2] || "/" : path || "/";
}

export function langFromPath(path: string): Lang {
  return /^\/es(\/|$)/.test(path) ? "es" : "en";
}
