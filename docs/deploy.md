# Despliegue — servidor `grid` (y cualquier otro)

Cómo llega el código a producción, cómo se instala por primera vez y cómo se **cambia de dominio o de
servidor**. Skill de referencia: [`deploy`](../.claude/skills/deploy/SKILL.md). Lo genérico del servidor `grid`
(red, firewall, cadena de confianza del bot) está en la skill global `grid-deploy`.

| Dominio (primera versión) | Qué sirve |
|---|---|
| `https://areli.grid.nimbuscloud.mx/` | sitio público (Astro) |
| `https://areli.grid.nimbuscloud.mx/login` | inicio de sesión único (admin y clientes) |
| `https://areli.grid.nimbuscloud.mx/admin/` · `/client/` | panel del estudio · portal del cliente |
| `https://areli.grid.nimbuscloud.mx/api/` | API Express |

Todo cuelga de **un solo host**: la cookie de sesión viaja sin CORS. El dominio vive en una sola variable
(`APP_DOMAIN`), por eso el cambio al oficial es de configuración, no de código (§5).

---

## 1. El recorrido de un `git push`

```
git push origin main            (lo autorizas tú — skill git-workflow)
   │
   ▼
GitHub Actions  (.github/workflows/ci-cd.yml)
   ├─ 1. checks      admin y client: lint + build · sitio: build · API: prisma generate + sintaxis + import
   ├─ 2. build+push  4 imágenes → ghcr.io/sismo2003/pba-{api,web,admin,client}
   │                 tag = sha-<12 primeros del commit> (+ latest)
   └─ 3. rollout     el runner entra a la tailnet (nodo efímero) y por SSH dispara el trigger del servidor
   ▼
servidor: /usr/local/bin/pba-deploy-trigger → sudo → deploy/rollout.sh
   pull → MySQL healthy → prisma migrate deploy → up -d → healthchecks
   → renderiza e instala el vhost (con nginx -t y restauración) → reload del proxy → fija el tag en deploy/.env
```

En ramas y PRs solo corren los checks. **El build nunca ocurre en el servidor** (es una máquina compartida):
solo hace `docker pull`. La conexión al servidor es **siempre por Tailscale**; el SSH no está abierto a internet.

> El servidor **no** hace `git pull` solo. `rollout.sh`, `docker-compose.yml` y la plantilla del vhost son los
> del checkout en el servidor. Si cambias algo en `deploy/`, después del merge corre `git -C <repo> pull` allí
> (el siguiente rollout instala el vhost si cambió).

---

## 2. Arquitectura en el servidor

```
Internet ──► nginx-proxy :80/:443   $NGINX_CONF_DIR/pba.conf   (renderizado desde deploy/nginx/pba.conf.template)
                │
     /          │ /login /client/   /admin/        /api/
     ▼          ▼                   ▼               ▼
  pba-web    pba-client          pba-admin       pba-api ──(red interna pba-internal)──► pba-mysql
 (nginx+Astro) (nginx+SPA)       (nginx+SPA)     (Express :4000)                        (MySQL 8.4)
                                                       └── volumen: $DATA_DIR/photos (uid 1000)
```

| Contenedor | Imagen | Redes |
|---|---|---|
| `pba-web` | `ghcr.io/sismo2003/pba-web` | `nginx` |
| `pba-admin` | `ghcr.io/sismo2003/pba-admin` | `nginx` |
| `pba-client` | `ghcr.io/sismo2003/pba-client` | `nginx` |
| `pba-api` | `ghcr.io/sismo2003/pba-api` | `nginx` + `pba-internal` |
| `pba-mysql` | `mysql:8.4` | `pba-internal` **solamente** (sin puerto publicado) |

Decisiones:

- **No hay proxy propio.** Se reutiliza el `nginx-proxy` compartido del servidor; el compose solo se une a la red
  `nginx`. Un segundo nginx con 80/443 tumbaría los demás proyectos.
- **Upstreams con variable + `resolver 127.0.0.11`**: el proxy arranca y recarga aunque nuestros contenedores estén
  caídos (no se cae el resto del servidor por un deploy fallido).
- **Subred fija `172.16.43.0/24`** para `pba-internal` (variable `PBA_SUBNET`). En `grid` los pools de Docker
  están agotados y el firewall solo deja pasar `172.16.0.0/12`: con otra subred la API resuelve `mysql` pero el TCP
  se pierde en silencio. Elige un /24 libre por proyecto.
- **Contenedores endurecidos**: sistema de archivos de solo lectura, `no-new-privileges`, límites de memoria, y la
  API corre como uid 1000 (sin root). Solo `photos/` es escribible.
- **Login limitado en el borde**: 10 intentos/min por IP (`/api/auth/login`), además del limitador de la API.
- **El sitio no se indexa** en el dominio temporal (`PUBLIC_INDEXABLE=false` → `noindex` + `robots.txt` de bloqueo).

### TLS y DNS

