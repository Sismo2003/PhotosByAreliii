// Local Imports
import { SidebarToggleBtn } from "components/shared/SidebarToggleBtn";
import { Logo } from "components/shared/Logo";

// ----------------------------------------------------------------------

export function Header() {
  return (
    <header className="app-header transition-content sticky top-0 z-20 flex h-16 shrink-0 items-center gap-4 border-b border-line bg-paper/90 px-(--margin-x) backdrop-blur-sm">
      <SidebarToggleBtn />
      <Logo className="h-9" />
    </header>
  );
}
