// Ownership metadata written into every file sharp makes (web copy, thumbnail, edited original):
// EXIF (Artist / Copyright / ImageDescription — read by almost any app) and XMP with the IPTC
// fields Lightroom and Google Images show (creator, credit, copyright, licensee).
// Uploaded originals are NOT re-encoded to add it (it would cost quality); see
// docs/galleries-pendientes.md for the lossless exiftool step on client downloads.
// Never carries GPS: sharp drops the camera's EXIF and only these fields are written.
import { nowInStudio } from '../utils/date.js';

export const OWNER = 'Photos By Areliii LLC';
export const OWNER_EMAIL = process.env.OWNER_EMAIL || 'hello@example.com';

const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** "Licensed to: Gallery #12 – Smith Session" */
export const licenseeOf = (gallery) => `Gallery #${gallery.id} – ${gallery.title}`;

/** { exif, xmp } for sharp's withExif() / withXmp(). */
export function rightsFor(gallery) {
  const copyright = `© ${nowInStudio().year} ${OWNER}. All rights reserved.`;
  const licensee = licenseeOf(gallery);
  const exif = { IFD0: { Artist: OWNER, Copyright: copyright, ImageDescription: `Licensed to: ${licensee}` } };
  const xmp = `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
    xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/"
    xmlns:Iptc4xmpCore="http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/"
    xmlns:plus="http://ns.useplus.org/ldf/xmp/1.0/"
    photoshop:Credit="${xml(OWNER)}"
    xmpRights:Marked="True">
   <dc:creator><rdf:Seq><rdf:li>${xml(OWNER)}</rdf:li></rdf:Seq></dc:creator>
   <dc:rights><rdf:Alt><rdf:li xml:lang="x-default">${xml(copyright)}</rdf:li></rdf:Alt></dc:rights>
   <dc:description><rdf:Alt><rdf:li xml:lang="x-default">${xml(`Licensed to: ${licensee}`)}</rdf:li></rdf:Alt></dc:description>
   <Iptc4xmpCore:CreatorContactInfo rdf:parseType="Resource"><Iptc4xmpCore:CiEmailWork>${xml(OWNER_EMAIL)}</Iptc4xmpCore:CiEmailWork></Iptc4xmpCore:CreatorContactInfo>
   <plus:Licensor><rdf:Seq><rdf:li rdf:parseType="Resource"><plus:LicensorName>${xml(OWNER)}</plus:LicensorName><plus:LicensorEmail>${xml(OWNER_EMAIL)}</plus:LicensorEmail></rdf:li></rdf:Seq></plus:Licensor>
   <plus:Licensee><rdf:Seq><rdf:li rdf:parseType="Resource"><plus:LicenseeName>${xml(licensee)}</plus:LicenseeName></rdf:li></rdf:Seq></plus:Licensee>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
  return { exif, xmp };
}

/** Adds the rights to a sharp pipeline (no-op without them). */
export const stamp = (img, rights) => (rights ? img.withExif(rights.exif).withXmp(rights.xmp) : img);

export const USAGE_TERMS = `Licensed for the personal use of the licensee named in this file. Contact ${OWNER_EMAIL} for any other use.`;

/**
 * Tags for exiftool: rights written INTO the client's original without re-encoding it. Everything else
 * the camera recorded (lens, exposure, GPS…) is left exactly as it was (decision by Alexis, 2026-10-10).
 */
export function rightsTags(gallery) {
  const copyright = `© ${nowInStudio().year} ${OWNER}. All rights reserved.`;
  const licensee = licenseeOf(gallery);
  return {
    Artist: OWNER,
    Copyright: copyright,
    ImageDescription: `Licensed to: ${licensee}`,
    'XMP-dc:Creator': OWNER,
    'XMP-dc:Rights': copyright,
    'XMP-photoshop:Credit': OWNER,
    'XMP-xmpRights:Marked': true,
    'XMP-xmpRights:UsageTerms': USAGE_TERMS,
    'XMP-plus:LicensorName': OWNER,
    'XMP-plus:LicensorEmail': OWNER_EMAIL,
    'XMP-plus:LicenseeName': licensee,
  };
}
