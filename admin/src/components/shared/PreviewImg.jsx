// Import Dependencies
import PropTypes from "prop-types";
import { useEffect, useState } from "react";

// ----------------------------------------------------------------------

export function PreviewImg({ file, src, alt, ...rest }) {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return undefined;
    }

    let url = null;
    try {
      url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } catch (err) {
      console.error(err);
      setPreviewUrl(null);
    }

    // `url` is the one created by this run; reading `previewUrl` here would revoke a stale value.
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  return (
    <img
      src={previewUrl || src}
      onLoad={() => URL.revokeObjectURL(previewUrl)}
      alt={alt}
      {...rest}
    />
  );
}

PreviewImg.propTypes = {
  file: PropTypes.object,
  src: PropTypes.string,
  alt: PropTypes.string,
};
