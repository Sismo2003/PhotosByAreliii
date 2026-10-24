// Admin · Clients · Client page (/clients/:id) — one page per client (design: AdminClients.dc.html,
// the profile panel, as a full page like the booking page).
//   top bar (back to the list · prev/next · ⋯ menu)
//   identity (since, name, status) → numbers → main column: Sessions, History
//   side column: Contact (+ Edit details), Gallery login (read only), Rebook reminder, Private notes
// Soft delete (⋯ → Delete client) hides the client everywhere; bookings and payments stay as they are.
//
// INTEGRATION(login): the client login does not exist yet, so "Gallery login" only shows the
// state. Invite / reset actions and the "email changed" notice plug in here — see
// docs/clients-page-integraciones.md.
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import PropTypes from "prop-types";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { ConfirmModal } from "components/shared/ConfirmModal";
import { Page } from "components/shared/Page";
import { StatRow } from "components/shared/layout/StatRow";
import { deleteClientThunk, loadClientThunk, useClientsStore } from "slices";
import { formatDate } from "utils/date";
import { formatPhone, telHref } from "utils/phone";

import { ActionButton, History, KeyValueRows, ToneTag } from "../../bookings/parts";
import { Block } from "../../bookings/booking/layout";
import { ReturningTag } from "../cells";
import { clientPath } from "../helpers";
import { clientStatusLabel, HEARD_FROM, loginDetail, loginInfo, money, sessionsLabel, TABS } from "../labels";
import { ClientSkeleton } from "./ClientSkeleton";
import { EditDetails } from "./EditDetails";
import { NotesBlock } from "./NotesBlock";
import { ReminderBlock } from "./ReminderBlock";
import { SessionsBlock } from "./SessionsBlock";

