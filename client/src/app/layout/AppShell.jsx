// Portal frame. Phones: iOS-style tab bar fixed at the bottom (icons + labels, home-indicator safe
// area, 44px+ targets). Tablet landscape and desktop (md+): a slim top bar with the same tabs.
// Tabs are added to TABS only (the bar's columns follow its length).
import { NavLink, Outlet, ScrollRestoration, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import {
  BanknotesIcon as MoneyOutline,
  CalendarDaysIcon as CalendarOutline,
  PhotoIcon as PhotoOutline,
  UserCircleIcon as UserOutline,
} from "@heroicons/react/24/outline";
import {
  BanknotesIcon as MoneySolid,
  CalendarDaysIcon as CalendarSolid,
  PhotoIcon as PhotoSolid,
  UserCircleIcon as UserSolid,
} from "@heroicons/react/24/solid";

import { Logo } from "components/Logo";

const OTHER_TABS = ["/client/bookings", "/client/payments", "/client/profile"];

const TABS = [
  {
    to: "/client",
    end: false,
    label: "nav.galleries",
    icon: PhotoOutline,
    activeIcon: PhotoSolid,
    match: (p) => !OTHER_TABS.some((to) => p.startsWith(to)),
  },
  { to: "/client/bookings", end: true, label: "nav.bookings", icon: CalendarOutline, activeIcon: CalendarSolid },
  { to: "/client/payments", end: true, label: "nav.payments", icon: MoneyOutline, activeIcon: MoneySolid },
  { to: "/client/profile", end: true, label: "nav.profile", icon: UserOutline, activeIcon: UserSolid },
];

// "/client" must also stay active inside a gallery, but not on the other tabs.
const isActive = (tab, pathname, active) => (tab.match ? tab.match(pathname) : active);

function TopBar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  return (
    <header className="sticky top-0 z-30 hidden border-b border-line bg-paper/85 backdrop-blur-md md:block dark:bg-dark-900/85">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-8">
        <NavLink to="/client" aria-label="Photos by Areliii" className="flex items-center">
          <Logo className="h-10" />
        </NavLink>
        <nav aria-label={t("nav.label")} className="flex items-center gap-8">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive: active }) =>
                clsx(
                  "caps border-b py-1 transition-colors",
                  isActive(tab, pathname, active)
                    ? "border-ink text-ink"
                    : "border-transparent text-ink-muted hover:text-ink",
                )
              }
            >
              {t(tab.label)}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

function TabBar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  return (
    <nav
      aria-label={t("nav.label")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/85 pb-(--safe-bottom) backdrop-blur-xl md:hidden dark:bg-dark-900/85"
    >
      <ul className="mx-auto grid h-(--tabbar-h) max-w-md grid-cols-4">
        {TABS.map((tab) => (
          <li key={tab.to}>
            <NavLink to={tab.to} end={tab.end} className="flex h-full flex-col items-center justify-center gap-0.5">
              {({ isActive: active }) => {
                const on = isActive(tab, pathname, active);
                const Icon = on ? tab.activeIcon : tab.icon;
                return (
                  <>
                    <Icon className={clsx("size-6", on ? "text-ink" : "text-ink-muted")} aria-hidden="true" />
                    <span className={clsx("text-[0.6875rem] leading-none tracking-wide", on ? "text-ink" : "text-ink-muted")}>
                      {t(tab.label)}
                    </span>
                  </>
                );
              }}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function AppShell() {
  return (
    <div className="min-h-100vh bg-paper">
      <TopBar />
      <main className="pb-[calc(var(--tabbar-h)+var(--safe-bottom)+1.5rem)] md:pb-16">
        <Outlet />
      </main>
      <TabBar />
      <ScrollRestoration />
    </div>
  );
}
