---
tema: admin
fecha: 2026-10-09
---

# Bugs de la auditoría: datos de clientes, aviso de galería y sesión (B1, B2, B4, B5, B7, B8)

Origen: `docs/auditoria-2026-10-09.md` §2. Se corrigen los cuatro bugs que pidió el usuario
(B1, B2, B5 y B7+B8) y de paso B4, que vive en la misma función que B5. Además se creó la
pantalla de cambio de contraseña, con requisitos de seguridad pedidos por el usuario.

## Qué se hizo

**B1 · "Update client" no cambiaba el login** — `Backend/models/booking.model.js` (`resolveMatch`,
acción `update_client`). Ahora llama a `syncLoginEmail` (`Backend/models/login-email.js`, nuevo), el
mismo helper que usa la edición de Clients (`client.model.js`). Revisa que otro login no tenga el
email (409) y actualiza `User.email` en la misma transacción. Si falla, no cambia ni `Client` ni `User`.

**B2 y B3 de formulario · reserva manual** — `Backend/models/booking-create.model.js`
(`resolveClient`, `lookupClient`):
- Cliente nuevo (sin `clientId`): **email y teléfono son obligatorios** (400) y el teléfono se valida
  con libphonenumber-js. Antes el teléfono era opcional.
- Teléfono ya registrado con **otro** email → **409** con el texto: "This phone number is already
  registered with another email (a***@dominio). Please try again with that email. If you'd like to
  change it, contact the business and ask them to update the email." El email se muestra enmascarado.
  `details.code = PHONE_OTHER_EMAIL`. La reserva no se crea y el cliente existente no se toca.
- Email y teléfono que apuntan a **dos** clientes distintos: el 409 que ya existía.
- Un cliente encontrado solo por coincidencia (sin `clientId`) **ya no se modifica** con lo que se
  escribió en el formulario (antes se pisaba su nombre y notas). Con `clientId` (el admin lo eligió)
  sigue pudiendo editar nombre, Instagram, "cómo nos encontró" y notas, como dice
  `docs/nuevo-booking-admin.md` §4.
- `GET /new/client-lookup` responde `matchedBy: "PHONE_OTHER_EMAIL"`, `client: null` y `message`, para que
  el formulario avise mientras se escribe en lugar de cargar al otro cliente y reemplazar el email.
- Admin: `admin/src/app/pages/bookings/new/schema.js` (teléfono obligatorio en cliente nuevo) y
  `ClientSection.jsx` (muestra el aviso; el campo Phone deja de decir "optional"; un email a medias
  escrito no se reemplaza por el del dueño del teléfono). El toast de 409 dura 12 s para poder leerse.

**B5 · fecha de vencimiento** — `Backend/models/gallery.model.js` (`update`): si `expiresAt` cambia,
`expiryReminderSentAt` vuelve a `null`, igual que Extend. Si se manda la misma fecha no se reinicia.

**B4 (extra, misma función)** — `update` ahora solo escribe y registra lo que realmente cambia. Un
PATCH que no cambia nada ya no deja "Settings updated: favoritesEnabled" en el historial.

**B7 · sesión vencida** — `admin/src/utils/axios.js` avisa con `setUnauthorizedHandler` ante un 401 de
cualquier llamada que no sea `/auth/*`; `AuthProvider` (`SESSION_EXPIRED`) cierra la sesión local y
`AuthGuard` manda a `/login?redirect=<ruta+query>` con el mensaje "Your session ended. Sign in again."

**B8 · `mustChangePassword` y cambio de contraseña (rediseñado el mismo día por el usuario)** — la
pantalla de cambio de contraseña es **solo para clientes**, no para el admin: la usa quien recibe el
correo de "tus fotos están listas" y entra por primera vez con la contraseña que generamos. Se
quitó todo lo que se había puesto en `admin/` (ruta, página, enlaces del sidebar, redirección del guard).
Los administradores tendrán más adelante un modal simple en el panel; **hoy no pueden cambiar su
contraseña** (el endpoint responde 403 a un ADMIN). Qué hay:
- `Backend/controllers/auth.controller.js` (`changePassword`): solo rol `CLIENT`. `/auth/me` y el login
  devuelven ahora `firstName` y `lastName` del cliente para que la vista valide mientras se escribe.
