---
tema: portal-cliente
fecha: 2026-10-09
---

# Galería del cliente: selección, favorito único, descargas e historial

Parte de [[portal-cliente]]. Sigue a [[2026-10-09-portal-cliente-primer-corte]]. Todo pedido por Alexis en la sesión.

## Qué se hizo

- **Selección múltiple** (`client/src/app/pages/gallery/index.jsx`): círculo de selección en cada foto, botón
  Select / Done, **Select all** junto a Done (carga todas las páginas del filtro con `usePhotoPages.loadAll`),
  isla flotante `SelectionIsland.jsx` (Favorite · Download · Clear), Esc limpia. **Recuadro azul** con mouse:
  `client/src/hooks/useMarquee.js` es copia del admin; el área de arrastre es todo el ancho y alto de la zona de
  fotos. Cursores: manita en el círculo, lupa (`zoom-in`) en la foto, manita en la foto cuando ya se está seleccionando.
- **Chips**: All · cada set de Areli con ≥ 1 foto visible (el backend ya filtra) · Favorites. Nunca "No set".
  La barra se muestra aunque haya un solo set.
- **Alineación por rostro**: el cliente usaba `focusX*100%` (incorrecto). Ahora `client/src/utils/focus.js`
  (copia de `admin/src/app/pages/galleries/focus.js`) + `components/FocusImg.jsx` que mide la caja. Se usa en cuadrícula,
  portada y lista de galerías.
- **Favorito único** (decisión de Alexis): una sola acción sobre la misma foto, visible en admin y cliente.
  La verdad es la tabla `favorites` con el `clientId` de la galería; `Photo.keep` quedó obsoleta. El admin
  (`PhotosTab`, `PhotoViewer`, `InfoPanel`) dice "Favorite"; `pick`/`unpick` crean/borran la fila; ocultar la borra.
  `Backend/models/gallery.model.js` devuelve `favorite` (helper `shape`) en lugar de `keep`.
- **Favoritos en el portal**: `PUT/DELETE …/favorite` en transacción con `SELECT … FOR UPDATE` de la galería
  (respeta `favoritesLimit` solo para el cliente; Areli no tiene límite). Optimista en la UI con reversa.
  **Doble toque / doble clic** en el visor = favorito, con corazón animado.
- **Descargas** (solo web size): `GET …/download`; varias fotos → hoja de compartir en lotes de 20 si el
  dispositivo la soporta, si no una por una (`client/src/utils/download.js`).
- **Historial** (pedido de Alexis): una línea por descarga ("Alexis downloaded 12 photos") vía
  `POST …/downloads` (los archivos ya no registran); primera apertura distinta ("… for the first time");
  `gallery.favorited` ("Alexis liked x.jpg") y `gallery.unfavorited`; nombre de pila del cliente en vez de
  "Client" (`Backend/utils/client-name.js`), también en "hidden from / shown to".

## Descargas completas: ZIP y originales (2026-10-10)

Decisiones de Alexis: ofrecer **las dos vías** y decirlo en pantalla (copia **web** = calidad reducida, ideal para compartir;
**ZIP / original** = calidad completa); en los originales **no se quitan** ni las coordenadas ni los datos de cámara, **solo se
agrega el aviso de derechos/privacidad de Areli**. Nada de esto pasa por el PIN (P6).

- Dependencias nuevas en `Backend/package.json`: `archiver` (ZIP en streaming) y `exiftool-vendored` (escribe metadatos
  **sin recomprimir**). El GPS nunca fue problema del ZIP: era solo de los originales (ver bitácora anterior).
- `Backend/services/photo-delivery.js`: copia el original a `storage/tmp/`, escribe `rightsTags()` (`photo-rights.js`: Artist,
  Copyright, ImageDescription, XMP creator/rights/credit, `UsageTerms`, PLUS licensor/licensee) y sirve la copia; el
  archivo guardado nunca se toca. `streamZip` arma el ZIP uno por uno (memoria y disco acotados), entradas *stored* (sin deflate),
  nombres repetidos → `IMG (2).jpg`, aborta si el cliente cancela.
- Rutas nuevas: `GET /galleries/:slug/download.zip?quality=original|web&(all=1|favorites=1|setId=|ids=1,2)` (registra **una** línea,
  máx. 2000 fotos, **un ZIP a la vez por cliente** → 429 `ZIP_BUSY`) y `GET …/photos/:id/download?quality=`. `original` solo con
  `downloadMode = HIGH_AND_WEB` (403 `WEB_ONLY`); `OFF` → 403.
