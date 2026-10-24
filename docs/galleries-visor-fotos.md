# Visor de fotos (galería admin) — cambios de 2026-10-05

Código: `admin/src/app/pages/galleries/gallery/viewer/PhotoViewer.jsx`, `gallery/SelectionIsland.jsx`, `gallery/PhotosTab.jsx`.
**No probado en el navegador** (eslint limpio). Probar en `/admin/galleries/1`.

## 1. Crop: la foto cabe entera y se ven las 4 esquinas

- **Síntoma:** al activar Crop la foto salía a tamaño completo, cortada arriba/abajo.
- **Causa:** `react-image-crop` trae CSS sin capa (`max-height: inherit`, `max-width: 100%` en la `<img>`) que
  gana a las utilidades de Tailwind v4 (van en `@layer`), así que los límites puestos con clases en la imagen no se aplicaban.
- **Arreglo:** el contenedor del crop usa `container-type: size` y los límites van en el `style` de `<ReactCrop>`
  (`calc(100cqw - 2rem)` / `calc(100cqh - 2rem)`); la imagen los hereda. Regla: **límites de tamaño de lo que
  envuelve `ReactCrop` van en `style`, no en clases.**

## 2. Isla de Cancel / Save siempre visible

- **Síntoma:** con un crop sin guardar, al cerrar el sidebar la vista previa seguía recortada y no había forma de cancelar sin volver a abrir la herramienta.
- **Cambio:** se quitaron Reset y Save changes del `<aside>`. Ahora hay una isla flotante dentro de `<main>`
  mientras `dirty` (`hasEdits(edits)`) sea verdadero, sin importar el panel abierto:
  "Unsaved edits · W × H px" + **Cancel** (`resetEdits`) + **Save** (abre el `ConfirmModal` "Replace the original?").
- Posición: abajo al centro en escritorio, arriba al centro en móvil (el panel móvil ocupa abajo). `onPointerDown`
  se detiene para no disparar el swipe de `<main>`.
- La advertencia "Saving replaces the original file…" ya solo vive en el modal. Se eliminó `EDIT_PANELS`.

## 3. Compare desde la isla de selección

- Con **exactamente 2** fotos seleccionadas, `SelectionIsland` muestra **Compare** (icono `ArrowsRightLeftIcon`).
  Con 1, 3 o más no aparece; los demás botones se mantienen.
- `PhotosTab` guarda `compareId` y abre el visor con `startId` = primera foto y `compareId` = segunda.
  `PhotoViewer` acepta `compareId`: si viene, arranca con `compare` activo y `otherId` = esa foto. Se limpia al cerrar.

## Dudas
- ¿Compare debía ser el **único** botón con 2 fotos? Se interpretó como "solo aparece con 2", sin quitar los otros.

## Checklist
- [ ] Crop: foto completa visible, con las 4 esquinas, en escritorio y móvil.
- [ ] Hacer un crop, cerrar el sidebar: la isla sigue; Cancel restaura la foto; Save pide confirmación.
- [ ] Cambiar de foto con cambios sin guardar sigue bloqueado por el aviso (`guard`).
- [ ] Seleccionar 2 fotos → Compare abre A/B correctas; con 3 no aparece.