export default function ClientPage() {
  const { id: rawId } = useParams();
  const id = Number(rawId);
  const { goBack, backLabel, pager } = useNavigation(id);
  const profile = useClientsStore((s) => s.client);
  const resetClient = useClientsStore((s) => s.resetClient);
  const data = profile.data?.client?.id === id ? profile.data : null;

  useEffect(() => {
    resetClient();
    loadClientThunk(id);
    // Leaving the page must not leave a stale client behind for the next one.
    return () => resetClient();
  }, [id, resetClient]);

  return (
    <Page title={data ? data.client.displayName : "Client"}>
      <div className="page-vt px-(--margin-x) pb-12">
        {data ? (
          <Body key={id} data={data} goBack={goBack} backLabel={backLabel} pager={pager} />
        ) : (
          <>
            <TopBar goBack={goBack} backLabel={backLabel} />
            {profile.error === "not_found" || (profile.error && !profile.loading) ? (
              <div className="mt-8">
                <p className="text-ink-muted">
                  {profile.error === "not_found" ? "This client doesn’t exist or was deleted." : "This client couldn’t be loaded."}
                </p>
                <ActionButton className="mt-4" onClick={goBack}>
                  Back to {backLabel}
                </ActionButton>
              </div>
            ) : (
              <ClientSkeleton />
            )}
          </>
        )}
      </div>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Navigation: back to the list you came from, and prev/next inside it.
// ---------------------------------------------------------------------------

function useNavigation(id) {
  const navigate = useNavigate();
  const location = useLocation();
  const storeTab = useClientsStore((s) => s.tab);
  const items = useClientsStore((s) => s.list.items);

  const from = location.state?.from ?? storeTab;
  const backLabel = "Clients";

  const goBack = useCallback(() => {
    if (location.key !== "default") navigate(-1);
    else navigate("/clients", { replace: true, viewTransition: true });
  }, [location.key, navigate]);

  // Prev / next only when the store still holds the list this client was opened from.
  const list = storeTab === from ? items : [];
  const index = list.findIndex((c) => c.id === id);
  const go = (to) => navigate(clientPath(to.id), { replace: true, state: { from }, viewTransition: true });
  const pager =
    index >= 0 && list.length > 1
      ? {
          position: index + 1,
          total: list.length,
          prev: index > 0 ? () => go(list[index - 1]) : null,
          next: index < list.length - 1 ? () => go(list[index + 1]) : null,
        }
      : null;

  return { goBack, backLabel, pager, tabLabel: TABS.find((t) => t.id === from)?.label };
}

// ---------------------------------------------------------------------------
// Top bar + ⋯ menu
// ---------------------------------------------------------------------------

function TopBar({ goBack, backLabel, pager, menu }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 pt-3">
      <button
        type="button"
        onClick={goBack}
        aria-label={`Back to ${backLabel}`}
        className="-ml-2 inline-flex min-h-11 items-center gap-2 px-2 caps text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeftIcon className="size-5" aria-hidden="true" />
        <span>{backLabel}</span>
      </button>
      <div className="flex items-center gap-1">
        {pager && (
          <div className="flex items-center text-small text-ink-muted" role="group" aria-label="Browse clients">
            <IconButton label="Previous client" onClick={pager.prev} disabled={!pager.prev}>
              <ChevronLeftIcon className="size-5" />
            </IconButton>
            <span aria-live="polite" className="px-1 tabular-nums">
              {pager.position} of {pager.total}
            </span>
            <IconButton label="Next client" onClick={pager.next} disabled={!pager.next}>
              <ChevronRightIcon className="size-5" />
            </IconButton>
          </div>
        )}
        {menu}
      </div>
    </div>
  );
}

function IconButton({ label, children, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex size-11 items-center justify-center text-ink-muted transition-colors hover:text-ink disabled:opacity-30"
      {...rest}
    >
      {children}
    </button>
  );
}

function MoreMenu({ client, onDelete }) {
  const items = [
    {
      id: "copy",
      label: "Copy email",
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(client.email);
          toast.success("Email copied");
        } catch {
          toast.error("Could not copy the email");
        }
      },
    },
    { id: "delete", label: "Delete client", danger: true, onClick: onDelete },
  ];

  return (
    <Menu as="div" className="relative">
      <MenuButton
        aria-label="More actions"
        className="flex size-11 items-center justify-center text-ink-muted transition-colors hover:text-ink"
      >
        <EllipsisHorizontalIcon className="size-6" />
      </MenuButton>
      <MenuItems
        anchor="bottom end"
        className="z-30 mt-1 w-56 border border-line-strong bg-paper py-1 shadow-soft outline-hidden dark:shadow-none"
      >
        {items.map((it, i) => (
          <MenuItem key={it.id}>
            <button
              type="button"
              onClick={it.onClick}
              className={clsx(
                "flex min-h-11 w-full items-center px-4 text-left text-body data-focus:bg-line",
                it.danger ? "text-alert" : "text-ink",
                it.danger && items[i - 1] && !items[i - 1].danger && "border-t border-line",
              )}
            >
              {it.label}
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}

// ---------------------------------------------------------------------------
// Body
// ---------------------------------------------------------------------------

function Body({ data, goBack, backLabel, pager }) {
  const { client: c, sessions, history } = data;
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const busy = useClientsStore((s) => s.busy);
  const login = loginInfo(c.login);

  const remove = async () => {
    const res = await deleteClientThunk(c.id);
    setConfirmDelete(false);
    if (res.ok) {
      toast.success(`${c.displayName} deleted`);
      goBack();
    } else {
      toast.error(res.error?.message ?? "Could not delete the client");
    }
  };

  return (
    <>
      <TopBar goBack={goBack} backLabel={backLabel} pager={pager} menu={<MoreMenu client={c} onDelete={() => setConfirmDelete(true)} />} />

      {/* Identity */}
      <header className="mt-4 sm:mt-6">
        <p className="caps text-ink-muted">Client since {formatDate(c.createdAt, "LLL yyyy")}</p>
        <h1 className="mt-1 text-[2rem] leading-tight text-ink sm:text-[2.5rem]">{c.displayName}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <ToneTag tone={c.status?.tone}>{clientStatusLabel(c.status)}</ToneTag>
          {c.returning && <ReturningTag />}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/bookings/new"
            state={{ client: c }}
            viewTransition
            className="inline-flex min-h-11 items-center justify-center border border-ink bg-ink px-4 caps whitespace-nowrap text-on-ink transition-colors hover:bg-ink/85"
          >
            New booking
          </Link>
          {!editing && <ActionButton onClick={() => setEditing(true)}>Edit details</ActionButton>}
        </div>
      </header>

      <StatRow
        className="mt-8"
        items={[
          { label: "Sessions", value: c.sessionCount },
          { label: "Received", value: money(c.receivedCents) },
          { label: "Balance due", value: money(c.balanceCents) },
          { label: "Next session", value: c.nextSessionAt ? formatDate(c.nextSessionAt, "LLL d") : "—" },
        ]}
      />

      <div className="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-10">
          <SessionsBlock sessions={sessions} />
          <HistoryBlock events={history} />
        </div>

        <aside className="flex min-w-0 flex-col gap-8">
          <Block title={editing ? "Edit details" : "Contact"} boxed>
            {editing ? (
              <EditDetails client={c} onClose={() => setEditing(false)} />
            ) : (
              <KeyValueRows
                rows={[
                  c.phone && [
                    "Phone",
                    <a key="p" href={telHref(c.phone)} className="underline-offset-2 hover:underline">
                      {formatPhone(c.phone)}
                    </a>,
                  ],
                  [
                    "Email",
                    <a key="e" href={`mailto:${c.email}`} className="break-all underline-offset-2 hover:underline">
                      {c.email}
                    </a>,
                  ],
                  c.instagram && ["Instagram", c.instagram],
                  c.heardFrom && ["Found me via", HEARD_FROM.find((o) => o.value === c.heardFrom)?.label ?? c.heardFrom],
                ]}
              />
            )}
          </Block>

          <Block title="Gallery login" boxed>
            <ToneTag tone={login.tone}>{login.label}</ToneTag>
            {loginDetail(c.login) && <p className="mt-2 text-ink-muted">{loginDetail(c.login)}</p>}
          </Block>

          <ReminderBlock clientId={c.id} reminder={c.reminder} />
          <NotesBlock clientId={c.id} notes={c.privateNotes} />
        </aside>
      </div>

      <ConfirmModal
        show={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onOk={remove}
        confirmLoading={busy}
        state="pending"
        messages={{
          pending: {
            title: `Delete ${c.displayName}?`,
            description: `They disappear from Clients and can’t sign in. Their ${sessionsLabel(sessions.length).toLowerCase()} and payments are not touched.`,
            actionText: "Delete client",
          },
        }}
      />
    </>
  );
}

// Every event, in a box of limited height that scrolls.
function HistoryBlock({ events }) {
  return (
    <Block title="History">
      <div className="max-h-80 overflow-y-auto overscroll-contain pr-2">
        <History events={events} />
      </div>
    </Block>
  );
}

TopBar.propTypes = { goBack: PropTypes.func, backLabel: PropTypes.string, pager: PropTypes.object, menu: PropTypes.node };
IconButton.propTypes = { label: PropTypes.string, children: PropTypes.node };
MoreMenu.propTypes = { client: PropTypes.object, onDelete: PropTypes.func };
Body.propTypes = {
  data: PropTypes.object.isRequired,
  goBack: PropTypes.func,
  backLabel: PropTypes.string,
  pager: PropTypes.object,
};
HistoryBlock.propTypes = { events: PropTypes.array };
