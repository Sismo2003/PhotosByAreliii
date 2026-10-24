---
tema: admin
fecha: 2026-10-04
---

# Nueva reserva desde el admin

Formulario único `/bookings/new` (alta de cliente + reserva). Reglas, contrato y dudas abiertas
en `docs/nuevo-booking-admin.md`; instrucciones para el formulario público (incluye **varios
cambios de ropa**) en `docs/formulario-publico-booking.md`. Parte de [[README]].

## Decisiones del usuario

- Una sola página con secciones (no asistente por pasos).
- Pago recibido al crear (depósito o completo): **solo admin**, nunca en público.
- Varios cambios de ropa: `BookingExtra.quantity` (migración `add_booking_extra_quantity`),
  también en el formulario público.
- Correo o teléfono existente → es el cliente que ya existe; se pueden actualizar sus demás datos
  desde el formulario, pero **correo y teléfono se cambian desde el resumen del cliente**
  (pendiente para el agente de Clients, ver §4 del doc).
- Borrador en `localStorage` 30 min desde el último cambio + botón *Clear form*.

## Ajustes posteriores (misma fecha)

- Tarjetas de paquete: la seleccionada usa `bg-paper-alt` + borde/anillo `ink` (antes `bg-ink`, que en
  oscuro es casi blanco). Regla en `.claude/skills/frontend/SKILL.md` (contraste en oscuro).
- "How many people?" se muestra **1, 2, 3–5, 6–8** (sin "Just me": es la perspectiva del dueño del
  negocio). La BD sigue guardando `JUST_ME`; `partyLabel` muestra "1 person".
- Teléfono con formato mientras se escribe: `formatPhoneInput` en `admin/src/utils/phone.js`
  (`AsYouType` de libphonenumber-js; el retroceso sobre un separador borra el dígito anterior).
- Listas y detalle muestran los extras con cantidad ("Extra outfit change × 3").

## Verificado

- Modelo `BookingCreateModel.create` probado contra la BD de desarrollo (cliente nuevo, pago
  completo, 3 cambios de ropa = $205, cliente reutilizado por correo); datos de prueba borrados.
- Validador yup con casos buenos y malos. ESLint y `vite build` limpios.
- `formatPhoneInput` simulado en Node tecleando dígito a dígito: `(480) 555-0100` y `+52 55 1234 5678`.

## Sin verificar

- **No se ha visto en el navegador** ni probado el endpoint por HTTP con sesión de admin.
- Correo de confirmación: interruptor deshabilitado (`INTEGRATION(newBookingEmail)`).
