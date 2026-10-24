---
tema: admin
fecha: 2026-10-05
---

# Subida de fotos que fallaba ("Can't reach the server") y auditoría de efectos

## Qué se hizo

1. **Base de datos de desarrollo vaciada** (pedido del usuario): `TRUNCATE` de todas las tablas de
   `photosbyarelli` en el contenedor `pba-dev-mysql-1`, con `FOREIGN_KEY_CHECKS=0`, **menos**
   `users` (se mantiene el login del admin) y `_prisma_migrations` (el historial de Prisma; si se
   vacía, Prisma volvería a aplicar las migraciones). Quedaron vacías también las tablas de
   catálogo (`services`, `packages`, `extras`, `studio_settings`, `email_templates`…): hay que
   volver a cargar `database/seeds` si la app las necesita. Los auto-increment se reiniciaron.
2. **Bug de la subida de fotos**, en `admin/src/app/pages/galleries/gallery/useUploader.js`:
   el `AbortController` se creaba una vez con `useRef(new AbortController())` y el `useEffect`
   lo abortaba al desmontar. En desarrollo, `React.StrictMode` (`admin/src/main.jsx`) monta,
   desmonta y vuelve a montar: el controlador quedaba abortado para siempre, así que cada
   `uploadPhoto` se cancelaba antes de enviarse. `admin/src/utils/axios.js` traduce cualquier
   error sin respuesta a "Can't reach the server". Ahora el controlador se crea **dentro** del
   efecto.
3. **Auditoría de patrones parecidos** en `admin/src` (efectos, timers, listeners, observers,
   `createObjectURL`) y arreglos:
   - `admin/src/components/shared/PreviewImg.jsx`: revocaba `previewUrl` (valor viejo del
     estado, `null`) en vez de la URL creada; ahora revoca la de esa ejecución.
   - `admin/src/components/shared/form/FileItemSquare.jsx`: creaba una URL de objeto en cada
     render sin liberarla; ahora una por archivo, revocada al desmontar.
   - Búsquedas con debounce en `app/pages/bookings/new/ClientSection.jsx` (búsqueda y chequeo de
     cliente existente) y `app/pages/galleries/new/index.jsx`: una respuesta lenta y vieja podía
     pisar la nueva; ahora se ignora si la consulta ya fue reemplazada (`stale`).

## Decisiones

| Decisión | Por quién | Por qué |
|---|---|---|
| Truncar todo excepto `users` | usuario | es una base de test; conservar su login |
| Dejar `_prisma_migrations` intacta | agente | vaciarla rompería el estado de migraciones |
| Arreglar también los patrones parecidos tras la auditoría | usuario (pidió auditar para que no pase de nuevo) | misma familia de bug de ciclo de vida |

## Verificado vs. no verificado

| Pieza | Prueba |
|---|---|
| Truncado | conteos después: `users`=1, `bookings`/`clients`/`photos`/`services`=0, `_prisma_migrations`=4 |
| Backend acepta subidas | `curl` autenticado (JWT firmado en local) a `/api/admin/galleries/1/photos` vía Vite (5174): 201 con un JPG de 21 MB y con `_MG_6285.jpeg` (1 MB); 422 con bytes aleatorios; 401 sin sesión |
| Causa del fallo | `/private/tmp/backend.log`: tras `POST /api/admin/storage/check` 200 nunca llegó un `POST …/photos` del navegador; pestaña Network sin la petición |
| Espacio en disco descartado | `GET /api/admin/storage`: ~8.4 GB libres, nivel `CRITICAL` pero `uploadsBlocked: false` |
| Lint y build | `npx eslint` de los archivos tocados sin avisos; `npx vite build` compila |

**Lo que NO está verificado:** que la subida funcione en el navegador tras el arreglo (el usuario
debe refrescar y probar); que `PreviewImg`, `FileItemSquare` y las búsquedas se comporten bien en
pantalla; el resto de `admin/src` solo se revisó por patrones, no línea por línea.

## Trampas descubiertas

- **StrictMode solo en desarrollo**: un recurso con limpieza creado fuera del `useEffect`
  (controlador, listener, timer, URL) queda muerto tras el primer desmontaje de prueba. En
  producción no aparece. Crear y limpiar dentro del mismo efecto.
- **"Can't reach the server" no significa que el servidor esté caído**: `admin/src/utils/axios.js`
  lo muestra para cualquier error sin `response` (red, CORS, petición cancelada). Mira si la
  petición llegó a `/private/tmp/backend.log` antes de sospechar del backend.
- **507 y navegador**: `guardUpload` (`Backend/middlewares/upload.middleware.js`) responde 507
  sin leer el cuerpo; el navegador puede ver eso como conexión cortada y mostrar el mismo
  "Can't reach the server". Mejora pendiente, no era la causa aquí.
- El backend de desarrollo escribe su log en `/private/tmp/backend.log` (stdout del proceso).
- La Mac estaba al 96 % de disco; por debajo de 500 MB libres (`RESERVE_BYTES`) las subidas
  se bloquean de verdad.

## Siguiente paso

- El usuario refresca el admin y vuelve a subir fotos.
- Opcional: regla en `CLAUDE.md` ("controladores, listeners y URLs de objeto se crean y limpian
  dentro del mismo `useEffect`"), que el usuario aún no ha confirmado; y hacer que un 507 llegue
  al admin como "Not enough space" en lugar de "Can't reach the server".

---
Relacionado: [[admin]], [[2026-10-04-galleries]], [[infraestructura]]
