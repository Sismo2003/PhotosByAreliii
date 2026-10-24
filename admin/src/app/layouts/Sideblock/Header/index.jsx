// Local Imports
import { SidebarToggleBtn } from "components/shared/SidebarToggleBtn";
import { Logo } from "components/shared/Logo";

// ----------------------------------------------------------------------

// Top bar only below lg (phones and portrait tablets): the design's desktop has no header,
// the sidebar holds everything.

export function Header() {
  return (
    <header className="app-header sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-line bg-paper/90 px-(--margin-x) backdrop-blur-sm lg:hidden">
      <SidebarToggleBtn />
      <Logo className="h-9" />
    </header>
  );
}
