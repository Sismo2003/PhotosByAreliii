// /book — the 5-step request form (Booking*.dc.html): session → date & time → location → details →
// review & send, then the "Request sent" screen. Plain TypeScript (the landing has no UI framework, so
// the CSP stays script-src 'self'). The markup is rendered by BookView.astro; this file fills it in.
//
// Rules (docs/formulario-publico-booking.md):
//   - catalog, prices and free times come from the API; what this page shows is only a preview,
//     the server prices the request again;
//   - dates with Luxon in America/Phoenix, phones with libphonenumber-js (CLAUDE.md);
//   - nothing typed by the visitor is ever inserted as HTML.
import { DateTime, Info } from "luxon";
import { ApiError, getCatalog, getMonth, sendRequest, type ApiExtra, type ApiPackage, type ApiService, type Catalog, type Created, type Month } from "./api";
import { validateStep, type FieldErrors } from "./schema";
import { sunsetOn } from "./sun";

const ZONE = "America/Phoenix";
const MAX_QTY = 10; // MAX_EXTRA_QUANTITY in Backend/validators/booking.schemas.js
const DRAFT_KEY = "pba-book-draft";
const STEPS = 5;

type Strings = Record<string, any>;
type LandingService = { slug: string; name: string; packages: { key: string; name: string; note: string }[] };
type Data = {
  lang: "en" | "es";
  s: Strings; // book.* from i18n, with the dynamic {placeholders} left in
  services: LandingService[];
  extras: Record<string, string>; // outfit / extra30 → translated label
  locations: Record<string, string>; // PRESET / CAMPUS / STUDIO → card name
  sun: { lat: number; lng: number };
};

type State = {
  serviceSlug: string | null;
  packageId: number | null;
  extras: Record<string, number>; // extraId → quantity (> 0)
  date: string | null;
  time: string | null;
  month: string | null;
  locationKind: string | null;
  place: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  partySize: string;
  heardFrom: string;
  schoolAndColors: string;
  photosNeededBy: string;
  inspo: string;
  sharePermission: string;
  doNotPostNotes: string;
  clientNotes: string;
  minorConsent: boolean;
  policyAccepted: boolean;
};

const TEXT_FIELDS = ["place", "firstName", "lastName", "email", "phone", "partySize", "heardFrom", "schoolAndColors", "photosNeededBy", "inspo", "sharePermission", "doNotPostNotes", "clientNotes"] as const;

const blankState = (): State => ({
  serviceSlug: null,
  packageId: null,
  extras: {},
  date: null,
  time: null,
  month: null,
  locationKind: null,
  place: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  partySize: "",
  heardFrom: "",
  schoolAndColors: "",
  photosNeededBy: "",
  inspo: "",
  sharePermission: "",
  doNotPostNotes: "",
  clientNotes: "",
  minorConsent: false,
  policyAccepted: false,
});

// ─── Small helpers ───────────────────────────────────────────────────────

const fill = (tpl: string, vars: Record<string, string | number>) => String(tpl).replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined ? m : String(vars[k])));

