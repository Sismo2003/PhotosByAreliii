// Non-component helpers of the Galleries pages (kept out of .jsx for Fast Refresh).
export const galleryPath = (id) => `/galleries/${id}`;
export const NEW_GALLERY_PATH = "/galleries/new";
export const newGalleryPath = ({ booking, client } = {}) => {
  const p = new URLSearchParams();
  if (booking) p.set("booking", String(booking));
  if (client) p.set("client", String(client));
  const text = p.toString();
  return text ? `${NEW_GALLERY_PATH}?${text}` : NEW_GALLERY_PATH;
};

/** Gallery link the client will get (docs: photosbyareli.com/g/<slug>). */
export const publicGalleryUrl = (slug) => `photosbyareliii.com/g/${slug}`;
