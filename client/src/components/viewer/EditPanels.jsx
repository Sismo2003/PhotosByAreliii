// Panels of the two edit tools (Rotate & flip · Resize). They only change the viewer's `edits`; the
// result is made when the client taps "Download edited" — nothing is stored on the server.
import { ArrowPathRoundedSquareIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import { flipVisual, SIZE_PRESETS, turnedSize } from "./viewerEdits";

const chip = (on) =>
  clsx(
    "text-body min-h-11 border px-4 transition-colors",
    on
      ? "border-ink bg-ink text-on-ink"
      : "border-line-strong text-ink hover:border-ink bg-transparent",
  );
const ghost =
  "flex min-h-11 items-center justify-center gap-2 border border-line-strong px-3 text-small text-ink transition-colors hover:border-ink";
const field =
  "h-11 w-full border border-line-strong bg-transparent px-3 text-body text-ink focus:border-ink focus:ring-0";

const Result = ({ title, children, note }) => (
  <div className="bg-paper-alt px-4 py-3">
    <div className="caps text-ink-muted">{title}</div>
    <div className="text-ink text-[1.15rem]">{children}</div>
    {note && <div className="text-small text-ink-muted">{note}</div>}
  </div>
);
Result.propTypes = {
  title: PropTypes.string,
  children: PropTypes.node,
  note: PropTypes.string,
};

export function RotatePanel({ edits, onChange }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={ghost}
          onClick={() => onChange({ rot: edits.rot - 90 })}
        >
          <ArrowPathRoundedSquareIcon
            className="size-5 -scale-x-100"
            aria-hidden="true"
          />
          {t("edit.left")}
        </button>
        <button
          type="button"
          className={ghost}
          onClick={() => onChange({ rot: edits.rot + 90 })}
        >
          <ArrowPathRoundedSquareIcon className="size-5" aria-hidden="true" />
          {t("edit.right")}
        </button>
        <button
          type="button"
          aria-pressed={edits.flipH}
          className={clsx(ghost, edits.flipH && "border-ink bg-paper-alt")}
          onClick={() => onChange(flipVisual(edits, "flipH"))}
        >
          {t("edit.flipH")}
        </button>
        <button
          type="button"
          aria-pressed={edits.flipV}
          className={clsx(ghost, edits.flipV && "border-ink bg-paper-alt")}
          onClick={() => onChange(flipVisual(edits, "flipV"))}
        >
          {t("edit.flipV")}
        </button>
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="straighten" className="caps text-ink">
            {t("edit.straighten")}
          </label>
          <span className="text-body tabular-nums">
            {edits.fine > 0 ? "+" : ""}
            {edits.fine.toFixed(1)}°
          </span>
        </div>
        <input
          id="straighten"
          type="range"
          min={-15}
          max={15}
          step={0.5}
          value={edits.fine}
          onChange={(e) => onChange({ fine: Number(e.target.value) })}
          className="accent-ink my-1 h-11 w-full"
        />
        <p className="text-small text-ink-muted">{t("edit.straightenNote")}</p>
      </div>
    </div>
  );
}

export function ResizePanel({ edits, base, onChange }) {
  const { t } = useTranslation();
  const size = turnedSize(base.width, base.height, edits);
  const current = edits.resize ?? size;
  const set = (width, height) => {
    const w = Math.min(size.width, Math.max(1, Math.round(width)));
    const h = Math.min(size.height, Math.max(1, Math.round(height)));
    onChange({
      resize:
        w === size.width && h === size.height ? null : { width: w, height: h },
    });
  };
  const fromWidth = (v) => {
    const n = Number(v.replace(/\D/g, ""));
    if (n) set(n, (n * size.height) / size.width);
  };
  const fromHeight = (v) => {
    const n = Number(v.replace(/\D/g, ""));
    if (n) set((n * size.width) / size.height, n);
  };
  const preset = (edge) => {
    if (!edge) return onChange({ resize: null });
    const k = Math.min(1, edge / Math.max(size.width, size.height));
    set(size.width * k, size.height * k);
  };
  const long = Math.max(size.width, size.height);
  const active = SIZE_PRESETS.find((p) =>
    p.edge
      ? !!edits.resize &&
        Math.max(current.width, current.height) === Math.min(p.edge, long)
      : !edits.resize,
  );
  const pct = Math.round(
    ((current.width * current.height) / (size.width * size.height)) * 100,
  );
  return (
    <div className="space-y-6">
      <div>
        <div className="caps text-ink mb-2.5">{t("edit.size")}</div>
        <div className="flex flex-wrap gap-2">
          {SIZE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={active?.id === p.id}
              className={chip(active?.id === p.id)}
              onClick={() => preset(p.edge)}
            >
              {t(`edit.preset.${p.id}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2.5">
        <div>
          <label htmlFor="rs-w" className="caps text-ink mb-1.5 block">
            {t("edit.width")}
          </label>
          <input
            id="rs-w"
            inputMode="numeric"
            value={String(current.width)}
            onChange={(e) => fromWidth(e.target.value)}
            className={field}
          />
        </div>
        <span aria-hidden="true" className="text-ink-muted pb-2.5">
          ×
        </span>
        <div>
          <label htmlFor="rs-h" className="caps text-ink mb-1.5 block">
            {t("edit.height")}
          </label>
          <input
            id="rs-h"
            inputMode="numeric"
            value={String(current.height)}
            onChange={(e) => fromHeight(e.target.value)}
            className={field}
          />
        </div>
      </div>
      <Result title={t("edit.result")} note={t("edit.resultNote", { pct })}>
        {size.width} × {size.height} → {current.width} × {current.height} px
      </Result>
    </div>
  );
}

RotatePanel.propTypes = {
  edits: PropTypes.object.isRequired,
  onChange: PropTypes.func,
};
ResizePanel.propTypes = {
  edits: PropTypes.object.isRequired,
  base: PropTypes.object.isRequired,
  onChange: PropTypes.func,
};

/** Body of the Rotate / Resize panels. */
export function EditPanels({ panel, edits, base, onChange }) {
  return panel === "rotate" ? (
    <RotatePanel edits={edits} onChange={onChange} />
  ) : (
    <ResizePanel edits={edits} base={base} onChange={onChange} />
  );
}
EditPanels.propTypes = {
  panel: PropTypes.string.isRequired,
  edits: PropTypes.object.isRequired,
  base: PropTypes.object.isRequired,
  onChange: PropTypes.func,
};
