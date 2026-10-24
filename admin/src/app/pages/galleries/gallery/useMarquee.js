// Rubber-band ("blue box") selection for the photo grid, like the Finder / Explorer desktop:
// press on any empty spot (or on a photo) and drag — every photo the box touches is selected live.
// Shift / Cmd / Ctrl while pressing adds to the current selection instead of replacing it.
// A plain press on empty space clears the selection. Mouse and pen only; touch keeps native scroll.
// The box lives in the container's content coordinates, so it stays right while the page or the
// container scrolls, and it auto-scrolls both when the pointer nears an edge.
import { useCallback, useEffect, useRef, useState } from "react";

const THRESHOLD = 5; // px of movement before a press becomes a drag (below it, it is a click)
const EDGE = 56; // px from an edge where auto-scroll kicks in
const MAX_SPEED = 22; // px per frame at the very edge

const sameSet = (a, b) => a.size === b.size && [...a].every((id) => b.has(id));

export function useMarquee({ containerRef, getSelected, onChange }) {
  const [box, setBox] = useState(null);
  const suppressClick = useRef(false);
  const live = useRef({ getSelected, onChange });
  const stop = useRef(null);

  useEffect(() => {
    live.current = { getSelected, onChange };
  });
  useEffect(() => () => stop.current?.(), []);

  const onPointerDown = useCallback(
    (e) => {
      const el = containerRef.current;
      if (!el || e.button !== 0 || e.pointerType === "touch") return;
      if (e.target.closest("[data-no-marquee]")) return;
      const bounds = el.getBoundingClientRect();
      if (e.clientX >= bounds.left + el.clientWidth) return; // the scrollbar, not the content

      const additive = e.shiftKey || e.metaKey || e.ctrlKey;
      const onPhoto = Boolean(e.target.closest("[data-photo-id]"));
      const base = additive ? new Set(live.current.getSelected()) : new Set();
      const toContent = (x, y) => {
        const r = el.getBoundingClientRect();
        return { x: x - r.left + el.scrollLeft, y: y - r.top + el.scrollTop };
      };
      const origin = toContent(e.clientX, e.clientY);
      const pointer = { x: e.clientX, y: e.clientY };
      let dragging = false;
      let frame = 0;
      let last = null;

      const update = () => {
        const cur = toContent(pointer.x, pointer.y);
        const left = Math.min(origin.x, cur.x);
        const top = Math.min(origin.y, cur.y);
        const right = Math.max(origin.x, cur.x);
        const bottom = Math.max(origin.y, cur.y);
        setBox({ left, top, width: right - left, height: bottom - top });

        const r = el.getBoundingClientRect();
        const next = new Set(base);
        el.querySelectorAll("[data-photo-id]").forEach((node) => {
          const n = node.getBoundingClientRect();
          const nl = n.left - r.left + el.scrollLeft;
          const nt = n.top - r.top + el.scrollTop;
          if (nl < right && nl + n.width > left && nt < bottom && nt + n.height > top) next.add(Number(node.dataset.photoId));
        });
        if (!last || !sameSet(last, next)) {
          last = next;
          live.current.onChange(next);
        }
      };

      const tick = () => {
        const r = el.getBoundingClientRect();
        const speed = (depth) => Math.ceil(MAX_SPEED * Math.min(1, depth / EDGE));
        // The page scrolls when the grid is taller than the screen; the grid scrolls when it is capped.
        if (pointer.y < EDGE) window.scrollBy(0, -speed(EDGE - pointer.y));
        else if (pointer.y > window.innerHeight - EDGE) window.scrollBy(0, speed(pointer.y - (window.innerHeight - EDGE)));
        if (el.scrollHeight > el.clientHeight) {
          if (pointer.y < r.top + EDGE) el.scrollTop -= speed(r.top + EDGE - pointer.y);
          else if (pointer.y > r.bottom - EDGE) el.scrollTop += speed(pointer.y - (r.bottom - EDGE));
        }
        update();
        frame = requestAnimationFrame(tick);
      };

      const move = (ev) => {
        pointer.x = ev.clientX;
        pointer.y = ev.clientY;
        if (!dragging && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) > THRESHOLD) {
          dragging = true;
          frame = requestAnimationFrame(tick);
        }
      };

      const end = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
        cancelAnimationFrame(frame);
        stop.current = null;
        setBox(null);
        if (dragging) {
          suppressClick.current = true; // the click that follows the release must not toggle a photo
          setTimeout(() => (suppressClick.current = false), 0);
        } else if (!additive && !onPhoto) live.current.onChange(new Set());
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
      stop.current = end;
    },
    [containerRef],
  );

  const onClickCapture = useCallback((e) => {
    if (!suppressClick.current) return;
    e.stopPropagation();
    e.preventDefault();
  }, []);

  return { box, onPointerDown, onClickCapture };
}
