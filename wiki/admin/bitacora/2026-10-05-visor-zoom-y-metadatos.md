---
tema: admin
fecha: 2026-10-05
---

# Visor de fotos: guardar, navegación, zoom y metadatos de propiedad

Segunda sesión sobre el visor de [[2026-10-05-visor-de-fotos]]. Arregla el guardado de ediciones,
cambia cómo se navega y se hace zoom, y marca los archivos con metadatos de propiedad.

## Qué se hizo

**1. Fix: "Save changes" siempre fallaba**
- `GalleryModel.editPhoto` (`Backend/models/gallery.model.js`) llamaba a `storage.replaceOriginal`, que **nunca se había escrito**. Cada guardado daba `TypeError` → 500 → toast "Something went wrong". Por eso el recorte tampoco se aplicaba.
- `replaceOriginal` ahora existe en `Backend/services/storage.js`. Aplica `applyEdits` y escribe original, web y miniatura en `tmp/`. Solo al final los renombra encima de los reales, así que si algo falla el original queda intacto. Devuelve `width`, `height` y `sizeBytes`.
- `toPayload` (`admin/src/app/pages/galleries/gallery/viewer/viewerEdits.js`) limita el recorte a 0–1.

**2. Cuadrícula de Photos** (`admin/src/app/pages/galleries/gallery/PhotosTab.jsx`)
- Doble clic en una foto abre el visor en esa foto.
- Hover: escala 1.04 con sombra suave y `cursor-pointer`. El relleno del área de scroll pasó de `p-1` a `p-3` para que el borde de la foto ampliada no se corte.

**3. Navegación del visor** (`viewer/PhotoViewer.jsx`)
- Las flechas `<` `>` se cambiaron por `SideZone`: franjas de todo el alto (80 px, 96 px en `lg`) que se iluminan en azul mate al hover (`#2a4a6e` al 40 % + `backdrop-blur-sm`). Solo en `md+`.
- Deslizar con el dedo o arrastrar con el mouse cambia de foto (más de 80 px, o un lanzamiento rápido de más de 30 px). Si no llega, la foto regresa al centro. Está apagado en Crop, Zoom y Compare.
- Keep ya no muestra toast. Hide ya no lo tenía.

**4. Zoom** (`viewer/ZoomStage.jsx`, nuevo)
- El botón "100%" ahora se llama **Zoom** (atajo `Z`). `ZoomStage` también se usa en los dos paneles de Compare.
- `ZoomBar` tiene:
  - lupa + y lupa −: clic en un punto de la foto hace zoom ahí (Alt invierte); pulsar la lupa ya seleccionada hace zoom al centro;
  - la mano, para mover;
  - − / slider logarítmico / +, al centro;
  - el porcentaje, Fit y 100 %.
- Rueda y trackpad hacen zoom en el cursor. Pellizco con dos dedos. Atajos `+` `−` `0`.
- La vista se guarda en fracciones, `{ s, cx, cy }` (`FIT_VIEW`, `MAX_ZOOM = 24` y `clampZoom` en `viewerEdits.js`). Así, en Compare, las dos fotos comparten la vista y se mueven sincronizadas.
- Lo que se dibuja sigue a la vista objetivo cuadro por cuadro con `requestAnimationFrame`:
  - la escala avanza en logaritmo, con suavizado (`SMOOTH = 0.09` s) y una velocidad máxima (`ZOOM_SPEED = 3.5` duplicaciones por segundo: 2× ≈ 0.3 s, de Fit al máximo ≈ 1.3 s);
  - se mantiene quieto el punto de pantalla que comparten la vista actual y la objetivo;
  - solo usa `transform` (translate3d + scale), y `will-change` solo mientras se anima;
  - el arrastre y el pellizco responden al instante; la rueda pasa por el límite de velocidad.
- Muestra primero la copia web. El original se carga cuando la foto se dibuja más grande que la copia web, y se cambia solo después de `img.decode()`.
- Se eliminó `ZoomView`, el 100 % anterior.

**5. Metadatos de propiedad** (`Backend/services/photo-rights.js`, nuevo)
- `rightsFor(gallery)` arma los datos y `stamp(img, rights)` los aplica (`withExif` + `withXmp` de sharp 0.35).
- EXIF IFD0:
  - Artist: "Photos By Areliii LLC";
  - Copyright: "© <año en Phoenix> Photos By Areliii LLC. All rights reserved.";
  - ImageDescription: "Licensed to: Gallery #<id> – <título>".
- XMP: `dc:creator`, `dc:rights`, `dc:description`, `photoshop:Credit`, `xmpRights:Marked`, `Iptc4xmpCore:CreatorContactInfo` (email), `plus:Licensor` y `plus:Licensee`.
- Se escribe en la copia web y la miniatura al subir (`savePhoto`), y en el original editado, la web y la miniatura al guardar una edición (`replaceOriginal` → `applyEdits(…, rights)` en `Backend/services/photo-edit.js`).
- El **original subido no se toca**.
- Pendientes: D-G10 en `docs/galleries-pendientes.md`.

