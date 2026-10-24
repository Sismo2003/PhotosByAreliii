// Import Dependencies
import { Portal } from "@headlessui/react";
import { NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import { XMarkIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

// Local Imports
import { useAuthContext } from "app/contexts/auth/context";
import { useBreakpointsContext } from "app/contexts/breakpoint/context";
import { useSidebarContext } from "app/contexts/sidebar/context";
import { navigation } from "app/navigation";
import { StorageBar } from "components/shared/storage/StorageBar";
import { useStorageStatus } from "components/shared/storage/useStorageStatus";
import { useDidUpdate } from "hooks";
import { useSidebarCounters } from "./useSidebarCounters";

// ----------------------------------------------------------------------

// Sidebar from the design (AdminBookings.dc.html): paper-alt panel, wordmark, caps nav,
// storage bar and the account actions at the bottom.

const footerLink =
  "caps flex min-h-11 items-center text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-ink";

export function Sidebar() {
  const { t } = useTranslation();
  const { name, mdAndDown } = useBreakpointsContext();
  const { isExpanded, close } = useSidebarContext();
  const { logout } = useAuthContext();
  const storage = useStorageStatus();
  const counters = useSidebarCounters();

  useDidUpdate(() => {
    isExpanded && close();
  }, [name]);

  const onNavigate = () => mdAndDown && close();

  return (
    <div className="sidebar-panel">
      <div className="flex h-full grow flex-col gap-10 overflow-y-auto bg-paper-alt px-7 pt-8 pb-6">
        <div className="flex items-center justify-between">
          <NavLink to="/" onClick={onNavigate} className="wordmark text-ink">
            Photos by Areliii
          </NavLink>
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            className="-mr-3 flex size-11 items-center justify-center text-ink lg:hidden"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        <nav aria-label="Admin" className="flex flex-col">
          {navigation.map((item) => {
            const count = item.badge ? counters?.[item.badge] : null;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  clsx(
                    "caps flex min-h-11 items-center justify-between outline-hidden focus-visible:outline-2 focus-visible:outline-ink",
                    isActive ? "text-ink" : "text-ink-muted hover:text-ink",
                  )
                }
              >
                <span>{t(item.transKey)}</span>
                {count > 0 && (
                  <span className="text-ink-muted" aria-label={`${count} new`}>
                    {count}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-6">
          <StorageBar status={storage.status} error={storage.error} />
          <div className="flex flex-col border-t border-line pt-4">
            <button
              type="button"
              onClick={logout}
              className={clsx(footerLink, "text-left")}
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      {mdAndDown && isExpanded && (
        <Portal>
          <div
            onClick={close}
            className="fixed inset-0 z-20 bg-gray-900/40 transition-opacity dark:bg-black/50"
          />
        </Portal>
      )}
    </div>
  );
}
