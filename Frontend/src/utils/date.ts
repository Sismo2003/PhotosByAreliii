// Dates — project rule: always Luxon, studio zone America/Phoenix (no DST).
import { DateTime } from "luxon";
import type { Lang } from "../i18n";

export const STUDIO_ZONE = "America/Phoenix";

export const studioNow = () => DateTime.now().setZone(STUDIO_ZONE);

/** "2026-10-26" → "October 26, 2026" / "26 de octubre de 2026". */
export const formatLongDate = (isoDate: string, lang: Lang) =>
  DateTime.fromISO(isoDate, { zone: STUDIO_ZONE }).setLocale(lang).toLocaleString(DateTime.DATE_FULL);
