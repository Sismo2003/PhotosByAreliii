// Variables as Areli sees them. The template stores Liquid ({{ client.firstName }}); the editor shows
// friendly brackets ([First name]) and converts back on every keystroke. The round trip is stable, so
// the cursor never jumps. Anything that isn't a known field stays as typed.
//
//   const t = makeTokens(variables, allowedGroups)
//   t.toDisplay("Hi {{ client.firstName }}")  → "Hi [First name]"
//   t.fromDisplay("Hi [First name]")          → "Hi {{ client.firstName }}"

const LIQUID = /\{\{\s*([a-zA-Z]+\.[a-zA-Z]+)\s*\}\}/g;
const BRACKET = /\[([^[\]\n]{1,40})\]/g;

export function makeTokens(variables, groups) {
  const fields = groups.flatMap((g) => (variables[g] ?? []).map(([name, label]) => ({ name, label, group: g })));
  const byName = new Map(fields.map((f) => [f.name, f]));
  const byLabel = new Map(fields.map((f) => [f.label.toLowerCase(), f]));
  return {
    fields,
    label: (name) => byName.get(name)?.label ?? name,
    toDisplay: (text) => String(text ?? "").replace(LIQUID, (m, name) => (byName.has(name) ? `[${byName.get(name).label}]` : m)),
    fromDisplay: (text) =>
      String(text ?? "").replace(BRACKET, (m, label) => {
        const f = byLabel.get(label.trim().toLowerCase());
        return f ? `{{ ${f.name} }}` : m;
      }),
    display: (name) => `[${byName.get(name)?.label ?? name}]`,
  };
}

/** Link fields (for buttons): the variables that hold a URL. */
export const isLinkField = (name) => /(\.url|Url)$/.test(name);

// Headings of the "Insert field" menu.
export const GROUP_LABEL = {
  client: "Client",
  business: "Your business",
  booking: "Booking",
  payment: "Payment",
  gallery: "Gallery",
  login: "Sign-in",
  reset: "Password reset",
  review: "Review",
  change: "Email change",
  digest: "Summary",
  bounce: "Bounce",
  storage: "Storage",
  failure: "Failures",
};