- `Backend/utils/password-rules.js` (nuevo): las tres reglas.
- `Frontend/src/components/portal/ChangePassword.jsx` y `passwordRules.js` (nuevos): la vista, con las
  reglas visibles que se marcan con palomita mientras se escribe; "Save password" sigue deshabilitado
  hasta cumplirlas todas y que coincida la repetición. **El portal del cliente (Astro) no existe aún**:
  `Frontend/` solo tenía `package.json`, así que es un componente React listo para montarse como isla
  (`<ChangePassword client:load user={me} onDone={…} />`), no una página.

### Reglas de la contraseña (decisión del usuario)

1. **Más de 8 caracteres** (se tomó literal: 9 o más; con 8 exactos no pasa).
2. **Al menos 1 mayúscula.**
3. **No contiene el nombre ni el apellido registrados.** Sin importar mayúsculas ni acentos
   ("MARIA" bloquea "María"); cada palabra del nombre y del apellido cuenta por separado; palabras de
   menos de 3 letras se ignoran (si no, "Li" rechazaría casi todo); si no hay nombre/apellido se usa
   el nombre para mostrar.
Además, sin mostrarse como regla: distinta de la contraseña actual y máximo 128 caracteres. Se quitó la
regla "no puede ser tu email" que se había puesto antes, porque no estaba en la lista del usuario.

## Seguridad del cambio de contraseña (`Backend/controllers/auth.controller.js`)

| Riesgo | Medida |
|---|---|
| Cookie robada cambia la contraseña | Pide `currentPassword` (argon2.verify); en el primer ingreso es la que se generó |
| Fuerza bruta de la contraseña actual desde una sesión | `express-rate-limit` en `routes/auth.routes.js`: 5 intentos fallidos / 15 min por cuenta; solo cuentan las contraseñas incorrectas |
| Sesión robada sigue viva tras el cambio | Columna `User.passwordChangedAt`; `requireAuth` rechaza tokens anteriores. El cambio emite un token nuevo para quien lo hizo |
| Token de otra cuenta/rol | `requireAuth` relee el usuario en cada petición: rol de la base, cliente borrado → 401 (cierra S9) |
| Un admin usa el endpoint | 403: solo `CLIENT` |
| Algoritmo del JWT | `HS256` fijado al firmar y al verificar |
| DoS con contraseñas gigantes | Máximo 128 caracteres antes de tocar argon2 |
| Tipos raros (`{}`, arreglos) | Se exige `typeof === "string"` (400, ya no 500) |
| Fuga de detalles internos | Todas las respuestas de auth usan `sendError` (500 genérico; cierra S7) |
| Contraseña mala = "sesión terminada" | Responde **400** (`WRONG_PASSWORD`), nunca 401 |
| Cache | `Cache-Control: no-store` en la respuesta |
| Almacenamiento | Nada en localStorage; campos `type=password` con `autocomplete` correcto; se vacía el campo tras un error |
| Reglas solo en el navegador | El servidor las revisa otra vez y responde `PASSWORD_RULES` con cuál falló |

Migración: `database/prisma/migrations/20261010030821_add_user_password_changed_at/` (columna nullable,
sin datos que migrar). Se actualizó `database/schema.dbml`. Dependencia nueva: `express-rate-limit` en `Backend/`.

## Decisiones

| Decisión | Por quién | Por qué |
|---|---|---|
| 409 con mensaje y email enmascarado en vez de pedir confirmación | usuario (texto) / agente (máscara) | evita mezclar clientes; la máscara evita filtrar el email completo si luego se reutiliza en el formulario público |
| Email y teléfono obligatorios al crear cliente a mano | usuario | son los identificadores con los que se reconoce al cliente que vuelve |
| Cambio de contraseña con sesión revocable (`passwordChangedAt`) | usuario pidió "seguro y sin vulnerabilidades" | sin revocar, un cambio no corta una cookie robada (S6 de la auditoría) |
| Límite de intentos en memoria | agente | un solo proceso de API; si hay varios, pasar a un almacén compartido |
| Cambio de contraseña solo para clientes; el admin queda fuera por ahora | usuario | los admins tendrán un modal propio más adelante |
| "Más de 8" = 9 o más | agente (lectura literal) | si el usuario quiso decir 8 o más, es cambiar `PASSWORD_MIN_LENGTH_EXCLUSIVE` y `length` en `passwordRules.js` |

