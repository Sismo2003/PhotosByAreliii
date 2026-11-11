// Business data for the landing, normalized from shared/site.js (git-ignored, real values) and
// shared/services.js. Namespace import on purpose: an older site.js without AREA/ownerFullName (e.g.
// the SITE_JS_B64 secret in CI) still builds, with the defaults below.
import * as SITE from "@shared/site";
import { EXTRAS, POLICY, SERVICES, serviceBySlug } from "@shared/services";
import { money } from "../utils/money";
import type { Vars } from "../i18n";

const S = SITE as Record<string, any>;

export const BRAND = S.BRAND as { name: string; legalName: string; owner: string; ownerFullName?: string; domain: string };
export const CONTACT = S.CONTACT as { phoneE164: string; emails: { primary?: string; alt?: string } };
export const SOCIAL = S.SOCIAL as { instagramHandle?: string; instagram?: string };
export const AREA = { region: "Arizona", regionCode: "AZ", country: "US", areaServed: [] as string[], ...(S.AREA ?? {}) };

export { SERVICES, EXTRAS, POLICY, serviceBySlug };

const extra = (key: string) => EXTRAS.find((e: any) => e.key === key)?.price ?? 0;
const pkg = (slug: string, key: string) =>
  SERVICES.find((s: any) => s.slug === slug)?.packages.find((p: any) => p.key === key)?.price ?? 0;
const from = (slug: string) => SERVICES.find((s: any) => s.slug === slug)?.from ?? 0;

/** Variables every translated string can use: {brand}, {region}, {outfit}, {deposit}… */
export const SHARED_VARS: Vars = {
  brand: BRAND.name,
  legal: BRAND.legalName,
  owner: BRAND.owner,
  region: AREA.region,
  email: CONTACT.emails?.primary,
  instagram: SOCIAL.instagramHandle,
  outfit: money(extra("outfit")),
  extra30: money(extra("extra30")),
  deposit: POLICY.depositPercent,
  hours: POLICY.cancelNoticeHours,
  minutes: POLICY.lateGraceMinutes,
  age: POLICY.minorAge,
  from: money(Math.min(...SERVICES.map((s: any) => s.from))),
  graduation: money(from("graduation")),
  solos: money(from("solos")),
  familyCouples: money(from("family-couples")),
  maternity: money(from("maternity")),
  birthdays: money(from("birthdays-parties")),
  branding: money(from("branding")),
  couples: money(pkg("family-couples", "couples")),
  family: money(pkg("family-couples", "family")),
  birthday: money(pkg("birthdays-parties", "birthday")),
  party: money(pkg("birthdays-parties", "party")),
};

// Date the policies/privacy/terms texts were last changed (shown on those pages). Update with the copy.
export const LEGAL_UPDATED = "2026-10-26";