**6. Cuadrícula sin scroll propio, con páginas**
- Se quitó la caja con scroll de la cuadrícula (`max-h-[280vh] overflow-y-auto overscroll-contain`): con pocas fotos atrapaba la rueda y la página no bajaba. Ahora la cuadrícula crece con la página.
- Paginación del lado del cliente con TanStack (`gallery/usePhotoPages.js`) y el footer **estático** `PaginationSection` (`components/shared/table/PaginationSection.jsx`, páginas numeradas), con las nuevas props `pageSizes` y `unit`. Va debajo de la cuadrícula, fuera del marquee. **Excepción a la regla de la isla flotante** (`CLAUDE.md` / skill `admin-tables`): primero se puso la `PaginationIsland` y el usuario pidió cambiarla por este footer (2026-10-05).
- Tamaños de página múltiplos de las columnas de cada tamaño de miniatura, para que cada página termine en una fila completa: S 105/210, M 30/60/120, L 12/24/48. El footer solo aparece con más de una página.
- La selección se conserva entre páginas: el footer está fuera del contenedor del marquee. "Select all" y Cmd+A toman todo el set. Al cerrar el visor se muestra la página de la última foto vista. Cambiar de set u orden regresa a la página 1.

## Decisiones

| Decisión | Por quién | Por qué |
|---|---|---|
| Doble clic abre el visor; hover con escala y cursor de mano | usuario | Pedido directo |
| Flechas → franjas de todo el alto, azul mate, minimalista; navegar deslizando | usuario | Pedido directo (con capturas) |
| Zoom como herramienta: clic en un punto = zoom ahí; botón = zoom al centro; zoom out; barra; también en Compare | usuario | Pedido directo |
| Lupa ya seleccionada + otro clic = zoom al centro | usuario | Pedido directo |
| Zoom suave con límite de velocidad, "ni muy lento ni super rápido" | usuario | La barra se veía a tirones |
| Compare con una sola vista compartida (sincronizada) | agente | Comparar el mismo detalle en A y B |
| Quitar el scroll interno de la cuadrícula y paginar | usuario (eligió páginas, frente a scroll infinito y "Show more") | El scroll interno atrapaba la rueda |
| Footer estático `PaginationSection` en vez de la isla, solo en esta cuadrícula | usuario | Preferencia; excepción a la regla de la isla |
| Sin toast al dar Keep | usuario | El corazón ya lo indica |
| Autor "Photos By Areliii LLC"; cliente como "Licensed to: Gallery #id – título" (no el nombre del cliente) | usuario | Respuesta a la propuesta del agente; protege la privacidad del cliente |
| No reescribir el original subido; marcar solo lo que sharp ya recomprime | agente | sharp siempre recomprime el JPEG, y eso pierde calidad |
| Sin términos de uso (`xmpRights:UsageTerms`) | — | El usuario no dio el texto; queda abierto |

## Verificado vs. no verificado

| Pieza | Prueba |
|---|---|
| `applyEdits` con recorte | `node` sobre una copia de una foto de dev en el scratchpad → ok |
| `replaceOriginal` | `STORAGE_PATH` apuntando a una copia; rotar 90° + enderezar 3° + voltear + recortar → original 825×440, web 825×440, miniatura 480×256, `tmp/` vacío |
| Metadatos | `savePhoto` + `replaceOriginal` sobre una copia, leídos con exifr: Artist, Copyright y ImageDescription en web, miniatura y original editado; los 5 namespaces XMP presentes; sin GPS |
| Admin | `npx eslint` de `viewer/` y `PhotosTab.jsx` sin errores; `npx vite build` ok |
| Backend | `import('./models/gallery.model.js')` carga sin error |

**Lo que NO está verificado:**
- **Nada se probó en el navegador.** No se probaron el guardado real con sesión, el hover, el doble clic, las franjas, el deslizar, el zoom (animación, pellizco, rueda, Compare sincronizado) ni el toast de Keep.
- No se probó que exiftool, Lightroom o Vista Previa muestren los metadatos. Solo se leyeron con exifr.
- Doble toque en móvil para abrir el visor.

## Trampas descubiertas

- **Una función del backend llamada pero inexistente no falla al arrancar.** `storage.js` se importa con `import * as storage`, así que `storage.replaceOriginal` es `undefined` hasta el momento de llamarla. Solo truena en la petición, como 500 genérico.
- **react-image-crop** puede devolver porcentajes como `100.0000001`, y el validador yup (`editPhotoBody`, `max(1)`) los rechazaría.
- **Animar el zoom con `width`/`height` + transición CSS da tirones**, porque recalcula el layout y vuelve a dibujar la imagen en cada cuadro. Una transición de duración fija también da tirones con el slider: cada `onChange` la reinicia. Lo que funciona es un seguimiento por `requestAnimationFrame` sobre `transform`.
- **StrictMode y `requestAnimationFrame`:** el cleanup de desmontaje tiene que poner `rafRef.current = 0`. Si no, al volver a montar el loop se cree "corriendo" y no arranca nunca.
- **EXIF solo admite ASCII.** libvips convierte `©` → `(C)` y `–` → `-`. El XMP conserva los caracteres.
- **Copia web y miniatura sin metadatos:** sharp, por defecto, quita todos los metadatos, así que antes de este cambio esas copias no llevaban nada (tampoco GPS).
- En `replaceOriginal`, una variable local llamada `stamp` (el timestamp) tapaba el `stamp` importado de `photo-rights.js`. Ahora se llama `tag`.

## Siguiente paso

- Probar todo en el navegador (preguntar antes de usar Chrome).
- D-G10 (`docs/galleries-pendientes.md`):
  - escribir los metadatos sin pérdida en el original con `exiftool` cuando exista la descarga del cliente, y quitar ahí el GPS;
  - un script que regenere la copia web de las fotos subidas antes del 2026-10-05;
  - decidir el texto de términos de uso.

---
Relacionado: [[admin]] · [[2026-10-05-visor-de-fotos]] · [[2026-10-04-galleries]]
