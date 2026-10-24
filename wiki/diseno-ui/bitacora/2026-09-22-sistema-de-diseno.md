---
tema: diseno-ui
fecha: 2026-09-22
---

# Sistema de diseño PhotosByAreli

## Qué se hizo

- Se creó un Artifact tipo **Design System** ("PhotosByAreli") con `tokens.json`, `README.md`
  (guía de marca en español), componentes React en `components/bundle.js` + `bundle.css`
  (namespace `Areli`: Wordmark, Button, Photo, ServiceRow, Field, Tag), previews y portada.
- Las fotos del demo son **recortes de baja resolución** (~230×300 px) de capturas del Instagram
  de Areli que el usuario compartió; están subidas como assets de los Artifacts. No son los
  originales y no deben usarse en producción.

## Decisiones

| Decisión | Por quién | Por qué |
|---|---|---|
| Primera versión ("papel fotográfico / cuarto oscuro": prints con marco blanco, crema, verde salvia, terracota, 4 tipografías) — **descartada** | usuario | "No me gustó"; pidió algo como juliaandgil.com |
| Segunda versión: blanco puro, negro, **una sola tipografía EB Garamond** con itálicas, versalitas espaciadas para nav/botones, sin color de acento, sin sombras, esquinas rectas | usuario (referencia) / agente (ejecución) | "Súper simple, directo al grano, mostrar servicios, portafolio y vender" |
| Nombre y logo son **placeholder** ("Photos by Areli" en versalitas; monograma "PA" en el footer) | usuario | Marca aún no definida |
| Tokens clave: `paper #ffffff`, `paper-alt #f6f5f3`, `ink #151515`, `ink-muted #6e6e6e`, `line #e7e5e1`, `line-strong #8a8a8a`, `film #111111`, `alert #9b2335` | agente | Contraste ≥4.5:1 comprobado con script para texto; `line-strong` ≥3:1 para bordes de campos |

## Verificado vs. no verificado

| Pieza | Prueba |
|---|---|
| Contrastes de color | Script Python (fórmula WCAG) sobre cada par texto/fondo |
| Previews de componentes y páginas del sistema v2 | Renderizadas localmente con un servidor HTTP y el navegador integrado (capturas revisadas) |

**Lo que NO está verificado:** la página del Artifact en claude.ai (el navegador integrado no
tiene sesión en claude.ai). El README del sistema aún no tiene la sección generada "Consuming
this system", así que el lienzo usa estilos inline con los mismos valores en vez de montar el
bundle.

## Trampas descubiertas

- En un Design System los archivos `.ts` no se publican sin `contentType: "text/plain"`.
- En los scripts de preview, `var top` en el ámbito global choca con `window.top` (causó una
  pantalla en blanco). Usar otro nombre.

---
Relacionado: [[diseno-ui]]
