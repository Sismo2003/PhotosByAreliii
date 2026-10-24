// Zoomable photo for the viewer's Zoom mode and both Compare panes. The view is controlled and
// stored in fractions — `s` (1 = fit) and the photo point at the stage center (`cx`, `cy`, 0–1) —
// so two panes with different photos or sizes can share one view and stay in sync.
// Click with the Zoom in / Zoom out tool zooms at that point (Alt inverts), drag pans, the wheel or
// trackpad zooms at the cursor, two fingers pinch. The web copy is shown first; the original is
// loaded once the photo is drawn larger than the web copy.
import {
  ArrowsPointingInIcon,
  HandRaisedIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  MinusIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";

import { Skeleton } from "components/ui";

import { clampZoom, FIT_VIEW, MAX_ZOOM } from "./viewerEdits";

const PAD = 24; // px around the photo at fit
const WEB_EDGE = 2048;
const ZOOM_SPEED = 3.5; // top speed, in doublings per second (2× ≈ 0.3 s, fit → max ≈ 1.3 s)
const SMOOTH = 0.09; // s: ease-in/out time constant of the follow

/** The photo point at the center can't drift so far that an edge shows (centered while it fits). */
function clampAxis(c, drawn, box) {
  if (drawn <= box) return 0.5;
  const h = box / (2 * drawn);
  return Math.min(1 - h, Math.max(h, c));
}

export function ZoomStage({
  src,
  hiSrc,
  width,
  height,
  view,
  onView,
  tool,
  onFit,
  dimmed,
  children,
}) {
  const box = useRef(null);
  const [size, setSize] = useState({ cw: 0, ch: 0 });
  const [natural, setNatural] = useState(null);
  const [live, setLive] = useState(false); // dragging / pinching: drawn as-is, no follow
  const [panning, setPanning] = useState(false);
  const [hiReady, setHiReady] = useState(false);
  const [wantHi, setWantHi] = useState(false);
  const pointers = useRef(new Map());
  const gesture = useRef(null);

  const W = width || natural?.w || 0;
  const H = height || natural?.h || 0;
  const { cw, ch } = size;
  const fit = W && H && cw && ch ? Math.min((cw - PAD) / W, (ch - PAD) / H) : 0;
  const bw = W * fit;
  const bh = H * fit;

  // Geometry of a view in this pane: drawn size and top-left corner.
  const layout = (v) => {
    const dw = bw * v.s;
    const dh = bh * v.s;
    const cx = clampAxis(v.cx, dw, cw);
    const cy = clampAxis(v.cy, dh, ch);
    return { dw, dh, cx, cy, left: cw / 2 - cx * dw, top: ch / 2 - cy * dh };
  };

  /** View after zooming `from` to scale `s` keeping the point (px, py) of the stage still. */
  const zoomAt = (from, s, px, py) => {
    const a = layout(from);
    const u = (px - a.left) / a.dw;
    const v = (py - a.top) / a.dh;
    const ns = clampZoom(s);
    const dw = bw * ns;
    const dh = bh * ns;
    return {
      s: ns,
      cx: clampAxis((cw / 2 - (px - u * dw)) / dw, dw, cw),
      cy: clampAxis((ch / 2 - (py - v * dh)) / dh, dh, ch),
    };
  };

  const viewRef = useRef(view);
  viewRef.current = view;
  const zoomAtRef = useRef(zoomAt);
  zoomAtRef.current = zoomAt;

  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) =>
      setSize({ cw: entry.contentRect.width, ch: entry.contentRect.height }),
    );
    ro.observe(el);
    // Wheel needs a non-passive listener to keep the page from scrolling.
    const onWheel = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const k = e.ctrlKey ? 0.01 : 0.0015; // trackpad pinch arrives as ctrl + wheel
      const v = viewRef.current;
      onView(
        zoomAtRef.current(
          v,
          v.s * Math.exp(-e.deltaY * k),
          e.clientX - r.left,
          e.clientY - r.top,
        ),
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      ro.disconnect();
      el.removeEventListener("wheel", onWheel);
    };
  }, [onView]);

  useEffect(() => {
    if (fit && onFit) onFit(fit);
  }, [fit, onFit]);

  // What is drawn ({ left, top, dw }) follows the target view frame by frame: the scale moves in
  // log space with smoothing and a top speed (ZOOM_SPEED), keeping still the one screen point that
  // the drawn and the target view share. Retargeting mid-way (the slider, the wheel, repeated
  // clicks) just changes where it heads, so it never jumps. Touch gestures follow the finger.
  const target = fit ? layout(view) : null;
  const [frame, setFrame] = useState(null);
  const [animating, setAnimating] = useState(false);
  const frameRef = useRef(null);
  const targetRef = useRef(null);
  const rafRef = useRef(0);
  targetRef.current = target && {
    left: target.left,
    top: target.top,
    dw: target.dw,
  };
  const tLeft = target?.left;
  const tTop = target?.top;
  const tDw = target?.dw;
  useEffect(() => {
    if (tDw === undefined) return;
    const show = (f) => {
      frameRef.current = f;
      setFrame(f);
    };
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!frameRef.current || live || reduced) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      setAnimating(false);
      show(targetRef.current);
      return;
    }
    if (rafRef.current) return; // already running: it reads the new target on its next frame
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const to = targetRef.current;
      const cur = frameRef.current;
      if (!to || !cur) {
        rafRef.current = 0;
        setAnimating(false);
        return;
      }
      const alpha = 1 - Math.exp(-dt / SMOOTH);
      const gap = Math.log2(to.dw / cur.dw); // doublings still to go
      let next;
      if (Math.abs(gap) > 0.002) {
        const cap = ZOOM_SPEED * dt;
        const stepped =
          Math.sign(gap) *
          Math.min(
            cap,
            Math.max(Math.abs(gap) * alpha, Math.min(Math.abs(gap), 0.004)),
          );
        const dw = cur.dw * 2 ** stepped;
        const k = dw / cur.dw;
        const px = (cur.left * to.dw - to.left * cur.dw) / (to.dw - cur.dw);
        const py = (cur.top * to.dw - to.top * cur.dw) / (to.dw - cur.dw);
        next = {
          dw,
          left: px - (px - cur.left) * k,
          top: py - (py - cur.top) * k,
        };
      } else {
        next = {
          dw: to.dw,
          left: cur.left + (to.left - cur.left) * alpha,
          top: cur.top + (to.top - cur.top) * alpha,
        };
      }
      const done =
        Math.abs(Math.log2(to.dw / next.dw)) < 0.002 &&
        Math.hypot(to.left - next.left, to.top - next.top) < 0.3;
      show(done ? to : next);
      if (done) {
        rafRef.current = 0;
        setAnimating(false);
      } else rafRef.current = requestAnimationFrame(tick);
    };
    setAnimating(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [tLeft, tTop, tDw, live]);
  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    },
    [],
  );

  // Load the original once the photo is drawn bigger than the web copy.
  const drawnEdge = Math.max(bw, bh) * view.s;
  useEffect(() => {
    if (hiSrc && fit && drawnEdge > Math.min(WEB_EDGE, Math.max(W, H)) * 0.9)
      setWantHi(true);
  }, [hiSrc, fit, drawnEdge, W, H]);
  useEffect(() => {
    if (!wantHi || !hiSrc) return undefined;
    // Swap only once the original is decoded, so the photo never flashes.
    let alive = true;
    const img = new Image();
    img.src = hiSrc;
    img
      .decode()
      .then(() => alive && setHiReady(true))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [wantHi, hiSrc]);

  const local = (e) => {
    const r = box.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const pinchOf = () => {
    const [a, b] = [...pointers.current.values()];
    return {
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  };

  const down = (e) => {
    if (e.button !== 0 || e.target.closest("button")) return;
    box.current.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    const v = {
      ...view,
      ...(fit ? { cx: layout(view).cx, cy: layout(view).cy } : {}),
    };
    if (pointers.current.size === 2)
      gesture.current = { kind: "pinch", view: v, ...pinchOf() };
    else
      gesture.current = {
        kind: "drag",
        view: v,
        start: local(e),
        moved: false,
        alt: e.altKey,
      };
    setLive(true);
  };
  const move = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, local(e));
    const g = gesture.current;
    if (!g || !fit) return;
    if (g.kind === "pinch" && pointers.current.size === 2) {
      const p = pinchOf();
      onView(zoomAt(g.view, g.view.s * (p.dist / g.dist), p.mid.x, p.mid.y));
    } else if (g.kind === "drag") {
      const p = local(e);
      const dx = p.x - g.start.x;
      const dy = p.y - g.start.y;
      if (!g.moved && Math.hypot(dx, dy) > 4) {
        g.moved = true;
        setPanning(true);
      }
      if (g.moved) {
        const { dw, dh } = layout(g.view);
        onView({
          s: g.view.s,
          cx: clampAxis(g.view.cx - dx / dw, dw, cw),
          cy: clampAxis(g.view.cy - dy / dh, dh, ch),
        });
      }
    }
  };
  const up = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = local(e);
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size === 0) {
      gesture.current = null;
      setLive(false);
      setPanning(false);
      if (g?.kind === "drag" && !g.moved && fit && e.type === "pointerup") {
        const zoomIn = (tool === "in") !== g.alt;
        if (tool !== "pan")
          onView(zoomAt(view, view.s * (zoomIn ? 2 : 0.5), p.x, p.y));
      }
    } else gesture.current = null; // one finger left after a pinch: wait for a fresh gesture
  };

  const a = fit && frame ? frame : null;
  const zoomed = view.s > 1.001;
  const cursor = panning
    ? "cursor-grabbing"
    : tool === "in"
      ? "cursor-zoom-in"
      : tool === "out"
        ? "cursor-zoom-out"
        : zoomed
          ? "cursor-grab"
          : "cursor-default";

  return (
    <div
      ref={box}
      className={clsx(
        "relative size-full touch-none overflow-hidden select-none",
        cursor,
      )}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      {!a && <Skeleton className="absolute inset-6 opacity-20" />}
      <img
        src={hiReady ? hiSrc : src}
        alt=""
        draggable={false}
        onLoad={(e) =>
          !natural &&
          setNatural({
            w: e.currentTarget.naturalWidth,
            h: e.currentTarget.naturalHeight,
          })
        }
        className={clsx(
          "absolute top-0 left-0 max-w-none origin-top-left",
          dimmed && "opacity-40",
          !a && "invisible",
        )}
        style={
          a
            ? {
                width: bw,
                height: bh,
                transform: `translate3d(${a.left}px, ${a.top}px, 0) scale(${a.dw / bw})`,
                willChange: animating || live ? "transform" : undefined,
              }
            : { width: 1, height: 1 }
        }
      />
      {children}
    </div>
  );
}

