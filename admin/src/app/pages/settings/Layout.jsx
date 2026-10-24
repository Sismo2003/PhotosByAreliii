// Import Dependencies
import { NavLink, Outlet } from "react-router";
import clsx from "clsx";

// Local Imports
import { Page } from "components/shared/Page";
import { PageHeader } from "components/shared/layout/PageHeader";

// ----------------------------------------------------------------------

// Tabs styled like the design's tab rows (caps, 1px ink underline on the active one).
const tabs = [
  { to: "/settings/studio", label: "Studio" },
  { to: "/settings/email", label: "Email" },
  { to: "/settings/email-templates", label: "Email templates" },
];

export default function SettingsLayout() {
  return (
    <Page title="Settings">
      <div className="px-(--margin-x) pb-12">
        <PageHeader title="Settings">
          <nav
            aria-label="Settings sections"
            className="mt-6 flex gap-7 overflow-x-auto border-b border-line"
          >
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  clsx(
                    "caps -mb-px flex min-h-11 items-center border-b whitespace-nowrap",
                    isActive
                      ? "border-ink text-ink"
                      : "border-transparent text-ink-muted hover:text-ink",
                  )
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </PageHeader>
        <Outlet />
      </div>
    </Page>
  );
}
