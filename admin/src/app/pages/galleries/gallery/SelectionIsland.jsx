// Floating action island for the photo grid. It appears when something is selected and holds only
// the actions (the selected photos are already marked in the grid; the count is for screen readers).
// Groups: [Preview · Move · Cover] · [Hide/Show] · [Delete] · [Close].
// "Compare" only exists with exactly two photos. "Set as cover" only exists for a single photo, so it disappears (instead of greying out) with more.
import { ArrowsRightLeftIcon, EyeIcon, EyeSlashIcon, FolderArrowDownIcon, MagnifyingGlassPlusIcon, StarIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";

import { useSectionSkin } from "components/shared/layout/useSectionSkin";

import { pluralPhotos } from "../labels";

function IslandButton({ label, icon: Icon, danger, active, children, className, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-small whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        danger ? "text-alert hover:bg-alert/10" : "text-ink hover:bg-line",
        active && "bg-line",
        className,
      )}
      {...rest}
    >
      <Icon className="size-[18px] shrink-0" strokeWidth={1.6} aria-hidden="true" />
      {children && <span className="hidden sm:inline">{children}</span>}
    </button>
  );
}

const Divider = () => <span aria-hidden="true" className="bg-line-strong mx-1 hidden h-5 w-px sm:block" />;

function MoveMenu({ sets, disabled, onMove }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const outside = (e) => {
      if (!root.current?.contains(e.target)) setOpen(false);
    };
    const esc = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation(); // close the menu only, keep the selection
      setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc, true);
    };
  }, [open]);

  const pick = (setId) => {
    setOpen(false);
    onMove(setId);
  };

  return (
    <div ref={root} className="relative">
      <IslandButton label="Move to set" icon={FolderArrowDownIcon} disabled={disabled} active={open} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        Move to set
      </IslandButton>
      {open && (
        <ul role="menu" aria-label="Move to set" className="bg-paper ring-line-strong absolute bottom-full left-0 z-30 mb-3 max-h-64 min-w-52 overflow-y-auto rounded-2xl p-1.5 shadow-soft ring-1 dark:shadow-none">
          {sets.map((s) => (
            <li key={s.id} role="none">
              <button type="button" role="menuitem" onClick={() => pick(s.id)} className="text-ink hover:bg-line flex min-h-10 w-full items-center rounded-xl px-3 text-left text-small">
                <span className="truncate">{s.name}</span>
              </button>
            </li>
          ))}
          {sets.length > 0 && <li role="separator" className="bg-line my-1 h-px" />}
          <li role="none">
            <button type="button" role="menuitem" onClick={() => pick(null)} className="text-ink-muted hover:bg-line hover:text-ink flex min-h-10 w-full items-center rounded-xl px-3 text-left text-small">
              No set
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

export function SelectionIsland({ selected, sets, busy, allHidden, onPreview, onCompare, onMove, onCover, onToggleHidden, onDelete, onClear }) {
  const { isShadow } = useSectionSkin();
  const count = selected.length;
  const single = count === 1 ? selected[0] : null;

  return (
    <div className="pointer-events-none sticky bottom-4 z-20 mt-4 flex justify-center">
      <div
        role="toolbar"
        aria-label={`${pluralPhotos(count)} selected`}
        className={clsx(
          "bg-paper/90 pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-x-1 gap-y-1 rounded-3xl p-1.5 backdrop-blur-xl sm:rounded-full",
          isShadow ? "shadow-soft dark:shadow-none dark:ring-1 dark:ring-line" : "ring-1 ring-line-strong",
        )}
      >
        <IslandButton label={single ? "Open photo" : "Preview photos"} icon={MagnifyingGlassPlusIcon} onClick={onPreview}>
          Preview
        </IslandButton>
        {count === 2 && (
          <IslandButton label="Compare the two photos" icon={ArrowsRightLeftIcon} onClick={onCompare}>
            Compare
          </IslandButton>
        )}
        <MoveMenu sets={sets} disabled={busy} onMove={onMove} />
        {single && (
          <IslandButton label="Set as cover" icon={StarIcon} disabled={busy || single.isCover} onClick={onCover}>
            {single.isCover ? "Cover" : "Set as cover"}
            {single.isCover && <CheckIcon className="size-3.5" aria-hidden="true" />}
          </IslandButton>
        )}

        <Divider />
        <IslandButton label={allHidden ? "Show in gallery" : "Hide from client"} icon={allHidden ? EyeIcon : EyeSlashIcon} disabled={busy} onClick={onToggleHidden}>
          {allHidden ? "Show" : "Hide"}
        </IslandButton>

        <Divider />
        <IslandButton label="Delete photos" icon={TrashIcon} danger disabled={busy} onClick={onDelete}>
          Delete
        </IslandButton>

        <IslandButton label="Clear selection (Esc)" icon={XMarkIcon} onClick={onClear} className="px-2.5" />
      </div>
    </div>
  );
}

IslandButton.propTypes = {
  label: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  danger: PropTypes.bool,
  active: PropTypes.bool,
  children: PropTypes.node,
  className: PropTypes.string,
};
MoveMenu.propTypes = { sets: PropTypes.array.isRequired, disabled: PropTypes.bool, onMove: PropTypes.func.isRequired };
SelectionIsland.propTypes = {
  selected: PropTypes.array.isRequired,
  sets: PropTypes.array.isRequired,
  busy: PropTypes.bool,
  allHidden: PropTypes.bool,
  onPreview: PropTypes.func.isRequired,
  onCompare: PropTypes.func,
  onMove: PropTypes.func.isRequired,
  onCover: PropTypes.func.isRequired,
  onToggleHidden: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
};