ZoomStage.propTypes = {
  src: PropTypes.string.isRequired,
  hiSrc: PropTypes.string,
  width: PropTypes.number,
  height: PropTypes.number,
  view: PropTypes.shape({
    s: PropTypes.number,
    cx: PropTypes.number,
    cy: PropTypes.number,
  }).isRequired,
  onView: PropTypes.func.isRequired,
  tool: PropTypes.oneOf(["in", "out", "pan"]).isRequired,
  onFit: PropTypes.func,
  dimmed: PropTypes.bool,
  children: PropTypes.node,
};

const LOG_MAX = Math.log(MAX_ZOOM);

/** Tools (a picked lupa pressed again zooms at the center) + zoom bar: − / slider / + zoom at the center, Fit, and 100 % (one photo pixel per screen pixel). */
export function ZoomBar({ view, onView, tool, onTool, fit, className }) {
  const at = (s) => onView({ ...view, s: clampZoom(s) });
  const toolBtn = (id, label, Icon) => (
    <button
      type="button"
      aria-pressed={tool === id}
      aria-label={label}
      title={label}
      onClick={() => {
        // First press picks the tool; pressing it again while picked zooms at the center.
        if (tool === id && id === "in") at(view.s * 2);
        else if (tool === id && id === "out") at(view.s / 2);
        else onTool(id);
      }}
      className={clsx(
        "flex size-10 items-center justify-center transition-colors",
        tool === id
          ? "bg-white text-[#151515]"
          : "text-white hover:bg-white/10",
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );
  const iconBtn = (label, Icon, onClick, disabled) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-10 items-center justify-center text-white transition-colors hover:bg-white/10 disabled:opacity-30"
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
  return (
    <div
      className={clsx(
        "flex items-center gap-0.5 border border-white/15 bg-[#1a1a1a]/90 p-1 text-white backdrop-blur-sm",
        className,
      )}
      role="toolbar"
      aria-label="Zoom"
    >
      {toolBtn(
        "in",
        "Zoom in — click the photo, or press again to zoom at the center (Alt: zoom out)",
        MagnifyingGlassPlusIcon,
      )}
      {toolBtn(
        "out",
        "Zoom out — click the photo, or press again to zoom out from the center (Alt: zoom in)",
        MagnifyingGlassMinusIcon,
      )}
      {toolBtn("pan", "Hand — drag to move", HandRaisedIcon)}
      <span className="mx-1 h-6 w-px bg-white/15" aria-hidden="true" />
      {iconBtn("Zoom out", MinusIcon, () => at(view.s / 1.5), view.s <= 1)}
      <input
        type="range"
        min={0}
        max={1000}
        value={Math.round((Math.log(view.s) / LOG_MAX) * 1000)}
        onChange={(e) =>
          at(Math.exp((Number(e.target.value) / 1000) * LOG_MAX))
        }
        aria-label="Zoom level"
        className="w-20 accent-white sm:w-32"
      />
      {iconBtn("Zoom in", PlusIcon, () => at(view.s * 1.5), view.s >= MAX_ZOOM)}
      <span className="text-small w-12 text-center text-white/80 tabular-nums">
        {fit ? `${Math.round(fit * view.s * 100)}%` : `${view.s.toFixed(1)}×`}
      </span>
      <span className="mx-1 h-6 w-px bg-white/15" aria-hidden="true" />
      {iconBtn(
        "Fit to screen",
        ArrowsPointingInIcon,
        () => onView(FIT_VIEW),
        view.s <= 1,
      )}
      <button
        type="button"
        onClick={() => fit && at(1 / fit)}
        disabled={!fit}
        title="Actual pixels"
        className="caps h-10 px-2 text-[0.625rem] text-white transition-colors hover:bg-white/10 disabled:opacity-30"
      >
        100%
      </button>
    </div>
  );
}

ZoomBar.propTypes = {
  view: PropTypes.object.isRequired,
  onView: PropTypes.func.isRequired,
  tool: PropTypes.string.isRequired,
  onTool: PropTypes.func.isRequired,
  fit: PropTypes.number,
  className: PropTypes.string,
};
