// Small pieces shared by the Galleries pages: photo thumbnail with a fallback, on/off toggle.
import { Switch } from "@headlessui/react";
import { PhotoIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";

import { photoUrl } from "services/galleries";

import { focusPosition } from "./focus";

const RETRIES = 2;

/**
 * A photo's thumbnail from the admin-only file route; a quiet placeholder when it can't load.
 * With `photo` ({ width, height, focusX, focusY }) the crop keeps the photo's focus (the face) in
 * view: the box is measured, since S / M / L, the viewer strip and the cover each have their shape.
 */
export function PhotoThumb({ galleryId, photoId, variant = "thumb", version = null, alt = "", photo, className, imgClassName }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [boxAspect, setBoxAspect] = useState(0);
  const box = useRef(null);
  const retry = useRef(null);
  const missing = !photoId || failed;
  const src = photoUrl(galleryId, photoId, variant, version);

  // A load can fail for a moment (the backend restarting, a file still being written): two quiet
  // retries before the placeholder. Another photo or version starts over.
  useEffect(() => {
    setFailed(false);
    setAttempt(0);
    return () => clearTimeout(retry.current);
  }, [src]);
  const onError = () => {
    if (attempt >= RETRIES) return setFailed(true);
    retry.current = setTimeout(() => setAttempt((a) => a + 1), 1000 * (attempt + 1));
  };

  useEffect(() => {
    const el = box.current;
    if (!el || !photo) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setBoxAspect(width / height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [photo]);

  return (
    <div ref={box} className={clsx("bg-paper-alt relative overflow-hidden", className)}>
      {missing ? (
        <div className="text-line-strong flex size-full items-center justify-center">
          <PhotoIcon className="size-1/3 min-w-5" strokeWidth={1} aria-hidden="true" />
        </div>
      ) : (
        <img
          src={attempt ? `${src}${src.includes("?") ? "&" : "?"}retry=${attempt}` : src}
          alt={alt}
          loading="lazy"
          draggable={false}
          onError={onError}
          style={{ objectPosition: focusPosition(photo, boxAspect) }}
          className={clsx("size-full object-cover transition-[object-position] duration-300 ease-out motion-reduce:transition-none", imgClassName)}
        />
      )}
    </div>
  );
}

/** On/off switch in the project palette (ink when on). Dark-mode safe: knob is `paper`. */
export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <Switch
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className={clsx(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40",
        checked ? "border-ink bg-ink" : "border-line-strong bg-transparent",
      )}
    >
      <span className="sr-only">{label}</span>
      <span
        aria-hidden="true"
        className={clsx(
          "size-5 rounded-full transition-transform",
          checked ? "bg-paper translate-x-[1.375rem]" : "bg-line-strong translate-x-1",
        )}
      />
    </Switch>
  );
}

PhotoThumb.propTypes = {
  galleryId: PropTypes.number,
  photoId: PropTypes.number,
  variant: PropTypes.string,
  version: PropTypes.string,
  alt: PropTypes.string,
  photo: PropTypes.shape({ width: PropTypes.number, height: PropTypes.number, focusX: PropTypes.number, focusY: PropTypes.number }),
  className: PropTypes.string,
  imgClassName: PropTypes.string,
};
Toggle.propTypes = { checked: PropTypes.bool, onChange: PropTypes.func, label: PropTypes.string, disabled: PropTypes.bool };
