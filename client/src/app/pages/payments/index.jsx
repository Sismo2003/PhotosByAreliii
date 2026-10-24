// /client/payments · money per session (docs/portal-cliente-plan.md §1.3). Each booking is a progress
// ring (paid of total, what's left in the middle); tapping it unfolds a ticket-style receipt. Payments
// are manual — Zelle / Cash App handles come from shared/site.js; missing ones aren't shown.
// Amounts are computed by the API with the admin's own math (booking-derive), never here.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { CheckIcon, ChevronDownIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";

import { PAYMENTS } from "@shared/site";
import { Skeleton } from "components/ui";
import { Chip, ChipRow } from "components/Chip";
import { ContactActions } from "components/ContactActions";
import { ErrorState } from "components/ErrorState";
import { useRequest } from "hooks/useRequest";
import { useDocumentTitle } from "hooks/useDocumentTitle";
import { listPayments } from "services/portal";
import { formatDate } from "utils/date";
import { formatCents } from "utils/money";

const owes = (b) => b.money.balanceCents > 0 || b.money.depositLeftCents > 0;

function Ring({ paid, total, size = 96 }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const share = total > 0 ? Math.min(Math.max(paid / total, 0), 1) : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-line" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - share)}
        className="stroke-ink transition-[stroke-dashoffset] duration-700 ease-out"
      />
    </svg>
  );
}

/** One line of the receipt. `strong` = totals. */
function Line({ label, detail, amount, strong }) {
  return (
    <div className={clsx("flex items-baseline justify-between gap-4 py-1.5", strong ? "text-ink" : "text-ink-muted")}>
      <span className="min-w-0">
        <span className={strong ? "text-body" : "text-small"}>{label}</span>
        {detail && <span className="block text-small text-ink-muted">{detail}</span>}
      </span>
      <span className={clsx("shrink-0 tabular-nums", strong ? "text-body" : "text-small")}>{amount}</span>
    </div>
  );
}

function Receipt({ booking }) {
  const { t } = useTranslation();
  const { receipt, money } = booking;
  const signed = (cents) => (cents < 0 ? `−${formatCents(-cents)}` : formatCents(cents));
  return (
    <div className="border-t border-dashed border-line-strong px-5 py-4">
      <Line label={booking.package || booking.service} amount={formatCents(receipt.packageCents)} />
      {receipt.extras.map((e) => (
        <Line
          key={e.name}
          label={e.name}
          detail={e.quantity > 1 ? `${e.quantity} × ${formatCents(e.unitCents)}` : null}
          amount={formatCents(e.unitCents * e.quantity)}
        />
      ))}
      {receipt.travelFeeCents !== 0 && <Line label={t("payments.travelFee")} amount={signed(receipt.travelFeeCents)} />}
      {receipt.adjustmentCents !== 0 && <Line label={t("payments.adjustment")} amount={signed(receipt.adjustmentCents)} />}
      <div className="my-2 border-t border-dashed border-line" />
      <Line label={t("payments.total")} amount={formatCents(money.totalCents)} strong />

      {receipt.payments.length > 0 && (
        <>
          <div className="my-2 border-t border-dashed border-line" />
          {receipt.payments.map((p, i) => (
            <Line
              key={i}
              label={t(`payments.kind.${p.kind}`)}
              detail={`${formatDate(p.receivedAt, "LLL d, yyyy")} · ${t(`payments.method.${p.method}`)}`}
              amount={p.kind === "REFUND" ? `+${formatCents(p.amountCents)}` : `−${formatCents(p.amountCents)}`}
            />
          ))}
        </>
      )}
      {booking.state !== "cancelled" && (
        <>
          <div className="my-2 border-t border-dashed border-line" />
          <Line label={t("payments.balance")} amount={formatCents(money.balanceCents)} strong />
        </>
      )}
    </div>
  );
}

function Status({ booking }) {
  const { t } = useTranslation();
  const { money, state } = booking;
  if (state === "cancelled") return <p className="text-small text-ink-muted">{t("payments.status.cancelled")}</p>;
  if (money.depositLeftCents > 0) {
    return (
      <p className="text-small text-warning">
        {money.depositDueAt
          ? t("payments.status.depositDue", { amount: formatCents(money.depositLeftCents), date: formatDate(money.depositDueAt, "LLL d, h:mm a") })
          : t("payments.status.depositLeft", { amount: formatCents(money.depositLeftCents) })}
      </p>
    );
  }
  if (money.balanceCents > 0) return <p className="text-small text-ink-muted">{t("payments.status.depositPaid")}</p>;
  return <p className="text-small text-success">{t("payments.status.paid")}</p>;
}

