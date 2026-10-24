---
tema: admin
fecha: 2026-10-05
---

# Visor de fotos (galería → Photos → Preview)

Diseño en el canvas: filas `Gallery · 8 Photo viewer` (desktop, tablet, mobile). Continúa [[2026-10-04-galleries]].

## Qué se hizo

- **Botón Preview** en la barra de selección de Photos; abre un visor a pantalla completa (`gallery/viewer/PhotoViewer.jsx`).
- **Keep / Hide** (doble clic = keep): `Photo.keep` nuevo; Hide reutiliza `hidden`. Se excluyen entre sí. Vía `bulk` (`pick`/`unpick`/`hide`/`show`).
- **100 %** (carga el original, arrastrar para mover; luego reemplazado por **Zoom**, ver [[2026-10-05-visor-zoom-y-metadatos]]), **comparar dos fotos** (A fija, B de la tira), **descargar** original o web.
- **Herramientas**: rotar/voltear/enderezar, recortar (libre, 1:1, 4:5, 3:2, 16:9), redimensionar, **Info** con datos de cámara explicados en palabras.
- **Guardar reemplaza el original** (decisión de Alexis/Areli): confirmación, archivos escritos en `tmp/` y renombrados al final, miniatura y web rehechas. El cliente nunca ve estas herramientas.
- Atajos: ← →, P, X, Z, C, I.

## Decisiones

- **react-image-crop** en vez de react-easy-crop: el segundo no permite recorte libre. El giro/voltear/enderezar se dibuja en un canvas desde la copia web (`useEditedPreview.js`) y el recorte se hace sobre ese canvas, así los porcentajes valen igual en el servidor. Sin lightbox externo.
- El orden de ediciones es el mismo en cliente y servidor (`viewerEdits.js` ↔ `Backend/services/photo-edit.js`); `inscribed()` está duplicado a propósito.
- La foto editada pierde el EXIF embebido; los datos de cámara se guardan antes en `Photo.exif` (JSON, se llena al primer `info`).
- Migración `20261005120000_add_photo_keep_exif_edited` (`keep`, `exif`, `editedAt`). Contrato en `docs/api-galleries.md`.

## Continuación

El guardado roto, la navegación, el zoom y los metadatos de propiedad están en [[2026-10-05-visor-zoom-y-metadatos]].

## Sin probar / pendiente

- Los endpoints nuevos y el visor **no se han probado con sesión real ni en el navegador**; el servicio de edición y la lectura de EXIF sí se probaron con una imagen sintética.
- Pendiente: quitar el GPS en las descargas del cliente (aún no existe la galería del cliente), HEIC, y comparar el 100 % con fotos muy grandes en móvil.
