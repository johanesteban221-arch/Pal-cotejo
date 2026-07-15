# Sport Bar & Cancha Sintetica — Plataforma de Reservas (PAL COTEJO)

Monorepo de la plataforma de reservas en linea (Colombia). Incluye frontend
mobile-first + panel de administracion, backend API, base de datos PostgreSQL y
automatizaciones n8n. Cliente: **PAL COTEJO**, un sport bar con una cancha
sintetica de futbol 5 en Bogota.

## Arquitectura

Monorepo con **npm workspaces**:

```
apps/web    → Frontend Next.js 14 (App Router, PWA, CSS plano). Sitio cliente + panel /admin
apps/api    → Backend NestJS 10 (JWT, roles ADMIN/CAJA). Reservas, tarifas, pagos, POS
packages/db → Prisma + PostgreSQL. Esquema, migraciones y seeds (demo y produccion)
n8n/        → Flujos de automatizacion (armados y validados, NO desplegados aun)
scripts/    → Utilidades Playwright (capturas y grabacion de la demo)
docs/       → Documentacion de entrega y despliegue
```

Stack: Next.js 14 · React 18 · NestJS 10 · Prisma 5 · PostgreSQL 16 · TypeScript · Docker.

## Requisitos

- **Node.js 20+**.
- **Git**.
- **PostgreSQL** — lo mas facil es con **Docker Desktop** (el repo trae `docker-compose.yml`).
  Alternativa: PostgreSQL local ajustando `DATABASE_URL`.
- Editor recomendado: **VS Code**.

## Puesta en marcha (desarrollo)

```bash
# 1. Copiar variables de entorno
cp .env.example .env        # PowerShell: Copy-Item .env.example .env

# 2. Instalar dependencias del monorepo
npm install

# 3. Levantar PostgreSQL (requiere Docker Desktop corriendo)
npm run db:up

# 4. Crear las tablas
npm run db:migrate          # prisma migrate dev (genera/aplica migraciones)

# 5. Cargar datos de ejemplo (DEMO). El seed demo es destructivo, por eso
#    exige el opt-in explicito SEED_DEMO=1 (sin el, no toca la base).
SEED_DEMO=1 npm run prisma:seed --workspace @sportbar/db

# 6. Arrancar backend (puerto 3001) y frontend (puerto 3000)
npm run dev:api             # en una terminal
npm run dev:web             # en otra terminal
```

Abrir **http://localhost:3000** (sitio cliente) y **http://localhost:3000/admin**
(panel). En el celular o con DevTools en modo movil.

### Cuentas de prueba (seed demo)

| Rol | Correo | Clave |
|---|---|---|
| Admin | `admin@palcotejo.co` | `admin123` |
| Caja | `caja@palcotejo.co` | `caja123` |

*(En produccion las contrasenas son distintas — el seed de produccion las toma de
variables de entorno.)*

## Endpoints principales del API

Prefijo global `/api`. Rutas publicas/cliente:

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/health` | Healthcheck (incluye ping a la base de datos) |
| GET | `/api/canchas` | Lista de canchas activas |
| GET | `/api/disponibilidad/:canchaId?fecha=YYYY-MM-DD` | Grilla de slots con precio |
| POST | `/api/reservas` | Crear reserva (calcula abono) |
| POST | `/api/reservas/:id/cancelar` | Cancelar con politica de antelacion |
| POST | `/api/pagos/wompi/webhook` | Webhook de Wompi (Fase 2, en pausa) |

Rutas de staff (JWT, roles ADMIN/CAJA):

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/api/auth/login` | Login de staff (devuelve JWT) |
| GET | `/api/auth/me` | Perfil del usuario autenticado |
| GET | `/api/reservas?fecha=YYYY-MM-DD` | Reservas del dia (panel caja) |
| POST | `/api/reservas/manual` | Reserva manual (caja) |
| GET | `/api/reportes/dashboard` | Dashboard de ventas |
| GET | `/api/admin/clientes` | CRM de clientes (segmentos, export) |
| — | `/api/pos/*` | POS del bar: productos, inventario, cuentas, cobro |
| — | `/api/bloqueos`, `/api/recurrentes` | Bloqueos y reservas recurrentes |

Integracion n8n en `/api/integracion/*`, protegida con header `x-api-key`
(`N8N_INTEGRATION_KEY`). El detalle completo de rutas esta en los controladores de
[`apps/api/src`](apps/api/src).

## Estado del proyecto

Modulos ya construidos (confirmados en el codigo y en `ONBOARDING.md`):

- **Reservas:** motor de disponibilidad y tarifas pico/valle por dia/hora, creacion
  con abono configurable, politica de cancelacion por antelacion, reserva manual y
  bloqueos.
- **Panel admin (`/admin`):** dashboard (ventas del dia/semana), reportes, gestion
  de canchas/tarifas/bloqueos, CRM de clientes (segmentos y export).
- **POS Sport Bar:** cuentas por mesa/cliente, cobro (efectivo/tarjeta/otro) y recibo
  imprimible.
- **Inventario:** menu real (cervezas con presentaciones ½ petaco=15 / petaco=30 /
  six=6 que comparten stock del producto base), entradas, alerta de stock bajo y
  kardex (valor del stock + historial de movimientos).
- **Auth:** JWT con roles ADMIN (todo) y CAJA (sin Tarifas/Bloqueos/Productos/Inventario).
- **Modelo de datos completo:** canchas, tarifas, reservas, abonos/pagos, recurrencias,
  bloqueos, mesas, clientes, staff, productos, inventario y cuentas del bar.

### Pendiente / Fase 2 (en pausa)

- [ ] **Pagos Wompi:** integracion del checkout (widget) y webhook en operacion.
  En pausa hasta que el cliente defina la pasarela; el modo actual es "pago en sitio".
- [ ] **Flujos n8n:** confirmacion + recordatorio (WhatsApp/Email), reporte diario y
  campana por segmento estan **armados y validados pero NO desplegados** (a la espera
  de credenciales de WhatsApp Cloud API y SMTP).

Detalle por fases en [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Despliegue

- **Produccion:** corre en **Easypanel** (VPS del cliente), con 3 servicios
  (`pal-cotejo-db`, `pal-cotejo-api`, `pal-cotejo-web`) construidos desde
  [`Dockerfile.api`](Dockerfile.api) y [`Dockerfile.web`](Dockerfile.web) (puertos
  3001 / 3000). Cada `push` a `main` redespliega automaticamente via webhooks de
  GitHub. El seed de produccion (`seed-prod.js`) es idempotente y no borra datos.
  Guia: [`docs/DESPLIEGUE-EASYPANEL.md`](docs/DESPLIEGUE-EASYPANEL.md).
- **Demo publica (opcional):** [`render.yaml`](render.yaml) es un blueprint para
  **Render.com** que publica la demo (DB + API + web) en el plan gratuito. **No es el
  despliegue de produccion.** Guia: [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md).

## Propiedad del codigo

Todo el codigo de este repositorio se entrega al cliente al finalizar, junto con
accesos a hosting y dominio. No se usan plataformas SaaS de reservas de terceros.
