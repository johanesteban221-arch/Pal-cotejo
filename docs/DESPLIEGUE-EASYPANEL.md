# Guía de despliegue en Easypanel (VPS) — PAL COTEJO

Despliega la plataforma en tu VPS con Easypanel (donde ya corren n8n y finca-bot).
Resultado: servidor siempre activo, dominio propio y SSL. Son **3 servicios** en un proyecto.

```
Proyecto "pal-cotejo" en Easypanel
├── pal-cotejo-db   (PostgreSQL)      ← base de datos
├── pal-cotejo-api  (App · Dockerfile.api)  ← backend NestJS
└── pal-cotejo-web  (App · Dockerfile.web)  ← frontend Next.js
```

---

## Paso 0 — Preparar valores (genéralos una vez)
- **JWT_SECRET**: una cadena aleatoria larga (≥ 32 caracteres).
- **N8N_INTEGRATION_KEY**: otra cadena aleatoria (la usarán los flujos n8n).
- **ADMIN_PASSWORD** y **CAJA_PASSWORD**: contraseñas reales para el staff.
  > Puedes generar claves con: `openssl rand -hex 24`

---

## Paso 1 — Crear el proyecto y la base de datos
1. En Easypanel, crea un **proyecto** llamado `pal-cotejo`.
2. **+ Service → Template → PostgreSQL**. Nómbralo `pal-cotejo-db`.
3. Anota lo que genera: usuario, contraseña y nombre de base. La **cadena de conexión interna** será:
   `postgresql://USUARIO:CLAVE@pal-cotejo-db:5432/NOMBRE_DB`
   *(dentro de Easypanel los servicios se ven por su nombre).*

---

## Paso 2 — Servicio API (`pal-cotejo-api`)
1. **+ Service → App**. Nombre: `pal-cotejo-api`.
2. **Source → GitHub** → repo `johanesteban221-arch/Pal-cotejo`, rama `main`.
3. **Build → Dockerfile**, ruta del Dockerfile: **`Dockerfile.api`**.
4. **Environment** (variables):
   ```
   DATABASE_URL=postgresql://USUARIO:CLAVE@pal-cotejo-db:5432/NOMBRE_DB
   JWT_SECRET=（tu cadena aleatoria）
   JWT_EXPIRES_IN=7d
   DEFAULT_DEPOSIT_PERCENT=50
   N8N_INTEGRATION_KEY=（tu cadena aleatoria）
   ADMIN_PASSWORD=（clave admin real）
   CAJA_PASSWORD=（clave caja real）
   ```
   *(Opcionales, cuando el cliente defina pasarela/WhatsApp: WOMPI_*, N8N_WEBHOOK_*).*
5. **Port**: `3001`. **Health check path**: `/api/health`.
6. **Deploy**. En el primer arranque aplica migraciones y crea la base mínima
   (1 cancha, tarifas, mesas, usuarios). **No borra datos** (seed de producción idempotente).
7. (Opcional) Asigna un dominio: **Domains → Add** → `api.tudominio.com` → puerto 3001.
   Si no tienes dominio aún, usa el dominio que Easypanel genera.

**Verifica:** abre `https://api.tudominio.com/api/health` → debe responder `{"status":"ok"}`.

---

## Paso 3 — Servicio Web (`pal-cotejo-web`)
1. **+ Service → App**. Nombre: `pal-cotejo-web`.
2. **Source → GitHub** → mismo repo, rama `main`.
3. **Build → Dockerfile**, ruta: **`Dockerfile.web`**.
4. **Build Args** (¡importante, se inyecta en build!):
   ```
   NEXT_PUBLIC_API_URL=https://api.tudominio.com
   ```
   *(la URL pública de la API del Paso 2).*
5. **Port**: `3000`.
6. **Domains → Add** → `tudominio.com` (o `reservas.tudominio.com`) → puerto 3000.
7. **Deploy**.

**Verifica:** abre `https://tudominio.com` → carga el landing de PAL COTEJO.
Panel admin en `https://tudominio.com/admin`.

---

## Paso 4 — Probar en producción
- Landing y reserva de cliente cargan.
- Login admin con `admin@palcotejo.co` + la `ADMIN_PASSWORD` que pusiste.
- El dashboard muestra datos (al inicio estará vacío hasta que entren reservas reales).

---

## Paso 5 — Automatizaciones n8n (cuando el cliente tenga WhatsApp/correo)
En tu n8n existente, **importar** los flujos de la carpeta `n8n/`:
`confirmacion-reserva.json`, `recordatorio-juego.json`, `reporte-diario.json`, `campana-whatsapp.json`.
- Reemplazar `REEMPLAZAR_API_KEY` por tu `N8N_INTEGRATION_KEY`.
- Cambiar las URLs `pal-cotejo-api.onrender.com` por `api.tudominio.com`.
- Conectar credenciales de WhatsApp Cloud API y SMTP, y activar los flujos.
- En la API, agregar las variables `N8N_WEBHOOK_RESERVA_CONFIRMADA` y `N8N_WEBHOOK_CAMPANA`.

---

## ⚠️ Seguridad (hacer sí o sí)
- **Cambiar las contraseñas por defecto** (vía `ADMIN_PASSWORD` / `CAJA_PASSWORD`).
- Usar un `JWT_SECRET` largo y único.
- No commitear `.env` (ya está en `.gitignore`).
- Cada redeploy reaplica migraciones de forma segura; **nunca** borra reservas ni clientes.

---

## Actualizaciones futuras
Cada vez que hagamos cambios y subamos a GitHub (`main`), en Easypanel basta con
**Deploy** (o auto-deploy si lo activas) para actualizar API y Web.
