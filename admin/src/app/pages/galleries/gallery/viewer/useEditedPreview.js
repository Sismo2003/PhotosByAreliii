// Draws the rotated / flipped / straightened (and, outside the Crop tool, cropped) photo on a
// canvas from the 2048 px web copy, so every tool previews exactly what the Backend will make.
// No edits → the web copy itself, no canvas. The Backend applies the real edit to the original.
import { useEffect, useRef, useState } from "react";

import { inscribed, turnOf } from "./viewerEdits";

// `active`: only Crop (and a pending crop) need the drawn image; the rest draws with CSS (EditedImage).
export function useEditedPreview(
  src,
  { rot, fine, flipH, flipV },
  crop,
  active = true,
) {
  const [img, setImg] = useState(null);
  const [out, setOut] = useState({ url: src, width: 0, height: 0, sig: null });
  const sig = `${src}|${turnOf(rot)}|${fine}|${flipH}|${flipV}|${crop ? [crop.x, crop.y, crop.width, crop.height].join(",") : ""}`;
  const blobUrl = useRef(null);

  useEffect(() => {
    setImg(null);
    const el = new Image();
    el.onload = () => setImg(el);
    el.src = src;
    return () => {
      el.onload = null;
    };
  }, [src]);

  useEffect(() => {
    if (!img || !active) return undefined;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const turn = turnOf(rot);
    if (!turn && !fine && !flipH && !flipV && !crop) {
      setOut({ url: src, width: w, height: h, sig });
      return undefined;
    }
    // The slider fires many times a second: draw at most once per ~60 ms. A drawing that finishes after
    // a newer edit is dropped (toBlob is async), so an old result can never replace the current one.
    let stale = false;
    const timer = setTimeout(() => {
      const odd = (turn / 90) % 2 === 1;
      const box = inscribed(odd ? h : w, odd ? w : h, fine);
      const turned = document.createElement("canvas");
      turned.width = box.width;
      turned.height = box.height;
      const ctx = turned.getContext("2d");
      ctx.translate(box.width / 2, box.height / 2);
      ctx.rotate(((turn + fine) * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(img, -w / 2, -h / 2);
      let canvas = turned;
      if (crop) {
        const cw = Math.max(1, Math.round(box.width * crop.width));
        const ch = Math.max(1, Math.round(box.height * crop.height));
        canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        canvas
          .getContext("2d")
          .drawImage(
            turned,
            Math.round(box.width * crop.x),
            Math.round(box.height * crop.y),
            cw,
            ch,
            0,
            0,
            cw,
            ch,
          );
      }
      canvas.toBlob(
        (blob) => {
          if (!blob || stale) return;
          const url = URL.createObjectURL(blob);
          if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
          blobUrl.current = url;
          setOut({ url, width: canvas.width, height: canvas.height, sig });
        },
        "image/jpeg",
        0.9,
      );
    }, 60);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [active, sig, img, src, rot, fine, flipH, flipV, crop]);

  useEffect(
    () => () => {
      if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
    },
    [],
  );

  // `current`: the image matches the edits asked for (false while a new drawing is on its way).
  return { ...out, ready: !!img, current: !!img && out.sig === sig };
}