- `areli.grid.nimbuscloud.mx` es de **un solo nivel** bajo `*.grid.nimbuscloud.mx`: lo cubre el comodín que ya
  existe (`/etc/letsencrypt/live/grid.nimbuscloud.mx`) y el DNS ya resuelve (comodín gris, directo al servidor). No
  hay que crear nada. Por eso el panel es una **ruta** (`/admin/`) y no `admin.areli.grid…` (tercer nivel, sin cobertura).

---

## 3. Dónde vive cada cosa

| Qué | Dónde |
|---|---|
| Secretos de la API (`JWT_SECRET`, `GALLERY_ENC_KEY`, SMTP…) | `<repo>/Backend/.env` en el servidor (600) |
| Dominio, certificado, rutas, passwords de MySQL, tag desplegado | `<repo>/deploy/.env` en el servidor (600) — plantilla: `deploy/.env.template` |
| Datos reales del negocio (teléfono, correos…) | secret `SITE_JS_B64` en GitHub (se hornea en las imágenes) |
| Fotos y base de datos | `$DATA_DIR` (por defecto `/srv/pba/{photos,mysql}`) |
| Vhost | `$NGINX_CONF_DIR/pba.conf` (generado por `rollout.sh`) |
| Trigger del bot · permiso sudo | `/usr/local/bin/pba-deploy-trigger` · `/etc/sudoers.d/pba-deploy` |
| Llave de CI (pública) | `~<bot>/.ssh/authorized_keys` con `command=`, `restrict`, `from=100.64.0.0/10` |
| Log de despliegues | `/var/log/pba-deploy.log` |

Nada de esto va a git. `deploy/.env` y `Backend/.env` **no se tocan desde el repo**.

### GitHub (Settings → Secrets and variables → Actions)

| Tipo | Nombre | Valor |
|---|---|---|
| Variable | `APP_DOMAIN` | `areli.grid.nimbuscloud.mx` |
| Variable | `PUBLIC_INDEXABLE` | `false` (en el dominio oficial, `true`) |
| Secret | `SSH_HOST` | IP de Tailscale o nombre MagicDNS del servidor |
| Secret | `SSH_USER` · `SSH_PORT` | usuario del bot (`grid-bot-git`) · puerto de sshd |
| Secret | `SSH_PRIVATE_KEY` | llave privada de este repo (§4 paso 4) |
| Secret | `TS_OAUTH_CLIENT_ID` · `TS_OAUTH_SECRET` | el OAuth client de Tailscale (`tag:ci`) que ya usan los demás proyectos |
| Secret | `SITE_JS_B64` | `base64 -i shared/site.js \| pbcopy` (macOS) — sin él las imágenes llevan datos de ejemplo |

Los paquetes de ghcr.io nacen **privados**. Si el `docker login ghcr.io` de root no los alcanza, pon
`GHCR_USER`/`GHCR_TOKEN` (PAT `read:packages`) en `deploy/.env`.

---

## 4. Primera instalación en el servidor

Todo por Tailscale (`ssh -p <puerto> <usuario>@<host-tailscale>`).

1. **Clonar** (el repo es público): `git clone https://github.com/Sismo2003/PhotosByAreliii.git /root/photosByArelli`
2. **Preparar** (carpetas, red `nginx`, plantillas de `.env`; no toca nada más):
   `cd /root/photosByArelli && sudo deploy/server-setup.sh`
3. **Rellenar** `deploy/.env` (contraseñas: `openssl rand -hex 24`) y `Backend/.env`
   (`JWT_SECRET`, `GALLERY_ENC_KEY`, SMTP…; ver `Backend/.env.example`). `chmod 600` ambos.
4. **Llave de CI propia** (distinta de la de otros proyectos: no puede disparar deploys ajenos):
   ```bash
   ssh-keygen -t ed25519 -N '' -C pba-ci -f /root/pba-ci
   sudo deploy/server-setup.sh --install-trigger --pubkey /root/pba-ci.pub   # + --create-bot-user en un servidor nuevo
   cat /root/pba-ci                      # → copiar al secret SSH_PRIVATE_KEY
   shred -u /root/pba-ci /root/pba-ci.pub
   ```
5. **GitHub**: variables y secrets de la tabla de arriba. **Tailscale ACL**: `tag:ci` debe alcanzar el servidor en
   el puerto SSH (ya existe para los otros proyectos).
6. **Primer deploy**: push a `main` (o *Actions → CI/CD → Run workflow* sobre `main`). Comprueba
   `https://areli.grid.nimbuscloud.mx/`.
7. **Crear el administrador** (la base nace vacía; el seed no corre solo):
   ```bash
   docker exec -it -e CONFIRM_SEED=yes -e SEED_ADMIN_EMAIL=<correo> -e SEED_ADMIN_PHONE='<teléfono>' \
     -w /repo/database pba-api node seeds/seed.js      # imprime la contraseña UNA vez; cámbiala al entrar
   ```
   El seed es idempotente (catálogo, ajustes y disponibilidad solo se crean si faltan).

---

## 5. Cambiar al dominio oficial (p. ej. `photosbyareliii.com`)

