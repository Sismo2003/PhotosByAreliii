// "Download" with the two ways to take photos home, each saying what it is (the owner's wording):
// the ZIP / original keeps full quality; the web copy is reduced quality and quick to share.
// Without full-quality rights (downloadMode WEB_ONLY) it is just the web-copy button.
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { canShareFiles } from "utils/download";

const TRIGGER = {
  island: "text-small inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 whitespace-nowrap text-ink transition-colors hover:bg-line disabled:cursor-not-allowed disabled:opacity-40",
  // Icon only on phones (the sets need the room); icon + word from md.
  bar: "caps inline-flex size-11 shrink-0 items-center justify-center gap-1.5 rounded-full text-ink transition-colors hover:bg-line disabled:opacity-50 md:size-auto md:min-h-9 md:rounded-none md:px-2 md:hover:bg-transparent md:underline md:underline-offset-4",
  viewer: "flex size-12 items-center justify-center text-white/90 hover:text-white disabled:opacity-40",
};

/**
 * count: how many photos it applies to (1 → "original", more → "ZIP"). fullQuality: studio allows it.
 * onFull / onWeb: the two actions. direction: where the menu opens.
 */
export function DownloadMenu({ count, fullQuality, onFull, onWeb, busy, variant = "island", direction = "up", label }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const share = canShareFiles();

  useEffect(() => {
    if (!open) return undefined;
    const outside = (e) => !root.current?.contains(e.target) && setOpen(false);
    const esc = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc, true);
    };
  }, [open]);

  const single = count === 1;
  const webLabel = share ? t("download.saveToPhotos") : t(single ? "download.webCopy" : "download.webCopies");
  const pick = (fn) => {
    setOpen(false);
    fn();
  };
  const text = label ?? t("gallery.download");

  // Web copy only: no menu to open.
  if (!fullQuality) {
    return (
      <button type="button" disabled={busy} aria-label={webLabel} title={webLabel} onClick={onWeb} className={TRIGGER[variant]}>
        <ArrowDownTrayIcon className="size-5 shrink-0" strokeWidth={1.6} aria-hidden="true" />
        {variant !== "viewer" && <span className={variant === "island" ? "hidden sm:inline" : variant === "bar" ? "hidden md:inline" : undefined}>{text}</span>}
      </button>
    );
  }

  const options = [
    { id: "full", title: t(single ? "download.original" : "download.zip"), note: t(single ? "download.originalNote" : "download.zipNote"), run: onFull },
    { id: "web", title: webLabel, note: t("download.webNote"), run: onWeb },
  ];

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={text}
        title={text}
        onClick={() => setOpen((v) => !v)}
        className={TRIGGER[variant]}
      >
        <ArrowDownTrayIcon className="size-5 shrink-0" strokeWidth={1.6} aria-hidden="true" />
        {variant !== "viewer" && <span className={variant === "island" ? "hidden sm:inline" : variant === "bar" ? "hidden md:inline" : undefined}>{text}</span>}
      </button>
      {open && (
        <ul
          role="menu"
          aria-label={t("download.title")}
          className={clsx(
            "absolute z-40 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-paper p-1.5 text-ink shadow-soft ring-1 ring-line-strong dark:shadow-none",
            direction === "up" ? "bottom-full mb-3" : "top-full mt-2",
            variant === "bar" || variant === "viewer" ? "right-0" : "left-1/2 -translate-x-1/2",
          )}
        >
          {options.map((o) => (
            <li key={o.id} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => pick(o.run)}
                className="flex min-h-12 w-full flex-col items-start rounded-xl px-3 py-2 text-left hover:bg-line"
              >
                <span className="text-small">{o.title}</span>
                <span className="text-tiny text-ink-muted">{o.note}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
