// Third-Party Imports
import clsx from "clsx";

// Local Imports
import { LOGO } from "../../../../shared/brand.js";

// ----------------------------------------------------------------------

// The brand logo. Which files it shows is set in shared/brand.js (one place for every app).
// Size it by height (`h-8`); it keeps its proportions. Swaps to the light-ink file in dark mode.

const files = import.meta.glob("../../../../shared/brand/*.png", { eager: true, query: "?url", import: "default" });
const urlOf = (path) => Object.entries(files).find(([key]) => key.endsWith(`/shared/${path}`))?.[1];

export function Logo({ className = "h-8", alt = "Photos by Areliii" }) {
  return (
    <>
      <img src={urlOf(LOGO.onLight)} alt={alt} className={clsx("w-auto dark:hidden", className)} />
      <img src={urlOf(LOGO.onDark)} alt={alt} className={clsx("hidden w-auto dark:block", className)} />
    </>
  );
}
