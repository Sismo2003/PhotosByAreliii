// Admin · Gallery (/galleries/:id) — design: GalleryEditor / GalleryCover / GallerySettings /
// GalleryDeliver / GalleryActivity (one prototype, four tabs). One page per gallery:
//   top bar (back to the list · ⋯ menu) → identity (booking, name, state) → Deliver →
//   tabs Photos · Cover · Settings · Activity (kept in ?tab=) → numbers → the tab.
//
// INTEGRATION(correos): Deliver saves the delivery and shows the details to send by hand; the
// email is the Correos module's job. INTEGRATION(client-gallery): "Preview as client" waits for the
// client's own gallery. Both in docs/galleries-pendientes.md.
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ArrowLeftIcon, EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import PropTypes from "prop-types";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";

import { Page } from "components/shared/Page";
import { StatRow } from "components/shared/layout/StatRow";
import { useSectionSkin } from "components/shared/layout/useSectionSkin";
import { loadGalleryThunk, useGalleriesStore } from "slices";
import { formatDate } from "utils/date";

import { bookingPath } from "../../bookings/helpers";
import { ActionButton, ToneTag } from "../../bookings/parts";
import { clientPath } from "../../clients/helpers";
import { publicGalleryUrl } from "../helpers";
import { INTEGRATIONS } from "../integrations";
import { formatSize, shortDate, stateInfo } from "../labels";
import { ActivityTab } from "./ActivityTab";
import { CoverTab } from "./CoverTab";
import { DeliverDialog } from "./DeliverDialog";
import { GallerySkeleton } from "./GallerySkeleton";
import { PhotosTab } from "./PhotosTab";
import { SettingsTab } from "./SettingsTab";

const TABS = [
  { id: "photos", label: "Photos" },
  { id: "cover", label: "Cover" },
  { id: "settings", label: "Settings" },
  { id: "activity", label: "Activity" },
];

export default function GalleryPage() {
  const { id: rawId } = useParams();
  const id = Number(rawId);
  const navigate = useNavigate();
  const location = useLocation();
  const state = useGalleriesStore((s) => s.gallery);
  const resetGallery = useGalleriesStore((s) => s.resetGallery);
  const gallery = state.data?.id === id ? state.data : null;

  useEffect(() => {
    resetGallery();
    loadGalleryThunk(id);
    // Leaving the page must not leave a stale gallery behind for the next one.
    return () => resetGallery();
  }, [id, resetGallery]);

  const goBack = useCallback(() => {
    if (location.key !== "default") navigate(-1);
    else navigate("/galleries", { replace: true, viewTransition: true });
  }, [location.key, navigate]);

  return (
    <Page title={gallery ? gallery.title : "Gallery"}>
      <div className="page-vt px-(--margin-x) pb-12">
        {gallery ? (
          <Body key={id} gallery={gallery} goBack={goBack} />
        ) : (
          <>
            <TopBar goBack={goBack} />
            {state.error ? (
              <div className="mt-8">
                <p className="text-ink-muted">{state.error === "not_found" ? "This gallery doesn’t exist or was deleted." : "This gallery couldn’t be loaded."}</p>
                <ActionButton className="mt-4" onClick={goBack}>
                  Back to Galleries
                </ActionButton>
              </div>
            ) : (
              <GallerySkeleton />
            )}
          </>
        )}
      </div>
    </Page>
  );
}

function TopBar({ goBack, menu }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 pt-3">
      <button
        type="button"
        onClick={goBack}
        aria-label="Back to Galleries"
        className="-ml-2 inline-flex min-h-11 items-center gap-2 px-2 caps text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeftIcon className="size-5" aria-hidden="true" />
        <span>Galleries</span>
      </button>
      {menu}
    </div>
  );
}