function PaymentItem({ booking }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { money } = booking;
  const id = `receipt-${booking.code}`;
  return (
    <article className="border border-line">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-5 p-5 text-left"
      >
        <div className="relative shrink-0">
          <Ring paid={money.paidCents} total={money.totalCents} />
          <span className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-body tabular-nums text-ink">{formatCents(booking.state === "cancelled" ? money.paidCents : money.balanceCents)}</span>
            <span className="text-[0.625rem] tracking-wide text-ink-muted uppercase">
              {booking.state === "cancelled" ? t("payments.ring.kept") : t("payments.ring.left")}
            </span>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="caps text-ink-muted">{formatDate(booking.startsAt, "LLL d, yyyy")}</p>
          <p className="mt-1 truncate text-body text-ink">{booking.service}</p>
          <p className="text-small text-ink-muted">
            {t("payments.paidOf", { paid: formatCents(money.paidCents), total: formatCents(money.totalCents) })}
          </p>
          <div className="mt-1.5">
            <Status booking={booking} />
          </div>
        </div>
        <ChevronDownIcon className={clsx("size-5 shrink-0 text-ink-muted transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      <div id={id} hidden={!open}>
        <Receipt booking={booking} />
      </div>
    </article>
  );
}

function CopyRow({ label, value }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard (old browser, insecure context): the value is on screen to copy by hand.
    }
  };
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 px-1 py-3">
      <span className="min-w-0">
        <span className="block text-small text-ink-muted">{label}</span>
        <span className="block truncate text-body text-ink select-all">{value}</span>
      </span>
      <button
        type="button"
        onClick={copy}
        className="caps flex min-h-11 shrink-0 items-center gap-1.5 border border-line px-3 text-ink transition-colors hover:border-ink"
        aria-label={t("payments.copyLabel", { what: label })}
      >
        {copied ? <CheckIcon className="size-4" aria-hidden="true" /> : <DocumentDuplicateIcon className="size-4" aria-hidden="true" />}
        <span aria-live="polite">{copied ? t("payments.copied") : t("payments.copy")}</span>
      </button>
    </div>
  );
}

function HowToPay() {
  const { t } = useTranslation();
  const methods = [
    PAYMENTS.zelle && { label: t("payments.method.ZELLE"), value: PAYMENTS.zelle },
    PAYMENTS.cashApp && { label: t("payments.method.CASH_APP"), value: PAYMENTS.cashApp },
  ].filter(Boolean);
  return (
    <section className="mt-10">
      <h2 className="field-label mb-2 px-1">{t("payments.howToPay.title")}</h2>
      {methods.length > 0 && <div className="mb-4 divide-y divide-line border-y border-line">{methods.map((m) => <CopyRow key={m.label} {...m} />)}</div>}
      <p className="mb-4 px-1 text-small text-ink-muted">{methods.length ? t("payments.howToPay.note") : t("payments.howToPay.askAreli")}</p>
      <ContactActions />
    </section>
  );
}

function PaymentsSkeleton() {
  return (
    <div aria-busy="true" className="space-y-4">
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-5 border border-line p-5">
          <Skeleton className="size-24 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Payments() {
  const { t } = useTranslation();
  useDocumentTitle(t("payments.title"));
  const { status, data, error, retry } = useRequest(() => listPayments(), []);
  const [view, setView] = useState(null); // null = pending if anything is owed

  const bookings = data?.bookings ?? [];
  const pending = bookings.filter(owes);
  const settled = bookings.filter((b) => !owes(b));
  const shown = view ?? (pending.length || !settled.length ? "pending" : "paid");
  const list = shown === "pending" ? pending : settled;

  return (
    <div className="mx-auto max-w-xl px-4 pt-[calc(var(--safe-top)+1.5rem)] sm:px-8 md:pt-10">
      <h1 className="mb-6 text-title-l tracking-[-0.01em] text-ink">{t("payments.title")}</h1>

      {status === "done" && bookings.length > 0 && (
        <ChipRow>
          <Chip on={shown === "pending"} onClick={() => setView("pending")}>
            {t("payments.filters.pending", { count: pending.length })}
          </Chip>
          <Chip on={shown === "paid"} onClick={() => setView("paid")}>
            {t("payments.filters.paid")}
          </Chip>
        </ChipRow>
      )}

      {status === "loading" && <PaymentsSkeleton />}
      {status === "error" && <ErrorState error={error} onRetry={retry} />}

      {status === "done" && (
        <>
          {list.length === 0 ? (
            <div className="border border-line px-6 py-14 text-center">
              <p className="text-title text-ink">{shown === "pending" ? t("payments.empty.pending") : t("payments.empty.paid")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {list.map((b) => (
                <PaymentItem key={b.code} booking={b} />
              ))}
            </div>
          )}
          {pending.length > 0 && <HowToPay />}
        </>
      )}
    </div>
  );
}
