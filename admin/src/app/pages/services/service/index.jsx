// Admin · Services · Service page (/services/:id) — one page per service, like the client page.
//   top bar (back to the list · prev/next · ⋯ menu) → identity (name, status) → numbers →
//   main column: Packages; side column: Details and the add-ons this service allows.
// Delete (⋯ → Delete service) only works while no booking uses it; otherwise the API answers 409
// and the toast tells Areli to hide it instead.
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import PropTypes from "prop-types";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { ConfirmModal } from "components/shared/ConfirmModal";
import { Page } from "components/shared/Page";
import { StatRow } from "components/shared/layout/StatRow";
import { deleteServiceThunk, loadServiceThunk, useServicesStore } from "slices";

import { ToneTag, ActionButton } from "../../bookings/parts";
import { priceRange, servicePath, statusInfo } from "../labels";
import { PackagesBlock } from "./PackagesBlock";
import { ServiceSkeleton } from "./ServiceSkeleton";
import { DetailsBlock, ExtrasBlock } from "./SideBlocks";

export default function ServicePage() {
  const { id: rawId } = useParams();
  const id = Number(rawId);
  const { goBack, pager } = useNavigation(id);
  const state = useServicesStore((s) => s.service);
  const resetService = useServicesStore((s) => s.resetService);
  const data = state.data?.id === id ? state.data : null;

  useEffect(() => {
    resetService();
    loadServiceThunk(id);
    // Leaving the page must not leave a stale service behind for the next one.
    return () => resetService();
  }, [id, resetService]);

  return (
    <Page title={data ? data.name : "Service"}>
      <div className="page-vt px-(--margin-x) pb-12">
        {data ? (
          <Body key={id} service={data} goBack={goBack} pager={pager} />
        ) : (
          <>
            <TopBar goBack={goBack} />
            {state.error && !state.loading ? (
              <div className="mt-8">
                <p className="text-ink-muted">{state.error === "not_found" ? "This service doesn’t exist or was deleted." : "This service couldn’t be loaded."}</p>
                <ActionButton className="mt-4" onClick={goBack}>
                  Back to Services
                </ActionButton>
              </div>
            ) : (
              <ServiceSkeleton />
            )}
          </>
        )}
      </div>
    </Page>
  );
}

// Back to the list you came from, and prev/next inside it (only while the store still holds it).
function useNavigation(id) {
  const navigate = useNavigate();
  const location = useLocation();
  const items = useServicesStore((s) => s.list.items);

  const goBack = useCallback(() => {
    if (location.key !== "default") navigate(-1);
    else navigate("/services", { replace: true, viewTransition: true });
  }, [location.key, navigate]);

  const index = items.findIndex((s) => s.id === id);
  const go = (to) => navigate(servicePath(to.id), { replace: true, viewTransition: true });
  const pager =
    index >= 0 && items.length > 1
      ? {
          position: index + 1,
          total: items.length,
          prev: index > 0 ? () => go(items[index - 1]) : null,
          next: index < items.length - 1 ? () => go(items[index + 1]) : null,
        }
      : null;

  return { goBack, pager };
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

function TopBar({ goBack, pager, onDelete }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 pt-3">
      <button
        type="button"
        onClick={goBack}
        aria-label="Back to Services"
        className="-ml-2 inline-flex min-h-11 items-center gap-2 px-2 caps text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeftIcon className="size-5" aria-hidden="true" />
        <span>Services</span>
      </button>
      <div className="flex items-center gap-1">
        {pager && (
          <div className="flex items-center text-small text-ink-muted" role="group" aria-label="Browse services">
            <IconButton label="Previous service" onClick={pager.prev} disabled={!pager.prev}>
              <ChevronLeftIcon className="size-5" />
            </IconButton>
            <span aria-live="polite" className="px-1 tabular-nums">
              {pager.position} of {pager.total}
            </span>
            <IconButton label="Next service" onClick={pager.next} disabled={!pager.next}>
              <ChevronRightIcon className="size-5" />
            </IconButton>
          </div>
        )}
        {onDelete && (
          <Menu as="div" className="relative">
            <MenuButton aria-label="More actions" className="flex size-11 items-center justify-center text-ink-muted transition-colors hover:text-ink">
              <EllipsisHorizontalIcon className="size-6" />
            </MenuButton>
            <MenuItems anchor="bottom end" className="z-30 mt-1 w-56 border border-line-strong bg-paper py-1 shadow-soft outline-hidden dark:shadow-none">
              <MenuItem>
                <button type="button" onClick={onDelete} className={clsx("flex min-h-11 w-full items-center px-4 text-left text-body text-alert data-focus:bg-line")}>
                  Delete service
                </button>
              </MenuItem>
            </MenuItems>
          </Menu>
        )}
      </div>
    </div>
  );
}

function Body({ service, goBack, pager }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const busy = useServicesStore((s) => s.busy);
  const info = statusInfo(service.status);
  const visible = service.packages.filter((p) => !p.hidden);
  const prices = visible.map((p) => p.priceCents);
  const offered = service.extras.filter((e) => e.offered).length;

  const remove = async () => {
    const res = await deleteServiceThunk(service.id);
    setConfirmDelete(false);
    if (res.ok) {
      toast.success(`${service.name} deleted`);
      goBack();
    } else {
      toast.error(res.error?.message ?? "Could not delete the service");
    }
  };

  return (
    <>
      <TopBar goBack={goBack} pager={pager} onDelete={() => setConfirmDelete(true)} />

      <header className="mt-4 sm:mt-6">
        <p className="caps text-ink-muted">Service</p>
        <h1 className="mt-2 text-[2.25rem] leading-[1.1] tracking-[-0.01em] text-ink sm:text-title-l">{service.name}</h1>
        <div className="mt-3">
          <ToneTag tone={info.tone}>{info.label}</ToneTag>
        </div>
      </header>

      <StatRow
        className="mt-8"
        items={[
          { label: "Packages", value: service.packages.length },
          { label: "Price", value: priceRange(prices.length ? Math.min(...prices) : null, prices.length ? Math.max(...prices) : null) },
          { label: "Add-ons", value: offered },
          { label: "Bookings", value: service.bookingCount },
        ]}
      />

      <div className="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-10">
          <PackagesBlock service={service} />
        </div>
        <aside className="space-y-6">
          <DetailsBlock service={service} />
          <ExtrasBlock service={service} />
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
            title: `Delete ${service.name}?`,
            description:
              service.bookingCount > 0
                ? `${service.bookingCount} ${service.bookingCount === 1 ? "booking uses" : "bookings use"} this service, so it can only be hidden. Set its status to Hidden instead.`
                : "Its packages go with it. This can’t be undone.",
            actionText: "Delete service",
          },
        }}
      />
    </>
  );
}

TopBar.propTypes = { goBack: PropTypes.func.isRequired, pager: PropTypes.object, onDelete: PropTypes.func };
IconButton.propTypes = { label: PropTypes.string, children: PropTypes.node };
Body.propTypes = { service: PropTypes.object.isRequired, goBack: PropTypes.func.isRequired, pager: PropTypes.object };
