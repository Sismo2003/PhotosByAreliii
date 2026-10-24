// Import Dependencies
import { Outlet } from "react-router";

// Local Imports
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

// ----------------------------------------------------------------------

// Tailux "main layout" (icon rail + panel), restyled to the design tokens. Optional — the
// approved design is Sideblock (default); this one is picked in Display.

export default function MainLayout() {
  return (
    <>
      <Header />
      <main className="main-content transition-content grid grid-cols-1">
        <Outlet />
      </main>
      <Sidebar />
    </>
  );
}
