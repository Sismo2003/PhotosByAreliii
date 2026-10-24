---
tema: admin
fecha: 2026-10-05
---

# Foco de las miniaturas: la cara siempre a la vista

En la cuadrícula S/M/L, la tira del visor y la portada, las fotos verticales se recortaban por el centro y solo se veía el cuerpo. Ahora cada foto guarda un punto de foco y el recorte lo mantiene centrado. Sigue a [[2026-10-05-visor-zoom-y-metadatos]].

## Qué se hizo

- **Base de datos:** migración `20261006010838_add_photo_focus` con `photos.focusX`, `focusY` (`DOUBLE`, 0–1) y `focusSource` (enum `FACE` / `SALIENCY` / `MANUAL`), todas `NULL` mientras no se calcula. Aplicada en el Docker de dev (`docker compose run --rm prisma npx prisma migrate dev`). Cliente regenerado con `npx prisma generate` en `database/`.
- **Detector:** `Backend/services/photo-focus.js` → `computeFocus(thumb, { detail: web })`.
  - Modelo: UltraFace RFB-320 (`Backend/ml/ultraface-rfb-320.onnx`, 1.2 MB, MIT, sha256 `34cd7e60…f88017`) con `onnxruntime-node` (nueva dependencia de `Backend/`).
  - **Pasada 1:** la miniatura de 480 px, con letterbox a 320×240 (sin estirar). Puntaje mínimo 0.7, NMS.
  - **Pasada 2:** solo si no hubo cara. La copia web se recorre en mosaicos de 640×480 con 25 % de traslape. Puntaje mínimo 0.85, y solo cuenta caras de menos del 7 % del lado.
  - **Respaldo:** `sharp.strategy.attention`. Si devuelve (0, 0), se guarda `null`.
  - **Varias caras:** el centro de la caja que las encierra. Se descartan las menores al 20 % de la más grande.
- **Dónde se usa:**
  - `addPhotos` (al subir), con la miniatura y la copia web;
  - `editPhoto`, que lo recalcula (un `MANUAL` sobrevive solo a un `resize`);
  - el endpoint nuevo `POST /:id/photos/:photoId/focus` (`{ x, y }` o `{ reset: true }`);
  - el script `Backend/scripts/compute-focus.js` (`--all` recalcula todo salvo `MANUAL`).
- **Admin:**
  - `admin/src/app/pages/galleries/focus.js`: `focusPosition(photo, boxAspect)`, el `object-position` que centra el foco. Sin foco, las verticales usan y = 0.3.
  - `PhotoThumb` (`galleries/parts.jsx`): acepta `photo`, mide su caja con `ResizeObserver` y anima el cambio. Se usa en `PhotosTab`, en la tira del visor, en `CoverTab` (cuadrícula y vista previa de la portada).
  - Herramienta **Focus** en el visor (`viewer/FocusPanel.jsx`): un clic en la foto fija el punto, y "Use automatic" vuelve al calculado. Muestra vistas previas 4:3 y cuadrada, no lanza toast, y bloquea si hay ediciones sin guardar.
- **Docs:** `docs/api-galleries.md` (endpoint y sección "Foco de las miniaturas") y un comentario en `deploy/docker-compose.yml` sobre la imagen base.

## Corrección: fotos "dañadas" y sin cara centradas (2026-10-05)

- **Lo que vio el usuario:** algunas fotos aparecían con el ícono de imagen rota y él lo atribuyó a que no tenían cara. **No era el foco.** Los archivos estaban completos en el disco. Pasaba esto:
  1. durante una subida, `GET /:id` devolvía filas que todavía se estaban guardando (rutas vacías), y su miniatura respondía 404;
  2. `PhotoThumb` nunca reintentaba, así que se quedaba con el ícono aunque el archivo ya existiera. También pudo pasar con el backend reiniciándose (`node --watch`).
- **Arreglo:** `GalleryModel.get` filtra `webPath: { not: '' }`, y `PhotoThumb` reintenta dos veces (`?retry=n`) y se reinicia si cambia la foto o la versión.
- **Sin cara → centrada** (pedido del usuario). Se quitó el respaldo `attention`, que usaba `SALIENCY`, y el respaldo de "parte superior" en verticales. `computeFocus` devuelve `null`, y `focusPosition` devuelve `undefined` (centro) sin foco. `compute-focus.js --all` ahora borra el punto de las fotos sin cara: 60 fotos, 54 con cara y 6 centradas.
- **Lo de arriba que quedó viejo:** las menciones al respaldo `SALIENCY` y a "verticales con y = 0.3" ya no aplican.

## Qué es onnxruntime-node

Pregunta del usuario ("¿es un Python?"). Respuesta, también en `docs/api-galleries.md`:

- **Qué es `onnxruntime-node` (no es Python):**
  - Es un paquete de npm para Node.js. Se instala con `npm install` y se usa desde JavaScript, igual que `sharp`.
  - **ONNX** es un formato estándar de archivo para modelos de IA ya entrenados (el "JPG" de los modelos): alguien lo entrena, a veces con Python, y lo exporta a `.onnx`. Aquí es `Backend/ml/ultraface-rfb-320.onnx`.
  - **ONNX Runtime** (Microsoft, código abierto, C++) es el motor que *ejecuta* ese archivo. `onnxruntime-node` lo trae ya compilado y le pone una interfaz en JavaScript, igual que `sharp` con libvips.
  - **No necesita** Python, GPU, internet ni entrenar nada. Corre en el CPU del servidor, y las fotos nunca salen de él.
  - El motor viene compilado solo para sistemas con **glibc** (la mayoría de los Linux, y macOS). Por eso la imagen de Docker no puede ser Alpine, que usa musl.

## Decisiones

| Decisión | Por quién | Por qué |
|---|---|---|
| Detectar la cara una vez y guardar el punto en el backend | usuario | Pedido directo ("correría una sola vez") |
| Guardarlo en `photos` y no en un archivo de configuración | agente, aceptado por el usuario | Viaja con la foto en la API y se borra con ella |
| No guardar la orientación | agente, aceptado por el usuario | Sale de `width` y `height`, que ya vienen corregidos por EXIF |
| Detector pre-entrenado (UltraFace) y no una regresión | agente | Una regresión no puede encontrar caras sin un modelo entrenado. UltraFace pesa 1.2 MB, corre en CPU y su salida ya viene decodificada |
| UltraFace en lugar de YuNet | agente | Post-proceso mucho más simple (scores + boxes); suficiente para retratos |
| Guardar solo un punto, nunca cajas de cara | agente | Privacidad de los clientes: basta para centrar |
| Corrección manual (`MANUAL`) | agente, en la propuesta aceptada | Resuelve maternidad, detalles y perfiles |

## Verificado vs. no verificado

| Pieza | Prueba |
|---|---|
| Detector | Las 20 fotos de dev de la galería 1 dieron `FACE` en ~5 ms cada una. Hoja de contacto con el punto dibujado, revisada a ojo: todas sobre la cara |
| Caras pequeñas | Pareja en un paisaje (foto 45): la pasada 1 no encontraba nada. La pasada 2 dio un falso positivo grande (el vestido, 0.859) que se llevaba el foco; con el límite del 7 % quedó en la cara del hombre (0.42, 0.65), en ~130 ms |
| Respaldo | Recorte sin cara → `SALIENCY`; imagen plana → `null` |
| Script | `node scripts/compute-focus.js --all` → 25 fotos, 25 con cara |
| Modelo | `setPhotoFocus` manual → `MANUAL`; `reset` → vuelve a `FACE` con el mismo punto; foto inexistente → 404 |
| Validador | `photoFocusBody`: `{x,y}` ok, `{reset:true}` ok, `x: 2` → "Invalid x", falta `y` → "y is required" |
| `focusPosition` | Vertical 2:3 en 4:3 con cara en y=0.3 → `50% 10%` (centrada); y=0.05 → `0%`; horizontal x=0.8 en 1:1 → `100%` |
| Admin | `npx eslint src/app/pages/galleries/` y `npx vite build` ok |

**Lo que NO está verificado:**
- **Nada en el navegador:** la cuadrícula recortando hacia la cara, la herramienta Focus (clic, marcador, vistas previas) y la tira del visor.
- El endpoint por HTTP con sesión real (solo se probó el modelo directo).
- La subida y la edición reales de punta a punta.
- `onnxruntime-node` en Linux/Docker: solo se probó en macOS arm64. El Dockerfile del backend todavía no existe.
- La lista de galerías (`galleries/cells.jsx`) sigue recortando la portada por el centro: la API de la lista no trae el foco de la portada.

## Trampas descubiertas

- **UltraFace con una foto vertical estirada a 320×240** deforma las caras. Por eso se usa letterbox, y las coordenadas se convierten de vuelta a la foto.
- **onnxruntime imprime cientos de avisos** ("Initializer … appears in graph inputs") con este modelo. `logSeverityLevel: 3` los calla.
- **sharp `attention` devuelve `attentionX/Y = 0` cuando nada destaca,** y eso no es un punto real.
- **En los mosaicos, cuidado con los falsos positivos grandes:** una "cara" grande que la pasada completa no vio casi seguro es ruido.
- **sharp aplica `resize` antes que `composite` en la misma cadena.** Para dibujar sobre una imagen y luego achicarla, hay que pasar por un buffer intermedio.

## Siguiente paso

- Probar en el navegador (preguntar antes de usar Chrome).
- Al crear `Backend/Dockerfile`: base `node:<v>-slim` y probar `compute-focus.js` dentro del contenedor.
- Si se quiere, traer `coverFocus` en la lista de galerías para `cells.jsx`, y usar el foco en la galería del cliente cuando exista.

---
Relacionado: [[admin]] · [[2026-10-05-visor-zoom-y-metadatos]] · [[2026-10-04-galleries]]