/** "$160", "$87.50". */
const money = (cents: number) => {
  const dollars = cents / 100;
  return `$${Number.isInteger(dollars) ? dollars.toLocaleString("en-US") : dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string | boolean | undefined> = {}, ...children: (Node | string | null | false)[]) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === "class") node.className = String(v);
    else node.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of children) if (c !== null && c !== false) node.append(c);
  return node;
}

const storage = {
  load(): Partial<State> | null {
    try {
      const raw = window.sessionStorage.getItem(DRAFT_KEY);
      return raw ? (JSON.parse(raw) as Partial<State>) : null;
    } catch {
      return null;
    }
  },
  save(state: State) {
    try {
      // The policy box is ticked again on every visit; the rest survives a reload of the tab.
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...state, policyAccepted: false }));
    } catch {
      /* private window / storage blocked: the form still works */
    }
  },
  clear() {
    try {
      window.sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  },
};

// ─── The page ────────────────────────────────────────────────────────────

export function mountBooking(root: HTMLElement, D: Data) {
  const S = D.s;
  const $ = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = root) => scope.querySelector<T>(sel)!;
  const $$ = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = root) => [...scope.querySelectorAll<T>(sel)];

  const form = $<HTMLFormElement>("[data-form]");
  const flow = $("[data-flow]");
  const doneView = $("[data-done]");
  const fallback = $("[data-fallback]");
  const loading = $("[data-loading]");
  const nextBtn = $<HTMLButtonElement>("[data-next]");
  const backBtn = $<HTMLButtonElement>("[data-back]");
  const stepError = $("[data-step-error]");

  let state: State = { ...blankState(), ...(storage.load() ?? {}) };
  let step = 1;
  let catalog: Catalog | null = null;
  let monthData: Month | null = null;
  let monthAbort: AbortController | null = null;
  let sending = false;
  let urlApplied = false; // ?service=&package= preselect once, not on a later catalog reload
  const monthCache = new Map<string, Month>();

  // ── Catalog lookups ──
  const service = (): ApiService | null => catalog?.services.find((s) => s.slug === state.serviceSlug) ?? null;
  const pkg = (): ApiPackage | null => service()?.packages.find((p) => p.id === state.packageId) ?? null;
  const extrasFor = (svc: ApiService | null): ApiExtra[] => (svc ? catalog!.extras.filter((e) => e.serviceIds.includes(svc.id)) : []);
  const chosenExtras = () =>
    extrasFor(service())
      .filter((e) => (state.extras[e.id] ?? 0) > 0)
      .map((e) => ({ extra: e, quantity: state.extras[e.id] }));
  const minutes = () => (pkg()?.durationMinutes ?? 120) + chosenExtras().reduce((sum, x) => sum + x.extra.minutes * x.quantity, 0);
  const totals = () => {
    const p = pkg();
    if (!p || !catalog) return null;
    const total = p.priceCents + chosenExtras().reduce((sum, x) => sum + x.extra.priceCents * x.quantity, 0);
    const deposit = Math.round((total * catalog.settings.depositPercent) / 100);
    return { total, deposit, balance: total - deposit };
  };

  // Names in the page language when the landing knows the item, else the catalog's name.
  const landingService = (slug: string) => D.services.find((s) => s.slug === slug);
  const packageKey = (svc: ApiService, p: ApiPackage): string | null => {
    const keys = landingService(svc.slug)?.packages.map((x) => x.key) ?? [];
    const byName = keys.find((k) => p.name.toLowerCase().startsWith(k.toLowerCase()));
    if (byName) return byName;
    const index = svc.packages.indexOf(p);
    return svc.packages.length === keys.length ? keys[index] ?? null : null;
  };
  const serviceName = (svc: ApiService) => landingService(svc.slug)?.name ?? svc.name;
  const packageName = (svc: ApiService, p: ApiPackage) => {
    const key = packageKey(svc, p);
    return landingService(svc.slug)?.packages.find((x) => x.key === key)?.name ?? p.name;
  };
  const packageNote = (svc: ApiService, p: ApiPackage) => {
    const key = packageKey(svc, p);
    return landingService(svc.slug)?.packages.find((x) => x.key === key)?.note ?? p.customDescription;
  };
  const extraName = (e: ApiExtra) => {
    const n = e.name.toLowerCase();
    if (n.includes("outfit") && D.extras.outfit) return D.extras.outfit;
    if (e.minutes === 30 && D.extras.extra30) return D.extras.extra30;
    return e.name;
  };
  const locationName = () => {
    if (!state.locationKind) return null;
    if (state.locationKind === "PRESET" || state.locationKind === "STUDIO") return D.locations[state.locationKind];
    return state.place.trim() || (state.locationKind === "CAMPUS" ? D.locations.CAMPUS : null);
  };
  const startDt = () => (state.date && state.time ? DateTime.fromISO(`${state.date}T${state.time}`, { zone: ZONE }).setLocale(D.lang) : null);
  const timeLabel = (time: string, date: string) => DateTime.fromISO(`${date}T${time}`, { zone: ZONE }).setLocale(D.lang).toLocaleString(DateTime.TIME_SIMPLE);

  const save = () => storage.save(state);

  // ─── Step 1 · Session ───────────────────────────────────────────────────

  function applyCatalog(cat: Catalog) {
    catalog = cat;
    const slugs = new Set(cat.services.map((s) => s.slug));

    // Cards rendered at build time for services that aren't bookable right now: hide them.
    for (const card of $$("[data-service-card]")) {
      const slug = card.dataset.serviceCard!;
      card.hidden = !slugs.has(slug);
      const svc = cat.services.find((s) => s.slug === slug);
      const from = card.querySelector("[data-from]");
      if (svc && from) from.textContent = money(Math.min(...svc.packages.map((p) => p.priceCents)));
    }
    // Services the admin added that the landing doesn't know: a card without a photo.
    const extraHost = $("[data-more-services]");
    extraHost.replaceChildren(
      ...cat.services
        .filter((s) => !landingService(s.slug))
        .map((s) =>
          el(
            "label",
            { class: "grid cursor-pointer grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-4 border border-line px-4 py-4 has-[:checked]:border-ink sm:gap-5 sm:px-5", "data-service-card": s.slug },
            el("input", { type: "radio", name: "service", value: s.slug, class: "size-5 accent-ink" }),
            el("span", { class: "block text-[20px] leading-tight sm:text-[22px]" }, s.name),
            el("span", { class: "text-[20px] whitespace-nowrap sm:text-[22px]" }, money(Math.min(...s.packages.map((p) => p.priceCents)))),
          ),
        ),
    );

    // Keep the choice if it still exists; else ?service= from the "Book" buttons; else nothing.
    if (!state.serviceSlug || !slugs.has(state.serviceSlug)) state.serviceSlug = null;
    const params = new URLSearchParams(location.search);
    const fromUrl = urlApplied ? null : params.get("service");
    urlApplied = true;
    let urlPackage: string | null = null;
    if (fromUrl && slugs.has(fromUrl)) {
      if (state.serviceSlug !== fromUrl) state.packageId = null;
      state.serviceSlug = fromUrl;
      urlPackage = params.get("package");
    }
    syncPackage(urlPackage);
    for (const input of $$<HTMLInputElement>("input[name=service]")) input.checked = input.value === state.serviceSlug;
    renderSession();
  }

  /** Make packageId / extras valid for the chosen service. `preferredKey` = ?package=<key>. */
  function syncPackage(preferredKey?: string | null) {
    const svc = service();
    if (!svc) {
      state.packageId = null;
      state.extras = {};
      return;
    }
    const wanted = preferredKey ? svc.packages.find((p) => packageKey(svc, p) === preferredKey) : null;
    if (wanted) state.packageId = wanted.id;
    else if (!svc.packages.some((p) => p.id === state.packageId)) state.packageId = (svc.packages.find((p) => p.isFeatured) ?? svc.packages[0]).id;
    const allowed = new Set(extrasFor(svc).map((e) => String(e.id)));
    state.extras = Object.fromEntries(Object.entries(state.extras).filter(([id, q]) => allowed.has(id) && q > 0 && q <= MAX_QTY));
  }

  function renderSession() {
    const svc = service();
    const pkgWrap = $("[data-packages]");
    const list = $("[data-package-list]");
    pkgWrap.hidden = !svc || svc.packages.length < 2;
    list.replaceChildren(
      ...(svc && svc.packages.length > 1
        ? svc.packages.map((p) =>
            el(
              "label",
              { class: "flex cursor-pointer items-center justify-between gap-4 border border-line px-4 py-3 has-[:checked]:border-ink sm:px-5" },
              el(
                "span",
                { class: "flex items-center gap-4" },
                el("input", { type: "radio", name: "package", value: String(p.id), checked: p.id === state.packageId, class: "size-5 accent-ink" }),
                el("span", {}, el("span", { class: "block text-[20px] leading-tight" }, packageName(svc, p)), packageNote(svc, p) ? el("span", { class: "block text-sm text-muted" }, packageNote(svc, p)!) : null),
              ),
              el("span", { class: "text-[20px] whitespace-nowrap" }, money(p.priceCents)),
            ),
          )
        : []),
    );

    const extras = extrasFor(svc);
    $("[data-extras]").hidden = extras.length === 0;
    $("[data-extra-list]").replaceChildren(
      ...extras.map((e) => {
        const qty = state.extras[e.id] ?? 0;
        const name = extraName(e);
        const btn = (delta: number, label: string, disabled: boolean, glyph: string) =>
          el("button", { type: "button", class: "flex size-10 items-center justify-center border border-line text-xl leading-none hover:border-ink disabled:cursor-not-allowed disabled:opacity-40", "data-extra": String(e.id), "data-delta": String(delta), "aria-label": fill(label, { name }), disabled }, glyph);
        return el(
          "div",
          { class: "flex items-center justify-between gap-4 border-t border-line py-3" },
          el("span", {}, el("span", { class: "block" }, name), el("span", { class: "block text-sm text-muted" }, qty > 0 ? `× ${qty} · ${money(e.priceCents * qty)}` : `+${money(e.priceCents)}`)),
          el(
            "span",
            { class: "flex items-center gap-3" },
            btn(-1, S.s1.less, qty === 0, "−"),
            el("span", { class: "w-6 text-center text-lg tabular-nums", "aria-live": "polite" }, String(qty)),
            btn(1, S.s1.more, qty >= MAX_QTY, "+"),
          ),
        );
      }),
    );
    renderSummary();
  }

  // ─── Step 2 · Date & time ───────────────────────────────────────────────

  const studioToday = () => DateTime.now().setZone(ZONE);
  const monthOf = (iso: string) => DateTime.fromFormat(iso, "yyyy-MM", { zone: ZONE });

  async function loadMonth(month: string, { hopIfEmpty = 0 } = {}) {
    state.month = month;
    save();
    const key = `${month}:${minutes()}`;
    monthAbort?.abort();
    const cached = monthCache.get(key);
    if (cached) {
      monthData = cached;
      renderCalendar();
      return;
    }
    monthData = null;
    renderCalendar();
    const ctrl = new AbortController();
    monthAbort = ctrl;
    try {
      const data = await getMonth(month, minutes(), ctrl.signal);
      if (ctrl.signal.aborted) return;
      monthCache.set(key, data);
      // First visit: the current month may have no times left — show the next one that has.
      if (hopIfEmpty > 0 && data.days.every((d) => !d.slots.some((s) => s.open)) && month < data.maxMonth) {
        return loadMonth(monthOf(month).plus({ months: 1 }).toFormat("yyyy-MM"), { hopIfEmpty: hopIfEmpty - 1 });
      }
      monthData = data;
      // A time chosen before may be gone (taken, or the session got longer).
      if (state.date?.startsWith(month)) {
        const day = data.days.find((d) => d.date === state.date);
        if (!day) state.date = state.time = null;
        else if (state.time && !day.slots.some((s) => s.time === state.time && s.open)) state.time = null;
        save();
      }
      renderCalendar();
    } catch (error) {
      if ((error as Error)?.name === "AbortError" || ctrl.signal.aborted) return;
      renderCalendarError();
    }
  }

  function renderCalendarError() {
    const status = $("[data-cal-status]");
    status.replaceChildren(
      el("span", {}, `${S.s2.error} `),
      el("button", { type: "button", class: "link-line", "data-cal-retry": true }, S.s2.retry),
    );
    $("[data-days]").setAttribute("aria-busy", "false");
  }

  function renderCalendar() {
    const month = monthOf(state.month ?? studioToday().toFormat("yyyy-MM")).setLocale(D.lang);
    $("[data-month-title]").textContent = month.toLocaleString({ month: "long", year: "numeric" });
    const prev = $<HTMLButtonElement>("[data-month-prev]");
    const next = $<HTMLButtonElement>("[data-month-next]");
    const minMonth = monthData?.minMonth ?? studioToday().toFormat("yyyy-MM");
    prev.disabled = month.toFormat("yyyy-MM") <= minMonth;
    next.disabled = Boolean(monthData && month.toFormat("yyyy-MM") >= monthData.maxMonth);
    $("[data-prev-label]").textContent = month.minus({ months: 1 }).toLocaleString({ month: "short" });
    $("[data-next-label]").textContent = month.plus({ months: 1 }).toLocaleString({ month: "short" });

    // Sunday first, like the design.
    const names = Info.weekdays("short", { locale: D.lang });
    $("[data-weekdays]").replaceChildren(...[6, 0, 1, 2, 3, 4, 5].map((i) => el("span", { class: "eyebrow text-center text-muted", "aria-hidden": "true" }, names[i])));

    const grid = $("[data-days]");
    const status = $("[data-cal-status]");
    const cells: Node[] = [];
    for (let i = 0; i < month.startOf("month").weekday % 7; i++) cells.push(el("span", { "aria-hidden": "true" }));
    const open = new Map((monthData?.days ?? []).filter((d) => d.slots.some((s) => s.open)).map((d) => [d.date, d]));
    for (let day = month.startOf("month"); day.hasSame(month, "month"); day = day.plus({ days: 1 })) {
      const iso = day.toISODate()!;
      const base = "flex h-11 items-center justify-center text-[17px] sm:h-[52px] sm:text-[18px]";
      const label = day.toLocaleString({ weekday: "long", month: "long", day: "numeric" });
      if (!monthData) cells.push(el("span", { class: `${base} animate-pulse bg-soft`, "aria-hidden": "true" }));
      else if (open.has(iso)) {
        const selected = state.date === iso;
        cells.push(el("button", { type: "button", class: `${base} border ${selected ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"}`, "data-day": iso, "aria-pressed": String(selected), "aria-label": label }, String(day.day)));
      } else cells.push(el("span", { class: `${base} text-off line-through`, "aria-hidden": "true" }, String(day.day)));
    }
    grid.replaceChildren(...cells);
    grid.setAttribute("aria-busy", String(!monthData));
    if (!monthData) status.textContent = S.s2.loading;
    else status.textContent = open.size === 0 ? S.s2.noDays : "";
    renderDay();
  }

  function renderDay() {
    const panel = $("[data-day-panel]");
    const day = monthData?.days.find((d) => d.date === state.date);
    const title = $("[data-day-title]");
    const sunset = $("[data-sunset]");
    const slots = $("[data-slots]");
    if (!day || !state.date) {
      title.textContent = "";
      sunset.textContent = monthData && monthData.days.length ? S.s2.pickDay : "";
      slots.replaceChildren();
      panel.classList.toggle("hidden", !monthData);
      renderSummary();
      return;
    }
    panel.classList.remove("hidden");
    const date = DateTime.fromISO(state.date, { zone: ZONE }).setLocale(D.lang);
    title.textContent = date.toLocaleString({ weekday: "long", month: "long", day: "numeric" });
    const set = sunsetOn(state.date, D.sun.lat, D.sun.lng, ZONE);
    sunset.textContent = set ? fill(S.s2.sunset, { time: set.setLocale(D.lang).toLocaleString(DateTime.TIME_SIMPLE) }) : "";
    slots.replaceChildren(
      ...day.slots.map((s) => {
        const selected = state.time === s.time && s.open;
        const cls = s.open
          ? `flex h-[52px] items-center justify-between border px-[18px] text-left ${selected ? "border-ink bg-ink text-paper" : "border-faint hover:border-ink"}`
          : "flex h-[52px] items-center justify-between border border-line px-[18px] text-off line-through";
        return el(
          "button",
          { type: "button", class: cls, "data-time": s.time, "aria-pressed": String(selected), disabled: !s.open },
          el("span", { class: "text-[18px]" }, timeLabel(s.time, day.date)),
          el("span", { class: "text-[13px] italic" }, s.open ? s.label ?? "" : S.s2.taken),
        );
      }),
    );
    renderSummary();
  }

  // ─── Step 3 · Location ──────────────────────────────────────────────────

  function renderLocation() {
    for (const input of $$<HTMLInputElement>("input[name=locationKind]")) input.checked = input.value === state.locationKind;
    const wrap = $("[data-place-wrap]");
    const typed = state.locationKind === "CAMPUS" || state.locationKind === "OTHER";
    wrap.hidden = !typed;
    $("[data-place-label]").textContent = state.locationKind === "CAMPUS" ? S.s3.campusField : S.s3.otherField;
    $<HTMLInputElement>("input[name=place]").placeholder = state.locationKind === "CAMPUS" ? S.s3.campusHint : S.s3.otherHint;
    renderSummary();
  }

  // ─── Step 4 · Details ───────────────────────────────────────────────────

  function renderDetails() {
    $("[data-only-graduation]").hidden = state.serviceSlug !== "graduation";
    $("[data-only-partial]").hidden = state.sharePermission !== "PARTIAL" && state.sharePermission !== "NO";
  }

  // ─── Step 5 · Review ────────────────────────────────────────────────────

  function renderReview() {
    const svc = service();
    const p = pkg();
    const start = startDt();
    const rows: [string, string, number][] = [
      [S.steps.session, svc && p ? (svc.packages.length > 1 ? `${serviceName(svc)} — ${packageName(svc, p)}` : serviceName(svc)) : "—", 1],
      [S.summary.extras, chosenExtras().map((x) => (x.quantity > 1 ? `${extraName(x.extra)} × ${x.quantity}` : extraName(x.extra))).join(", ") || "—", 1],
      [S.steps.date, start ? `${start.toLocaleString(DateTime.DATE_HUGE)} · ${start.toLocaleString(DateTime.TIME_SIMPLE)}` : "—", 2],
      [S.steps.location, locationName() ?? "—", 3],
      [S.s5.client, [`${state.firstName.trim()} ${state.lastName.trim()}`.trim(), state.email.trim(), state.phone.trim()].filter(Boolean).join(" · "), 4],
    ];
    $("[data-review]").replaceChildren(
      ...rows.map(([label, value, target]) =>
        el(
          "div",
          { class: "grid grid-cols-[minmax(0,1fr)_auto] gap-x-5 gap-y-1 border-t border-line py-4 sm:grid-cols-[160px_minmax(0,1fr)_auto] sm:items-baseline" },
          el("span", { class: "eyebrow text-muted" }, label),
          el("span", { class: "col-span-2 row-start-2 break-words sm:col-span-1 sm:row-start-auto" }, value),
          el("button", { type: "button", class: "eyebrow col-start-2 row-start-1 text-[11px] text-muted hover:text-ink sm:col-start-auto", "data-goto": String(target), "aria-label": `${S.s5.edit}: ${label}` }, S.s5.edit),
        ),
      ),
    );
    const deposit = catalog?.settings.depositPercent ?? 50;
    const hours = catalog?.settings.replyWithinHours ?? 24;
    for (const node of $$("[data-how-text]")) node.textContent = fill(S.s5.howItems[Number(node.dataset.howText)].text, { hours, deposit });
    $<HTMLInputElement>("input[name=policyAccepted]").checked = state.policyAccepted;
  }

  // ─── Summary (aside) ────────────────────────────────────────────────────

  function renderSummary() {
    const svc = service();
    const p = pkg();
    const set = (key: string, value: string | null) => {
      const node = $(`[data-sum=${key}]`);
      node.textContent = value ?? S.summary.notYet;
      node.classList.toggle("italic", value === null);
      node.classList.toggle("text-muted", value === null);
    };
    set("session", svc && p ? `${svc.packages.length > 1 ? `${serviceName(svc)} · ${packageName(svc, p)}` : serviceName(svc)} · ${money(p.priceCents)}` : null);
    const extras = chosenExtras();
    $("[data-sum-row=extras]").hidden = extras.length === 0;
    $("[data-sum=extras]").textContent = extras.map((x) => `${extraName(x.extra)}${x.quantity > 1 ? ` × ${x.quantity}` : ""} · +${money(x.extra.priceCents * x.quantity)}`).join("\n");
    const start = startDt();
    set("date", start ? `${start.toLocaleString({ weekday: "short", month: "short", day: "numeric" })} · ${start.toLocaleString(DateTime.TIME_SIMPLE)}` : null);
    set("location", locationName());
    const t = totals();
    $("[data-sum=total]").textContent = t ? money(t.total) : "—";
    $("[data-sum=deposit]").textContent = t ? money(t.deposit) : "—";
    $("[data-sum=balance]").textContent = t ? money(t.balance) : "—";
    if (catalog) $("[data-sum=deposit-label]").textContent = fill(S.summary.deposit, { deposit: catalog.settings.depositPercent });
  }

  // ─── Errors ─────────────────────────────────────────────────────────────

  function showErrors(errors: FieldErrors) {
    for (const node of $$("[data-error-for]")) {
      const field = node.dataset.errorFor!;
      const key = errors[field];
      node.textContent = key ? S.errors[key] ?? S.errors.generic : "";
      node.hidden = !key;
      for (const input of $$<HTMLElement>(`[name="${field}"]`, form)) {
        if (key) input.setAttribute("aria-invalid", "true");
        else input.removeAttribute("aria-invalid");
      }
    }
    const first = Object.keys(errors)[0];
    stepError.textContent = first ? S.errors.fix : "";
    if (first) {
      const target = $$<HTMLElement>(`[name="${first}"]`, form).find((n) => !n.closest("[hidden]")) ?? $<HTMLElement>(`[data-error-for="${first}"]`);
      target?.focus?.();
    }
  }
  const clearErrors = () => showErrors({});
  const values = () => ({ ...state, serviceId: service()?.id ?? null, packageId: pkg()?.id ?? null });

  // ─── Navigation ─────────────────────────────────────────────────────────

  function render() {
    for (const section of $$("[data-step]")) section.hidden = Number(section.dataset.step) !== step;
    $("[data-step-of]").textContent = fill(S.stepOf, { n: step });
    for (const li of $$("[data-step-tab]")) {
      const n = Number(li.dataset.stepTab);
      li.classList.toggle("text-muted", n > step);
      li.classList.toggle("border-ink", n === step);
      li.classList.toggle("border-transparent", n !== step);
      li.querySelector("[data-step-num]")!.textContent = n < step ? "✓" : String(n).padStart(2, "0");
      if (n === step) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
    }
    backBtn.hidden = step === 1;
    nextBtn.textContent = step === STEPS ? S.s5.send : S.nav.continue;
    $("[data-no-payment]").hidden = step !== STEPS;
    if (step === 2) {
      // Open the month of the chosen day (so it is re-checked), else the one last shown, else this one.
      const current = studioToday().toFormat("yyyy-MM");
      const dayMonth = state.date && state.date.slice(0, 7) >= current ? state.date.slice(0, 7) : null;
      const shown = state.month && state.month >= current ? state.month : null;
      loadMonth(dayMonth ?? shown ?? current, { hopIfEmpty: dayMonth ? 0 : 2 });
    }
    if (step === 3) renderLocation();
    if (step === 4) renderDetails();
    if (step === 5) renderReview();
    renderSummary();
  }

  function goTo(target: number, { push = true, focus = true } = {}) {
    // Forward only through valid steps; backwards always.
    for (let s = step; s < target; s++) {
      const errors = validateStep(s, values());
      if (Object.keys(errors).length) {
        if (s !== step) {
          step = s;
          render();
        }
        showErrors(errors);
        if (!push) history.replaceState({ bookStep: step }, "");
        return false;
      }
    }
    clearErrors();
    step = Math.min(Math.max(target, 1), STEPS);
    if (push) history.pushState({ bookStep: step }, "");
    render();
    if (focus) {
      const heading = $<HTMLElement>(`[data-step="${step}"] h1`);
      heading.focus({ preventScroll: true });
      root.scrollIntoView({ block: "start", behavior: "smooth" });
    }
    return true;
  }

  // ─── Send ───────────────────────────────────────────────────────────────

  async function submit() {
    if (sending) return;
    const errors = validateStep(5, values());
    if (Object.keys(errors).length) return showErrors(errors);
    const svc = service();
    const p = pkg();
    if (!svc || !p || !state.date || !state.time || !state.locationKind) return goTo(1, { push: false });
    const hp = $<HTMLInputElement>("input[name=website]").value;
    const trimmed = (v: string) => v.trim() || null;
    const payload = {
      lang: D.lang,
      website: hp,
      serviceId: svc.id,
      packageId: p.id,
      extras: chosenExtras().map((x) => ({ extraId: x.extra.id, quantity: x.quantity })),
      startsAt: `${state.date}T${state.time}`, // studio time, no offset (the API reads it in America/Phoenix)
      locationKind: state.locationKind,
      locationName: state.locationKind === "CAMPUS" || state.locationKind === "OTHER" ? state.place.trim() : null,
      firstName: state.firstName.trim(),
      lastName: state.lastName.trim(),
      email: state.email.trim(),
      phone: state.phone.trim(),
      partySize: state.partySize || null,
      heardFrom: state.heardFrom || null,
      schoolAndColors: svc.slug === "graduation" ? trimmed(state.schoolAndColors) : null,
      photosNeededBy: state.photosNeededBy || null,
      inspo: trimmed(state.inspo),
      sharePermission: state.sharePermission || null,
      doNotPostNotes: state.sharePermission === "PARTIAL" || state.sharePermission === "NO" ? trimmed(state.doNotPostNotes) : null,
      clientNotes: trimmed(state.clientNotes),
      minorConsent: state.minorConsent,
      policyAccepted: state.policyAccepted,
    };
    sending = true;
    nextBtn.disabled = true;
    nextBtn.setAttribute("aria-busy", "true");
    nextBtn.textContent = S.s5.sending;
    stepError.textContent = "";
    try {
      const created = await sendRequest(payload);
      storage.clear();
      showDone(created);
    } catch (error) {
      handleSendError(error);
    } finally {
      sending = false;
      nextBtn.disabled = false;
      nextBtn.removeAttribute("aria-busy");
      if (step === STEPS) nextBtn.textContent = S.s5.send;
    }
  }

  function handleSendError(error: unknown) {
    const code = error instanceof ApiError ? error.code : null;
    if (code === "SLOT_TAKEN" || code === "SLOT_NOT_OFFERED") {
      state.time = null;
      monthCache.clear();
      save();
      goTo(2);
      stepError.textContent = code === "SLOT_TAKEN" ? S.errors.taken : S.errors.notOffered;
      return;
    }
    if (code === "SERVICE_UNAVAILABLE" || code === "PACKAGE_UNAVAILABLE" || code === "EXTRA_UNAVAILABLE") {
      loadCatalog().then(() => {
        goTo(1);
        stepError.textContent = S.errors.catalogChanged;
      });
      return;
    }
    if (code === "PHONE_INVALID") {
      goTo(4);
      showErrors({ phone: "phone" });
      return;
    }
    if (code === "LOCATION_REQUIRED") {
      goTo(3);
      showErrors({ place: "place" });
      return;
    }
    stepError.textContent = code === "RATE_LIMITED" ? S.errors.rateLimited : code === "OFFLINE" ? S.errors.offline : S.errors.generic;
  }

  function showDone(c: Created) {
    const start = DateTime.fromISO(c.startsAt, { zone: "utc" }).setZone(ZONE).setLocale(D.lang);
    const deposit = catalog?.settings.depositPercent ?? 50;
    $("[data-done-code]").textContent = fill(S.done.requestNo, { code: c.code });
    // "Request sent, Daniela." — the name is the visitor's text: a text node, never HTML.
    const [before, after = ""] = String(S.done.h1).split("{name}");
    $("[data-done-h1]").replaceChildren(before, el("em", {}, `${c.firstName}${after}.`));
    $("[data-done-when]").textContent = fill(S.done.when, { date: start.toLocaleString({ weekday: "long", month: "long", day: "numeric" }), time: start.toLocaleString(DateTime.TIME_SIMPLE), place: c.locationName });
    $("[data-done-reply]").textContent = fill(S.done.reply, { hours: c.replyWithinHours });
    for (const node of $$("[data-done-text]")) {
      node.textContent = fill(S.done.steps[Number(node.dataset.doneText)].text, { email: c.email, deposit, amount: money(c.depositCents) });
    }
    flow.hidden = true;
    $("[data-progress]").hidden = true;
    doneView.hidden = false;
    state = blankState();
    history.replaceState({ bookDone: true }, "");
    const h1 = $<HTMLElement>("[data-done-h1]");
    h1.focus({ preventScroll: true });
    root.scrollIntoView({ block: "start" });
  }

  // ─── Events ─────────────────────────────────────────────────────────────

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (step === STEPS) submit();
    else goTo(step + 1);
  });
  backBtn.addEventListener("click", () => goTo(step - 1));

  form.addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === "service") {
      state.serviceSlug = t.value;
      syncPackage();
      renderSession();
      renderDetails();
    } else if (t.name === "package") {
      state.packageId = Number(t.value);
      renderSummary();
    } else if (t.name === "locationKind") {
      state.locationKind = t.value;
      renderLocation();
      if (t.value === "CAMPUS" || t.value === "OTHER") $<HTMLInputElement>("input[name=place]").focus();
    } else if (t.name === "minorConsent") state.minorConsent = t.checked;
    else if (t.name === "policyAccepted") state.policyAccepted = t.checked;
    else if (t.name === "sharePermission") {
      state.sharePermission = t.value;
      renderDetails();
    }
    save();
  });
  form.addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement;
    if ((TEXT_FIELDS as readonly string[]).includes(t.name)) {
      (state as any)[t.name] = t.value;
      if (t.name === "place") renderSummary();
      // The error under a field goes away as soon as it's fixed.
      const errorNode = root.querySelector<HTMLElement>(`[data-error-for="${t.name}"]`);
      if (errorNode && !errorNode.hidden && !validateStep(step, values())[t.name]) {
        errorNode.hidden = true;
        t.removeAttribute("aria-invalid");
      }
      save();
    }
  });
  root.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-extra],[data-day],[data-time],[data-goto],[data-month-prev],[data-month-next],[data-cal-retry],[data-retry]");
    if (!target) return;
    if (target.dataset.extra) {
      const id = target.dataset.extra;
      const qty = Math.min(MAX_QTY, Math.max(0, (state.extras[id] ?? 0) + Number(target.dataset.delta)));
      if (qty === 0) delete state.extras[id];
      else state.extras[id] = qty;
      save();
      renderSession();
      root.querySelector<HTMLElement>(`[data-extra="${id}"][data-delta="${target.dataset.delta}"]:not([disabled])`)?.focus();
    } else if (target.dataset.day) {
      state.date = target.dataset.day;
      state.time = null;
      save();
      renderCalendar();
      $("[data-slots] button:not([disabled])")?.focus();
    } else if (target.dataset.time) {
      state.time = target.dataset.time;
      save();
      renderDay();
      clearErrors();
      $<HTMLElement>(`[data-time="${state.time}"]`).focus();
    } else if (target.dataset.goto) {
      goTo(Number(target.dataset.goto));
    } else if (target.hasAttribute("data-month-prev") || target.hasAttribute("data-month-next")) {
      const delta = target.hasAttribute("data-month-prev") ? -1 : 1;
      loadMonth(monthOf(state.month!).plus({ months: delta }).toFormat("yyyy-MM"));
    } else if (target.hasAttribute("data-cal-retry")) {
      loadMonth(state.month!);
    } else if (target.hasAttribute("data-retry")) {
      start();
    }
  });
  window.addEventListener("popstate", (e) => {
    if (!doneView.hidden) return; // the request is sent: Back leaves the page normally
    const target = Number((e.state as { bookStep?: number } | null)?.bookStep ?? 1);
    if (target < step) {
      clearErrors();
      step = target;
      render();
    } else if (target > step) goTo(target, { push: false });
  });

  // ─── Start ──────────────────────────────────────────────────────────────

  function restoreInputs() {
    for (const name of TEXT_FIELDS) {
      for (const input of $$<HTMLInputElement>(`[name="${name}"]`, form)) input.value = state[name] ?? "";
    }
    $<HTMLInputElement>("input[name=minorConsent]").checked = state.minorConsent;
    $<HTMLInputElement>("input[name=photosNeededBy]").min = studioToday().toISODate()!;
  }

  async function loadCatalog() {
    applyCatalog(await getCatalog());
  }

  async function start() {
    loading.hidden = false;
    fallback.hidden = true;
    flow.hidden = true;
    try {
      await loadCatalog();
    } catch {
      loading.hidden = true;
      fallback.hidden = false;
      return;
    }
    loading.hidden = true;
    flow.hidden = false;
    $("[data-progress]").hidden = false;
    // A draft from another day may hold a date that has passed.
    if (state.date && state.date < studioToday().toISODate()!) state.date = state.time = null;
    restoreInputs();
    step = 1;
    history.replaceState({ bookStep: 1 }, "");
    render();
  }

  start();
}
