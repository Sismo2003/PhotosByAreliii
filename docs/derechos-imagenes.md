# Derechos de las imágenes publicadas

El repositorio es público, pero **las imágenes no se licencian**: el código es una muestra de
portafolio y el material fotográfico pertenece a Photos By Areliii LLC.

## Imágenes en el repo

| Archivo | Uso | Titular |
|---|---|---|
| `client/public/login.jpg` | fondo de la pantalla `/login` | © Photos By Areliii LLC. Todos los derechos reservados |
| `Frontend/src/assets/photos/*.jpg` (48) | portafolio y páginas de la landing (decisión de Alexis, 2026-10-26) | © Photos By Areliii LLC. Todos los derechos reservados |

No se concede licencia para copiarlas, modificarlas ni redistribuirlas, ni siquiera clonando el repo.
Quien reutilice el código debe reemplazarlas por sus propias imágenes.

### Fotos de la landing

- Se generan con `node scripts/prepare-photos.mjs` (desde `Frontend/`) a partir de las originales de Areli
  (carpeta local, ignorada). La lista está en el script; alt EN/ES y dónde aparece cada una en
  `Frontend/src/data/photos.ts`.
- El script gira, reduce a ≤ 2000 px, **borra todos los metadatos** y escribe solo `Copyright` y `Artist`
  (sharp `withExif`). Astro hace las versiones WebP al compilar (también sin metadatos).
- **Pendiente:** que Areli confirme el consentimiento de las personas que aparecen (hay menores).

## Cómo está marcada

Metadatos incrustados en el archivo (se conservan al copiarlo; se ven con `exiftool` o en "Obtener información"):

- `Copyright` / `IPTC:CopyrightNotice`: `© <año> Photos By Areliii LLC. All rights reserved.`
- `Artist` / `Creator`: `Photos By Areliii LLC`
- `XMP-xmpRights:Marked = true` y `UsageTerms`: sin licencia de reutilización
- **Sin GPS, sin marca/modelo de cámara ni números de serie** (se borró todo antes de escribir lo anterior).

Los metadatos no impiden la copia: documentan la autoría. Una marca de agua visible es la única protección
real contra el uso indebido, pero degrada el diseño del login; si se quiere, se aplica en `client/public/`.

## Al cambiar o añadir una imagen pública

1. Quitar todo y marcar (desde `Backend/`, que ya tiene `exiftool-vendored`):
   `exiftool -all= -overwrite_original <archivo>` y luego escribir `Copyright`, `Artist`, `Rights`, `XMP-xmpRights:Marked`.
2. Confirmar que no hay personas identificables ni consentimiento pendiente, y que no quedan metadatos (`exiftool <archivo>`).
3. Añadir la excepción al `.gitignore` (`!ruta/archivo.jpg`) y a `check-secrets.sh`, y documentarla aquí
   (las fotos de la landing ya están cubiertas por `!Frontend/src/assets/photos/*.jpg`).
4. Fotos de sesiones de clientes: **nunca** al repo; viven en `storage/` del servidor.
