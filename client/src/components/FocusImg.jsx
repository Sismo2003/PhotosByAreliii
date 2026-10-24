// <img> cropped with object-cover that keeps the photo's focus point (face / subject) in view.
// Same math as the admin's PhotoThumb (utils/focus.js ← admin focus.js): the box shape is measured,
// because the right object-position depends on it.
import { useEffect, useRef, useState } from "react";

import { focusPosition } from "utils/focus";

export function FocusImg({ photo, style, ...rest }) {
  const ref = useRef(null);
  const [aspect, setAspect] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || !photo) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setAspect(width / height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [photo]);

  return <img ref={ref} alt="" style={{ ...style, objectPosition: focusPosition(photo, aspect) }} {...rest} />;
}