1. **DNS** del dominio oficial → IP pública del servidor (o la que corresponda).
2. **Certificado** que cubra el dominio (p. ej. certbot DNS-01 / Cloudflare Origin Certificate) y apuntar
   `TLS_CERT_DIR` a su carpeta (`fullchain.pem` + `privkey.pem`).
3. **En el servidor**, `deploy/.env`: `APP_DOMAIN=photosbyareliii.com` y `TLS_CERT_DIR=…`.
   (Si quieres `www.`, añade un bloque `www → apex` a `deploy/nginx/pba.conf.template`.)
4. **En GitHub**: variable `APP_DOMAIN` igual, y `PUBLIC_INDEXABLE=true` cuando quieras que Google lo indexe.
5. **Redesplegar** (*Run workflow*): las URLs de `VITE_*` / `PUBLIC_*` se hornean al construir, así que **hay que
   reconstruir** las imágenes; el rollout regenera el vhost con el dominio nuevo.
6. Mantén el dominio `grid` unos días con un `301` si ya compartiste enlaces (segundo bloque `server` en la plantilla).
7. Cookies: son de sesión sin `Domain`, se emiten por el host nuevo; cada usuario volverá a iniciar sesión.

---

## 6. Mover a otro servidor

Pensado para que sea configuración, no reescritura:

1. **Servidor nuevo por Tailscale**, con Docker + `gettext-base` (envsubst).
2. **Proxy**: si el servidor no tiene `nginx-proxy`, usa `deploy/proxy/` (`docker network create nginx && cd deploy/proxy && docker compose up -d`)
   y pon en `deploy/.env` `NGINX_CONF_DIR=<repo>/deploy/proxy/conf.d`. **No lo arranques en `grid`** (ya existe uno).
3. **Instalar** como en §4 pasos 1–5 (`--create-bot-user` si el usuario del bot no existe).
4. **Datos** (antes de cortar, con el servicio viejo parado o en mantenimiento):
   ```bash
   # en el servidor viejo
   docker exec pba-mysql mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines photosbyarelli | gzip > pba.sql.gz
   rsync -a /srv/pba/photos/ nuevo:/srv/pba/photos/        # por Tailscale
   # en el nuevo, tras el primer rollout (MySQL ya sano)
   gunzip -c pba.sql.gz | docker exec -i pba-mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" photosbyarelli
   ```
5. **GitHub**: cambia el secret `SSH_HOST` (y `SSH_USER`/`SSH_PORT` si difieren) y la llave `SSH_PRIVATE_KEY`.
6. **DNS** al servidor nuevo; certificado válido allí; *Run workflow* para desplegar.
7. Apaga el stack viejo (`docker compose down`, **sin** `-v`) y conserva su `$DATA_DIR` hasta confirmar.

El tamaño de `photos/` manda: reserva espacio (la API respeta `STORAGE_RESERVE_BYTES`, ver
[`almacenamiento-fotos.md`](almacenamiento-fotos.md)).

---

## 7. Operación diaria

```bash
cd /root/photosByArelli/deploy
set -a; . ./.env; set +a                             # carga MYSQL_ROOT_PASSWORD etc. en tu shell
grep PBA_TAG .env                                   # versión corriendo
docker ps --filter name=pba-                         # estado
docker logs pba-api -f                               # logs de la API
tail -f /var/log/pba-deploy.log                      # despliegues
./rollout.sh sha-<12 primeros del commit anterior>   # ROLLBACK exacto (como root)
docker exec -it pba-mysql mysql -uroot -p            # consola SQL
docker exec pba-mysql mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction photosbyarelli | gzip > /root/backups/pba-$(date +%F).sql.gz
```

Las migraciones solo avanzan: un rollback de imagen **no** deshace el esquema. Para cambios destructivos, haz
primero la migración compatible hacia atrás (skill `db-migrations`).

---

## 8. Problemas conocidos

| Síntoma | Causa y solución |
|---|---|
| La API arranca pero no llega a `mysql` (timeouts, `P1001`) | La subred de `pba-internal` quedó fuera de `172.16.0.0/12`. Fija `PBA_SUBNET` a un /24 libre dentro del rango y recrea la red. |
| Healthcheck "unhealthy" para siempre | Usa `127.0.0.1`, no `localhost` (resuelve a `::1` y nginx escucha en IPv4). Ya está así en el compose. |
| El sitio muestra teléfono/correo de ejemplo | Falta el secret `SITE_JS_B64`; el CI avisa con un warning. Añádelo y vuelve a correr el workflow. |
| `nginx -t` falla en el rollout | El rollout restaura el vhost anterior y no recarga: nada se rompe. Revisa `deploy/nginx/pba.conf.template` y el certificado. |
| CI: "Server unreachable over Tailscale" | La ACL no deja a `tag:ci` llegar al puerto SSH, o `SSH_HOST` es la IP pública (debe ser la de Tailscale). |
| Subida de fotos grandes falla | `client_max_body_size 60m` en `/api/`; fotos de hasta 50 MB (ver `almacenamiento-fotos.md`). |
| Disco al 90 % | Cada rollout hace `docker image prune`; revisa también `docker system df` y los logs de nginx. |
