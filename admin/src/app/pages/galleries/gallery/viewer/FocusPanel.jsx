// "Focus" tool of the viewer: the point that cropped thumbnails keep in view (Photo.focusX / focusY).
// It is found automatically on upload (a face, or the most interesting area); here Areli can click
// the photo to set it by hand — a hand-set point is never recomputed over, except by an edit that
// changes the photo's shape — or go back to the automatic one. The stage handles the click.
import PropTypes from "prop-types";

import { PhotoThumb } from "../../parts";

const SOURCE = {
  FACE: "Found automatically: a face.",
  MANUAL: "Set by hand.",
};

export function FocusPanel({ gallery, photo, busy, onReset }) {
  return (
    <div className="space-y-5">
      <p className="text-small text-ink-muted">
        Click the face or the subject on the photo. Thumbnails, the strip below
        and the cover keep that point in view.
      </p>
      <p className="text-small text-ink">
        {SOURCE[photo.focusSource] ??
          "No face found: thumbnails show the photo centered."}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <figure>
          <PhotoThumb
            galleryId={gallery.id}
            photoId={photo.id}
            version={photo.editedAt}
            photo={photo}
            className="aspect-[4/3] w-full"
          />
          <figcaption className="text-tiny text-ink-muted mt-1">
            Grid
          </figcaption>
        </figure>
        <figure>
          <PhotoThumb
            galleryId={gallery.id}
            photoId={photo.id}
            version={photo.editedAt}
            photo={photo}
            className="aspect-square w-full"
          />
          <figcaption className="text-tiny text-ink-muted mt-1">
            Square
          </figcaption>
        </figure>
      </div>

      <button
        type="button"
        onClick={onReset}
        disabled={busy || photo.focusSource !== "MANUAL"}
        className="caps border-line-strong text-ink hover:border-ink min-h-11 w-full border px-3 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Use automatic
      </button>
    </div>
  );
}

FocusPanel.propTypes = {
  gallery: PropTypes.object.isRequired,
  photo: PropTypes.object.isRequired,
  busy: PropTypes.bool,
  onReset: PropTypes.func.isRequired,
};