- UI: `components/DownloadMenu.jsx` con las dos opciones y su nota. Botón **Download all** junto a Select (respeta el filtro en pantalla),
  Download en la isla (2+ fotos → "Download ZIP · Full quality" primero) y en el visor (1 foto → "Download original"). "Save to
  Photos" (hoja de compartir) en iPhone/Android; en escritorio la copia web de varias fotos baja como ZIP web.
- `Alexis downloaded N photos` ahora lleva `metadata { count, quality, zip }`.

### Verificado (2026-10-10)

| Qué | Cómo |
|---|---|
| ZIP de los 14 originales, 6 web (favoritas) y 2 por ids son válidos | controlador contra la BD dev con una respuesta simulada, `unzip -t` |
| `storage/tmp` queda vacío tras generar | `ls` |
| Se conservan Make/Model/GPS y se agregan los derechos | foto sintética con GPS y cámara, leída con exiftool |
| Errores: ids inexistentes 404, `quality` inválida 400, id mal formado 400 | controlador |
| Lint y build del cliente | `eslint`, `vite build` |

### No verificado

- Descarga real desde el navegador (iframe oculto → adjunto), "Save to Photos" en iPhone, el menú en móvil.
- Un error del servidor al pedir el ZIP (p. ej. 429) **no se ve** en la UI: el iframe lo ignora; el botón descansa 4 s para evitar el doble toque.
- `exiftool-vendored` necesita **perl** en la imagen de producción; el repo no tiene `Backend/Dockerfile` (deploy sin probar).
- El texto de `USAGE_TERMS` lo redacté yo: Alexis/Areli deben revisarlo.

## Visor con herramientas del admin (2026-10-10)

Pedido de Alexis: traer al visor del cliente comparar 2 fotos, descarga, zoom, favorito, rotar, resize e info.
- `client/src/app/pages/gallery/Viewer.jsx` (reemplaza `Lightbox.jsx`) + `client/src/components/viewer/` (ZoomStage, useEditedPreview,
  viewerEdits, explain, InfoPanel, EditPanels). Copias del visor del admin hasta que exista `shared/`.
- Rotar/resize son **solo para la descarga**: canvas para ver, `Backend/services/photo-delivery.js` `editedOriginal` para el archivo
  (sharp `applyEdits` + exiftool devuelve GPS/cámara + derechos), `GET …/download-edited?rotate&straighten&flipH&flipV&resize=WxH`,
  validación manual, máx. 2 ediciones a la vez en el servidor y 1 por cliente (429 `EDIT_BUSY`), solo reduce (nunca agranda).
- `GET …/photos/:id/info`: cámara + derechos; las coordenadas **no** se envían, solo `hasLocation`.
- Verificado: edición sintética con GPS/cámara (se conservan y se agregan derechos, orientación 1), `photoInfo` con datos reales,
  otro cliente → 404, lint y build. **No verificado**: el visor en el navegador (móvil y escritorio), compare/zoom táctil, descarga editada real.

## Verificado

| Qué | Cómo |
|---|---|
| Lint y build del cliente | `eslint` (0 errores, 2 warnings aceptados de `auth.jsx`) y `vite build` |
| Lint del admin tras renombrar keep→favorite | `eslint src/app/pages/galleries` |
| Modelos y rutas cargan | `node --check`, `import()` de las rutas |
| `gallery.get(1)` devuelve `favorite` por foto | consulta de lectura a la BD de desarrollo |
| `logDownload` en preview no escribe | llamada con `preview: true` |
| Recuadro azul sin seleccionar texto | **lo comprobó Alexis en su navegador** (Safari/macOS, tras dos arreglos) |

## No verificado

- Favoritos, descargas e historial **con sesión de cliente real**: no se escribió en la BD de desarrollo.
- "Save to Photos" en iPhone y la descarga por lotes; doble toque en pantalla táctil; cursores.
- Que `SELECT … FOR UPDATE` sobre `galleries` se comporte bajo concurrencia real.

## Trampas

- **Selección de texto en Safari**: `user-select` en el `body` no basta; hay que cancelar `selectstart`
  desde el press hasta el release (`useMarquee.js`).
- `Photo.keep` sigue en la base sin uso: no la reutilices; los `keep = true` viejos **no se migraron** a `favorites`.
- Los eventos viejos del historial conservan "Client …"; solo los nuevos llevan el nombre.
- El contador de descargas lo declara el cliente (`photoIds`); bajar por URL directa no deja registro.
- `useMarquee` del admin es otra copia y **puede tener el problema de selección de texto**.

## Pendiente (decisiones de Alexis)

- Migración opcional `keep` → `favorites` y borrar la columna; reescribir eventos viejos del historial.
