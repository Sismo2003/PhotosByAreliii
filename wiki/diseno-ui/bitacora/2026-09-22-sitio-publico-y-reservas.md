---
tema: diseno-ui
fecha: 2026-09-22
---

# Sitio público y flujo de reservas

## Qué se hizo (en el lienzo "PhotosByAreli — Pantallas")

- **Landing** desktop (`Main.dc.html`) y móvil (`LandingMobile.dc.html`): hero (frase + Book +
  2 fotos), sección **"Moments"** (fotos en franjas verticales que se abren al hacer scroll,
  con autoplay, pausa, flechas y clic), portafolio masonry con filtros, franja compacta de
  servicios, footer grande.
- **Nav** con Portfolio · Services · Book · Client login + botón **ES / EN** (solo visual).
- **Footer**: logo placeholder, dirección, contacto, lista de páginas y de servicios, Privacy/Terms.
- **`/services`** (`Services.dc.html`) + una **sub-landing por servicio**
  (`ServiceGraduation`, `ServiceQuince`, `ServiceMaternity`, `ServiceFamily`): hero, qué incluye,
  3 paquetes, galería, consejos, FAQ, CTA.
- **Flujo `/book`** de 5 pasos + confirmación (`Booking`, `BookingDate`, `BookingLocation`,
  `BookingDetails`, `BookingReview`, `BookingConfirmed`): sesión + extras → fecha/hora (golden
  hour) → lugar → datos → revisar y **enviar solicitud** → "Request sent".

## Decisiones

| Decisión | Por quién | Por qué |
|---|---|---|
| Quitar el bloque de reserva de la landing y hacer una **ruta dedicada `/book`** | usuario | Pensar en todos los pasos de una reserva |
| Reducir Servicios en la landing a una franja; página propia `/services` y sub-landing por tarjeta | usuario | No darle tanto peso en la home |
| Efecto de franjas como **segunda sección** bajo el hero | usuario (referencia visual de Adda Medina) | — |
| Paso 5 es **"Send request"**, no pago: Areli confirma a mano y el depósito se paga por Zelle/Cash App después | usuario | Confirmación manual + pagos fuera del sitio |
| Las páginas de servicio fueron **reorganizadas por el usuario** en el lienzo (orden de secciones, etc.) | usuario | Respetar su versión al editar |

## Verificado vs. no verificado

| Pieza | Prueba |
|---|---|
| Sintaxis del JS de cada pantalla | `node --check` |
| Lógica del efecto "Moments" | Revisión de código + `node --check` |

**Lo que NO está verificado:** cómo se ve cada pantalla en el lienzo, y que el scroll dentro del
lienzo realmente dispare el cambio de fotos (se añadió autoplay como respaldo).

## Pendiente / placeholders (todo lo que va entre corchetes en el diseño)

Precios y paquetes, depósito ([$50]), dirección del estudio, teléfono, email, Instagram,
políticas (48 h, reprogramación), hora del atardecer, tiempos de entrega ([2 semanas]),
duración de la galería ([90 días]), usuarios de Zelle/Cash App. Faltan versiones móviles de
`/services`, sub-landings y del flujo `/book`.

---
Relacionado: [[diseno-ui]] · [[2026-09-22-admin-galerias-y-acceso]]