function MoreMenu({ gallery }) {
  const items = [
    {
      id: "copy",
      label: "Copy gallery link",
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(publicGalleryUrl(gallery.slug));
          toast.success("Link copied");
        } catch {
          toast.error("Could not copy the link");
        }
      },
    },
  ];
  return (
    <Menu as="div" className="relative">
      <MenuButton aria-label="More actions" className="flex size-11 items-center justify-center text-ink-muted transition-colors hover:text-ink">
        <EllipsisHorizontalIcon className="size-6" />
      </MenuButton>
      <MenuItems anchor="bottom end" className="z-30 mt-1 w-56 border border-line-strong bg-paper py-1 shadow-soft outline-hidden dark:shadow-none">
        {items.map((it) => (
          <MenuItem key={it.id}>
            <button type="button" onClick={it.onClick} className="flex min-h-11 w-full items-center px-4 text-left text-body text-ink data-focus:bg-line">
              {it.label}
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}

function Body({ gallery, goBack }) {
  const { isShadow } = useSectionSkin();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get("tab")) ? params.get("tab") : "photos";
  const [deliver, setDeliver] = useState(false);
  const info = stateInfo(gallery.state);
  const expired = gallery.state.key === "expired";
  const delivered = gallery.status === "DELIVERED";
  const visible = gallery.totals.photoCount - gallery.totals.hiddenCount;
  const cantDeliver = expired ? "This gallery expired." : visible === 0 ? "Add at least one visible photo first." : null;

  const setTab = (id) => setParams(id === "photos" ? {} : { tab: id }, { replace: true });

  return (
    <>
      <TopBar goBack={goBack} menu={<MoreMenu gallery={gallery} />} />

      {/* Identity */}
      <header className="mt-4 sm:mt-6">
        <p className="caps text-ink-muted">
          {gallery.booking ? (
            <Link to={bookingPath(gallery.booking.id)} className="underline-offset-2 hover:underline">
              Booking {gallery.booking.code}
            </Link>
          ) : (
            "No booking"
          )}
          {gallery.booking && <span> · {formatDate(gallery.booking.startsAt, "ccc, LLL d")}</span>}
        </p>
        <h1 className="mt-1 text-[2rem] leading-tight text-ink sm:text-[2.5rem]">{gallery.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-small">
          <ToneTag tone={info.tone}>{info.label}</ToneTag>
          <Link to={clientPath(gallery.client.id)} className="text-ink-muted underline-offset-2 hover:text-ink hover:underline">
            {gallery.client.displayName}
          </Link>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <ActionButton solid disabled={Boolean(cantDeliver)} title={cantDeliver ?? undefined} onClick={() => setDeliver(true)}>
            {delivered ? "Send again" : "Deliver to client"}
          </ActionButton>
          <ActionButton disabled={!INTEGRATIONS.previewAsClient.ready} title={INTEGRATIONS.previewAsClient.pendingNote}>
            Preview as client
          </ActionButton>
          {cantDeliver && !expired && <p className="text-small text-ink-muted">{cantDeliver}</p>}
        </div>
      </header>

      {/* Tabs */}
      <nav
        aria-label="Gallery sections"
        className={clsx("mt-8 flex max-w-full gap-1 overflow-x-auto rounded-full p-1 sm:inline-flex", isShadow ? "bg-paper-alt" : "border border-line")}
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => !active && setTab(t.id)}
              className={clsx(
                "flex min-h-10 shrink-0 items-center rounded-full px-4 text-body font-medium transition-colors",
                active ? (isShadow ? "bg-paper text-ink shadow-sm" : "bg-paper-alt text-ink ring-1 ring-line-strong") : "text-ink-muted hover:text-ink",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      <StatRow
        className="mt-6"
        items={[
          { label: "Photos", value: gallery.totals.photoCount },
          { label: "Hidden", value: gallery.totals.hiddenCount },
          { label: "Size", value: formatSize(gallery.totals.sizeBytes) },
          { label: delivered ? "Available until" : "Status", value: delivered ? shortDate(gallery.expiresAt) : "Draft" },
        ]}
      />

      <div className="mt-8">
        {tab === "photos" && <PhotosTab gallery={gallery} />}
        {tab === "cover" && <CoverTab gallery={gallery} />}
        {tab === "settings" && <SettingsTab gallery={gallery} onDeleted={() => navigate("/galleries", { replace: true })} />}
        {tab === "activity" && <ActivityTab gallery={gallery} />}
      </div>

      {deliver && <DeliverDialog gallery={gallery} show={deliver} onClose={() => setDeliver(false)} />}
    </>
  );
}

TopBar.propTypes = { goBack: PropTypes.func, menu: PropTypes.node };
MoreMenu.propTypes = { gallery: PropTypes.object.isRequired };
Body.propTypes = { gallery: PropTypes.object.isRequired, goBack: PropTypes.func };