## Verificado vs. no verificado

| Pieza | Prueba |
|---|---|
| Auth del cambio de contraseña (primera versión, antes del rediseño): 400 por campos/tipos/largo, 429 al sexto intento, sesiones anteriores revocadas, login con la nueva y no con la vieja, API admin con token revocado 401 | script temporal contra la API real y la base de dev; 19 comprobaciones |
| Cambio de contraseña de cliente (versión final): login devuelve `mustChangePassword` y nombres; admin → 403; rechazo por 8 caracteres, sin mayúscula, nombre (con acentos y mayúsculas) y apellido; igual a la actual; actual incorrecta; éxito limpia el flag y revoca la sesión vieja | script temporal contra la API real; 11 comprobaciones |
| Reglas: la copia del Frontend y la del Backend dan el mismo resultado en 11 casos; la vista se renderiza con sus 3 reglas y el botón deshabilitado | script temporal con esbuild + `renderToString` |
| B1 (sincroniza, 409 si otro login tiene el email, rollback), B2 (409 + texto, máscara, sin cliente ni reserva creados, cliente intacto), obligatoriedad, lookup, B4, B5 | script temporal contra MySQL de dev; 21 comprobaciones. Los datos de prueba se borraron |
| Admin | `npm run lint` sin errores, `npm run build` OK |

**Lo que NO está verificado:**
- Nada se vio en el navegador: ni la vista del cliente (palomitas al escribir, estilos), ni el redirect por 401
  del admin, ni el aviso del formulario de nueva reserva. Las palomitas se comprobaron solo como lógica
  (`checkPassword`) y como render inicial, no tecleando.
- `Frontend/` no tiene Astro configurado ni `node_modules`: el componente no se ha compilado dentro de ese
  proyecto. Usa clases del sistema de diseño (`bg-paper`, `text-ink`, `border-line-strong`, `text-alert`…) que
  el tema del Frontend tendrá que definir, y solo depende de `react` y `axios` (sin `prop-types`).
- No hay pruebas automatizadas en el repo; los scripts se borraron. Conviene convertirlos en pruebas (auditoría §5.1).
- El límite de intentos se reinicia al reiniciar la API.

## Trampas descubiertas

- Una ventana de ~1 s: el `iat` del JWT es en segundos, así que una sesión emitida en el mismo segundo
  del cambio no se revoca. Por eso `passwordChangedAt` se redondea al segundo hacia abajo (si no, la
  sesión nueva se rechazaría a sí misma).
- El interceptor de axios rechaza con `{ status, message, details }` (no hay `err.response`).
- La base de dev tiene teléfonos de seed como `(480) 555-0111`; los datos de prueba deben usar otros.
- `prisma migrate dev` necesita `docker compose up -d mysql` en `database/` (publica 3306 en toda la red: S5 sigue abierto).
- `Client.phoneE164` solo se llena si el teléfono valida; una reserva por email puede traer un teléfono distinto al guardado y no lo cambia.

## Siguiente paso

- Al construir el portal del cliente: montar `ChangePassword` en su página, y que el guard del portal
  mande ahí a todo cliente con `mustChangePassword = true` (la API ya lo devuelve en el login y en `/auth/me`).
- Módulo Correos: el correo "tus fotos están listas" debe llevar la contraseña generada y el enlace al portal;
  crear el `User` del cliente con `mustChangePassword: true` (`UserModel.create` ya lo acepta).
- Modal de cambio de contraseña del admin (el endpoint hoy responde 403 a un ADMIN; habrá que abrirlo con sus propias reglas).
- Abrir el admin y probar a mano lo marcado como no verificado.
- Sin resolver y fuera de este lote: B3 (servicios ocultos y clientes borrados en nueva reserva), S1 (límite de intentos en el login), S3, S4, S5, S2.
- Cuando exista el módulo Correos: el aviso "tu email de login cambió" (`INTEGRATION(correos)` en `client.model.js`) también aplica a B1.

---
Relacionado: [[admin]] · [[2026-10-04-nuevo-booking-admin]] · [[2026-10-04-clients]] · [[correos]]
