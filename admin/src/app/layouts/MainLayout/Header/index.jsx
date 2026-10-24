// Local Imports
import { SidebarToggleBtn } from "components/shared/SidebarToggleBtn";

// ----------------------------------------------------------------------

export function Header() {
  return (
    <header className="app-header transition-content sticky top-0 z-20 flex h-16 shrink-0 items-center gap-4 border-b border-line bg-paper/90 px-(--margin-x) backdrop-blur-sm">
      <SidebarToggleBtn />
      <span className="wordmark text-ink">Photos by Areliii</span>
    </header>
  );
}
