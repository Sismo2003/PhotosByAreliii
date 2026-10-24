// Enum options of the New booking form (same values as database/prisma/schema.prisma).
export const HEARD_FROM = [
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "FRIEND", label: "A friend" },
  { value: "GOOGLE", label: "Google" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "RETURNING_CLIENT", label: "Returning client" },
  { value: "OTHER", label: "Other" },
];

export const PARTY_SIZES = [
  { value: "JUST_ME", label: "1" },
  { value: "TWO", label: "2" },
  { value: "THREE_TO_FIVE", label: "3–5" },
  { value: "SIX_TO_EIGHT", label: "6–8" },
];

export const LOCATION_KINDS = [
  { value: "PRESET", label: "A usual spot" },
  { value: "CAMPUS", label: "Campus" },
  { value: "STUDIO", label: "Studio" },
  { value: "OTHER", label: "Somewhere else" },
];

export const SHARE_OPTIONS = [
  { value: "YES", label: "Yes" },
  { value: "PARTIAL", label: "Yes, but not everything" },
  { value: "NO", label: "No" },
];

export const PAY_MODES = [
  { value: "NONE", label: "Not paid yet" },
  { value: "DEPOSIT", label: "Deposit received" },
  { value: "FULL", label: "Paid in full" },
];
