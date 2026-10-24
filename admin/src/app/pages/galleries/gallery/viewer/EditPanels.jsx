// Panels of the three edit tools (Rotate & flip · Crop · Resize). They only change the `edits`
// object of the viewer; nothing touches the file until "Save changes" (which replaces the original).
import { ArrowPathRoundedSquareIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import PropTypes from "prop-types";

import { croppedSize, flipVisual, RATIOS, SIZE_PRESETS } from "./viewerEdits";

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
          Left 90°
        </button>
        <button
          type="button"
          className={ghost}
          onClick={() => onChange({ rot: edits.rot + 90 })}
        >
          <ArrowPathRoundedSquareIcon className="size-5" aria-hidden="true" />
          Right 90°
        </button>
        <button
          type="button"
          aria-pressed={edits.flipH}
          className={clsx(ghost, edits.flipH && "border-ink bg-paper-alt")}
          onClick={() => onChange(flipVisual(edits, "flipH"))}
        >
          Flip ↔
        </button>
        <button
          type="button"
          aria-pressed={edits.flipV}
          className={clsx(ghost, edits.flipV && "border-ink bg-paper-alt")}
          onClick={() => onChange(flipVisual(edits, "flipV"))}
        >
          Flip ↕
        </button>
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="straighten" className="caps text-ink">
            Straighten
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
        <p className="text-small text-ink-muted">
          Fix a tilted horizon. The photo is trimmed slightly to fill the frame.
        </p>
      </div>
    </div>
  );
}

export function CropPanel({ edits, ratio, onRatio, base }) {
  const size = croppedSize(base.width, base.height, edits);
  return (
    <div className="space-y-6">
      <div>
        <div className="caps text-ink mb-2.5">Shape</div>
        <div className="flex flex-wrap gap-2">
          {RATIOS.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={ratio === r.id}
              className={chip(ratio === r.id)}
              onClick={() => onRatio(r)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <Result
        title="Result"
        note={
          edits.crop
            ? ratio === "free"
              ? "Free shape"
              : `Ratio ${ratio}`
            : "Drag on the photo to crop"
        }
      >
        {size.width} × {size.height} px
      </Result>
      <p className="text-small text-ink-muted">
        Drag the corners or the frame to crop.
      </p>
    </div>
  );
}

export function ResizePanel({ edits, base, onChange }) {
  const size = croppedSize(base.width, base.height, edits);
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
    const long = Math.max(size.width, size.height);
    const k = Math.min(1, edge / long);
    set(size.width * k, size.height * k);
  };
  const activePreset = SIZE_PRESETS.find((p) =>
    p.edge
      ? Math.max(current.width, current.height) ===
          Math.min(p.edge, Math.max(size.width, size.height)) && !!edits.resize
      : !edits.resize,
  );
  const mb =
    ((current.width * current.height) / (size.width * size.height)) * 1; // relative weight
  return (
    <div className="space-y-6">
      <div>
        <div className="caps text-ink mb-2.5">Size</div>
        <div className="flex flex-wrap gap-2">
          {SIZE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={activePreset?.id === p.id}
              className={chip(activePreset?.id === p.id)}
              onClick={() => preset(p.edge)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2.5">
        <div>
          <label htmlFor="rs-w" className="caps text-ink mb-1.5 block">
            Width px
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
            Height px
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
      <Result
        title="Result"
        note={`${Math.round(mb * 100)}% of the pixels · only gets smaller, never enlarged`}
      >
        {size.width} × {size.height} → {current.width} × {current.height} px
      </Result>
    </div>
  );
}

const baseProps = {
  edits: PropTypes.object.isRequired,
  onChange: PropTypes.func,
};
RotatePanel.propTypes = baseProps;
CropPanel.propTypes = {
  edits: PropTypes.object.isRequired,
  ratio: PropTypes.string,
  onRatio: PropTypes.func,
  base: PropTypes.object.isRequired,
};
ResizePanel.propTypes = { ...baseProps, base: PropTypes.object.isRequired };
