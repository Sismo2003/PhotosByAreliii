import clsx from "clsx";
import { LOGO } from "@shared/brand";
import { APP_NAME } from "constants/app.constant";

// The brand logo. Which files it shows is set in shared/brand.js (one place for every app).
// Size it by height (`h-8`); it keeps its proportions. Swaps to the light-ink file in dark mode.

const files = import.meta.glob("../../../shared/brand/*.png", { eager: true, query: "?url", import: "default" });
const urlOf = (path) => Object.entries(files).find(([key]) => key.endsWith(`/shared/${path}`))?.[1];

export function Logo({ className = "h-8", alt = APP_NAME }) {
  return (
    <>
      <img src={urlOf(LOGO.onLight)} alt={alt} className={clsx("w-auto dark:hidden", className)} />
      <img src={urlOf(LOGO.onDark)} alt={alt} className={clsx("hidden w-auto dark:block", className)} />
    </>
  );
}
