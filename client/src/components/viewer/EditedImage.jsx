// COPY of admin/…/gallery/viewer/EditedImage.jsx — change both together.
// The photo with the pending rotate / flip / straighten drawn by CSS (no canvas): it is instant and
// animates, so the Straighten slider is smooth. The frame has the shape the Backend will produce
// (the largest straight rectangle inside the turned photo) and hides the corners.
// Zoom / Compare / Crop still use useEditedPreview (they need a real image).
import clsx from "clsx";
import PropTypes from "prop-types";
import { useState } from "react";

import { Skeleton } from "components/ui";

import { cssTransform, inscribed, turnOf } from "./viewerEdits";

export function EditedImage({ src, width, height, edits, alt, className }) {
  const [natural, setNatural] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const W = width || natural?.w;
  const H = height || natural?.h;
  const onLoad = (e) => {
    setNatural({
      w: e.currentTarget.naturalWidth,
      h: e.currentTarget.naturalHeight,
    });
    setLoaded(true);
  };

  if (!W || !H) {
    return (
      <div className="relative size-full">
        <Skeleton className="absolute inset-0 opacity-20" />
        <img src={src} alt="" onLoad={onLoad} className="hidden" />
      </div>
    );
  }

  const odd = (turnOf(edits.rot) / 90) % 2 === 1;
  const box = inscribed(odd ? H : W, odd ? W : H, edits.fine);
  const ratio = box.width / box.height;
  return (
    <div className="[container-type:size] flex size-full items-center justify-center">
      <div
        className="relative overflow-hidden"
        style={{
          width: `min(100cqw, calc(100cqh * ${ratio}))`,
          aspectRatio: String(ratio),
        }}
      >
        {!loaded && <Skeleton className="absolute inset-0 opacity-20" />}
        <img
          src={src}
          alt={alt}
          draggable={false}
          onLoad={onLoad}
          className={clsx(
            "absolute top-1/2 left-1/2 max-w-none transition-transform duration-200 ease-out select-none motion-reduce:transition-none",
            className,
          )}
          style={{
            width: `${(W / box.width) * 100}%`,
            height: `${(H / box.height) * 100}%`,
            transform: cssTransform(edits),
          }}
        />
      </div>
    </div>
  );
}

EditedImage.propTypes = {
  src: PropTypes.string.isRequired,
  width: PropTypes.number,
  height: PropTypes.number,
  edits: PropTypes.object.isRequired,
  alt: PropTypes.string,
  className: PropTypes.string,
};
