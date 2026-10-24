# photosByArelli

Plataforma web para un estudio de fotografía: sitio público con reservas, panel de administración y
portal privado donde cada cliente ve y descarga solo sus fotos. Proyecto real, construido de punta a punta.

## Qué incluye

| Carpeta | Qué es | Stack |
|---|---|---|
| `Frontend/` | Sitio público (landing, `/book`) | Astro, React, Tailwind |
| `admin/` | Panel del estudio: reservas, clientes, galerías, servicios, correos | React, Vite, TanStack Table |
| `client/` | Portal del cliente y login único (`/login`), mobile-first, EN/ES | React, Vite |
| `Backend/` | API REST (`/api/auth`, `/api/admin`, `/api/client`) | Node, Express, JWT, Argon2 |
| `database/` | Schema, migraciones y seeds | Prisma, MySQL (Docker) |
| `shared/` | Datos del negocio compartidos por todas las apps | JS plano |
| `deploy/` | Docker Compose y nginx de producción | Docker, nginx |
| `docs/` · `wiki/` | Contratos de API, especificaciones y bitácora de decisiones | Markdown |

Detalles de diseño: fechas con **Luxon** (zona del estudio, UTC en base), teléfonos con
**libphonenumber-js** (E.164), tablas del admin con una estructura común, y detección de rostros en
servidor (modelo ONNX UltraFace) para encuadrar miniaturas.

## Empezar

Requisitos: Node 20+, Docker.

```bash
npm install                                   # raíz (workspaces: Frontend, Backend, database)
(cd admin && npm install) && (cd client && npm install)

npm run setup:site                            # shared/site.js desde la plantilla (datos del negocio)
cp Backend/.env.example Backend/.env          # define JWT_SECRET (instrucción dentro del archivo)
cp database/.env.example database/.env

docker compose -f database/docker-compose.yml up -d   # MySQL local
npm run prisma:generate && npm run prisma:migrate     # esquema
npm run prisma:seed --workspace database              # crea el admin (imprime la contraseña una vez)

npm run dev:backend                           # API en :4000
(cd admin && npm run dev)                     # panel en :5174
(cd client && npm run dev)                    # login/portal en :5175
```

`database/seeds/dev-seed.js` agrega datos de ejemplo para desarrollo. La imagen de fondo del login y las
fotos del estudio no se incluyen en el repo (`client/public/login.jpg`: pon cualquier imagen vertical).

## Documentación

- [`handoff.md`](handoff.md) — estado del proyecto y por dónde empezar
- [`docs/`](docs/README.md) — contratos de API y especificaciones
- [`wiki/`](wiki/README.md) — bitácora de decisiones (abrible como vault de Obsidian)
- [`.claude/skills/`](.claude/skills/README.md) — guías para agentes de código
- [`docs/publicacion.md`](docs/publicacion.md) — qué se publica en GitHub y qué se queda local
- [`SECURITY.md`](SECURITY.md) — manejo de secretos y reporte de vulnerabilidades

## Licencia y datos

Código publicado como muestra de portafolio; todos los derechos reservados salvo acuerdo. No contiene
datos ni fotos de clientes.
