---
name: bitacora
description: Documenta en wiki/ (vault de Obsidian, con wikilinks) todo lo que un agente crea, edita o implementa en este repo. Úsala SIEMPRE al terminar un trabajo sustancial — implementar una funcionalidad, resolver un bug no trivial, tomar una decisión de arquitectura, instalar/configurar algo nuevo — y también cuando el usuario pida "documenta lo que hiciste", "deja constancia" o "prepara esto para el siguiente agente".
---

# Documentar trabajo en wiki/

El objetivo es que el siguiente agente —o el usuario dentro de tres meses, abriendo la carpeta
en la app de Obsidian— pueda retomar el trabajo sin volver a explorar el codebase ni repetir
decisiones ya tomadas. A diferencia de un `ai-docs/` plano, esta carpeta está pensada para
abrirse como **vault de Obsidian**: usa `[[wikilinks]]` entre notas, no `[texto](ruta.md)`, para
que el grafo y los backlinks de Obsidian conecten todo solo.

**No se documenta lo que el repositorio ya cuenta** (estructura del código, historial de git, qué
hace una función). Se documenta lo que se perdería al cerrar la sesión: decisiones y su porqué,
qué se verificó y cómo, qué quedó sin verificar, y las trampas descubiertas de paso.

## Paso 1 — Identificar el tema

Todo documento vive bajo `wiki/<tema>/`. Un **tema** es un área de trabajo con continuidad
(`auth-gallery`, `landing-seo`, `setup-inicial`), no una tarea suelta.

```bash
ls wiki/                    # temas existentes
cat wiki/README.md          # índice maestro (MOC) con la descripción de cada uno
```

**Primero intenta encajar en un tema existente.** Sólo crea uno nuevo cuando el trabajo no
pertenece a ninguno y va a tener continuidad. Nombre en kebab-case, sustantivo, sin fechas:
`galeria-privada`, `migracion-prisma`, `setup-inicial`. Nunca `fix-bug-1` ni `sprint-2`.

Si creas un tema nuevo, **añádelo a `wiki/README.md`** en la misma sesión, como un
`[[wikilink]]` al `README.md` del tema.

## Paso 2 — Elegir el nivel

| Nivel | Cuándo | Qué produces |
|---|---|---|
| **1 · Bitácora** | Un fix, una investigación, un cambio acotado, instalar/configurar algo | `<tema>/bitacora/AAAA-MM-DD-<slug>.md` + actualizar el `README.md` del tema |
| **2 · Tema** | Trabajo nuevo con continuidad, varias sesiones por delante | `<tema>/README.md` + entradas de bitácora que enlazan a él |

Estructura resultante:

```
wiki/
  README.md                    ← índice maestro (MOC) de todos los temas
  <tema>/
    README.md                  ← estado del tema, enlaza [[a sus notas]]
    bitacora/
      2026-09-22-slug.md
```

Plantillas en `plantillas/` de esta misma skill — punto de partida, no formulario: una sección
sin contenido real se borra, no se deja con "N/A".

## Paso 3 — Escribir

### 1. Separa lo verificado de lo no verificado, siempre

Una tabla de qué se probó y **con qué**, seguida de una lista explícita de lo que no se probó.
"Probado" a secas no dice nada.

### 2. Registra las decisiones y de quién fueron

Si la decisión fue del usuario, dilo — el agente no tiene autoridad para cambiarla después.

### 3. Anota las trampas del codebase que descubriste de paso

Lo que no es obvio leyendo el código por encima. Es lo que más tiempo ahorra a la siguiente
sesión y lo que más se pierde al cerrar la conversación.

### 4. Cita rutas exactas

`database/prisma/schema.prisma`, no "el schema". Si citas un archivo que aún no existe porque es
trabajo futuro, dilo con esas palabras.

### 5. Fechas absolutas y estado honesto

"2026-09-22", nunca "ayer". Si algo quedó a medias o no funciona, se escribe tal cual.

### 6. Nada de secretos, nunca fotos reales de clientes

No se escriben contraseñas, tokens, claves, ni URLs/paths reales de fotos de clientes — ni
siquiera de ejemplo. **`wiki/` es público** (se publica con el repo) y puede sincronizarse a otros
dispositivos; una fuga aquí es una fuga de datos de clientes reales. Usa `example.com`,
`(480) 555-01xx` y nombres ficticios. Antes de commitear corre `git-workflow/check-secrets.sh`.

### 6b. Dónde va cada cosa (público vs. local)

- `wiki/` **se publica en GitHub** con el repo: solo decisiones, contexto técnico y datos de ejemplo.
- Lo que contenga datos reales (contactos, clientes, rutas de fotos, credenciales, hallazgos de seguridad
  sin corregir) va en **`private/`** (raíz, git-ignorado, solo local) con el mismo formato, y en `wiki/`
  solo una nota genérica. Ver `docs/publicacion.md`.
- Una nota escrita no sale de tu máquina hasta que el dueño autorice el `push` (skill `git-workflow`).

### 7. Usa wikilinks, no rutas relativas

`[[setup-inicial]]` en vez de `[texto](../setup-inicial/README.md)`. Es lo que hace que el grafo
de Obsidian sea útil en vez de una carpeta más de Markdown.

## Paso 4 — Validar y actualizar el índice

```bash
.claude/skills/bitacora/validar-docs.sh          # todos los temas
.claude/skills/bitacora/validar-docs.sh <tema>   # sólo uno
```

Comprueba que los wikilinks resuelvan a una nota real, que las rutas del repositorio citadas
existan, que las fechas sean absolutas y que no haya secretos evidentes.

Después, actualiza el **índice maestro** `wiki/README.md` y el `README.md` del tema.

## Qué NO hacer

- No documentar antes de terminar: una nota de trabajo a medias miente sobre el estado.
- No duplicar lo que ya dice el código o `git log`.
- No crear un tema nuevo por cada tarea — mira primero `wiki/README.md`.
- No escribir paths reales de fotos de clientes, contraseñas, ni tokens.
- No hacer commit ni push por tu cuenta sin permiso explícito del usuario.
