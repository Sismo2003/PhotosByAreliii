# Overview · integraciones pendientes

## INTEGRATION(cloudflare-analytics): visitas al sitio

Decisión del usuario (2026-10-05): usar **Cloudflare Web Analytics** (gratis, sin cookies ni
banner) y no Google Analytics.

**Qué cuenta el widget:** "visits" de Cloudflare, que son las páginas vistas que empiezan una
visita. Es decir, alguien que cae en cualquier ruta del sitio llegando desde fuera (Google,
Instagram, un enlace o escribiendo la URL). Abajo del número también se muestran las páginas
vistas en total.

### Receta (3 pasos)

1. **Cloudflare:** en *Analytics & Logs → Web Analytics → Add a site*, agrega
   `photosbyareliii.com`.
   - Si el DNS pasa por Cloudflare (nube naranja), se puede activar solo.
   - Si no, Cloudflare da un `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "…"}'>`.
2. **Frontend (Astro):** pega ese script en el layout común de las páginas públicas, antes de
   `</body>`. **No** va en `admin/` ni en la galería privada del cliente.
   - `Frontend/` todavía no tiene layout; este archivo no existe aún.
   - Si nginx manda una CSP, agrega `static.cloudflareinsights.com` (script) y
     `cloudflareinsights.com` (connect).
3. **Backend:** en `Backend/.env` (o en el `.env` del despliegue) define:
   - `CF_ACCOUNT_ID`: el Account ID, a la derecha en el dashboard.
   - `CF_SITE_TAG`: el *site tag* del sitio. Se ve en la URL o en *Manage site*; no es el token
     del beacon.
   - `CF_API_TOKEN`: *My Profile → API Tokens → Create Token → Custom*, con el permiso
     **Account → Account Analytics → Read**.

   Reinicia el backend. El widget pasa de "Not connected" al número.

Código: `Backend/services/cloudflare-analytics.js` (consulta GraphQL
`rumPageloadEventsAdaptiveGroups`, caché de 10 min) y
`admin/src/app/pages/overview/VisitsWidget.jsx`.

### Dudas abiertas (para quien lo conecte)

- **D1.** La consulta GraphQL se escribió según la documentación de Cloudflare y **no se ha
  probado contra una cuenta real**. Si responde error, revisa en el GraphQL explorer de
  Cloudflare:
  - el nombre del filtro (`siteTag`);
  - `orderBy: [date_ASC]`;
  - el límite de días del plan gratis (hasta ahora, 6 meses de historia y rangos por consulta
    limitados).
- **D2.** `date` de Cloudflare está en UTC; el corte "últimos 30 días" se calcula desde el día
  del estudio. Puede haber unas horas de diferencia en los bordes, lo cual se consideró
  aceptable.
- **D3.** Los bots que Cloudflare no filtra cuentan como visitas.
- **D4.** No hay desglose por ruta. Si Areli quiere ver las páginas más visitadas, se agrega
  `dimensions { requestPath }` a la misma consulta.
