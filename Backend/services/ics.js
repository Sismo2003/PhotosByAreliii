// iCalendar (.ics, RFC 5545) for "Add to calendar". One VEVENT per file, times in UTC ("…Z") so
// no VTIMEZONE block is needed and every calendar app shows the right local time.
// The same UID + a higher SEQUENCE updates an event that was already added (e.g. after a reschedule).
import { DateTime } from 'luxon';
import { BRAND } from '../../shared/site.js';

const CRLF = '\r\n';

// TEXT values: backslash, semicolon, comma and line breaks must be escaped.
const text = (value) =>
  String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

const utcStamp = (dt) => dt.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");

// Lines longer than 75 octets continue on the next line after CRLF + one space (never splitting a character).
function fold(line) {
  if (Buffer.byteLength(line) <= 75) return line;
  const parts = [];
  let current = '';
  let size = 0;
  let limit = 75;
  for (const ch of line) {
    const n = Buffer.byteLength(ch);
    if (size + n > limit) {
      parts.push(current);
      current = '';
      size = 0;
      limit = 74; // the leading space counts
    }
    current += ch;
    size += n;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

/**
 * event: { uid, sequence, start (Luxon DateTime), end, summary, location?, description?, url?, tentative? }
 * Returns the whole file as a string.
 */
export function toICS(event) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${text(BRAND.legalName)}//Client portal//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${text(event.uid)}`,
    `SEQUENCE:${Number(event.sequence) || 0}`,
    `DTSTAMP:${utcStamp(DateTime.utc())}`,
    `DTSTART:${utcStamp(event.start)}`,
    `DTEND:${utcStamp(event.end)}`,
    `SUMMARY:${text(event.summary)}`,
    event.location ? `LOCATION:${text(event.location)}` : null,
    event.description ? `DESCRIPTION:${text(event.description)}` : null,
    event.url ? `URL:${event.url}` : null,
    `STATUS:${event.tentative ? 'TENTATIVE' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return lines.map(fold).join(CRLF) + CRLF;
}
