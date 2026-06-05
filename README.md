# Sport Bar & Cancha Sintetica — Plataforma de Reservas

Monorepo de la plataforma de reservas en linea (Colombia). Incluye frontend
mobile-first, backend API, base de datos PostgreSQL y automatizaciones n8n.

## Arquitectura

```
apps/web   → Frontend Next.js (PWA, mobile-first) — cliente + panel admin
apps/api   → Backend NestJS — disponibilidad, tarifas, reservas, pagos Wompi
packages/db→ Esquema PostgreSQL + Prisma + seed
n8n/       → Flujos de automatizacion (WhatsApp, recordatorios, reportes)
docs/      → Documentacion de entrega
```

## Requisitos

- Node.js 20+ (tienes 24 ✔)
- Docker Desktop (para PostgreSQL) — **pendiente de instalar**
- Una cuenta Wompi (sandbox) y WhatsApp Cloud API (para fases posteriores)

## Puesta en marcha (desarrollo)

```bash
# 1. Copiar variables de entorno
cp .env.example .env        # PowerShell: Copy-Item .env.example .env

# 2. Instalar dependencias del monorepo
npm install

# 3. Levantar PostgreSQL (requiere Docker Desktop corriendo)
npm run db:up

# 4. Crear las tablas y datos de ejemplo
npm run db:migrate          # genera la migracion inicial
npm run prisma:seed --workspace @sportbar/db

# 5. Arrancar backend (puerto 3001) y frontend (puerto 3000)
npm run dev:api             # en una terminal
npm run dev:web             # en otra terminal
```

Abrir http://localhost:3000 en el celular (o con DevTools en modo movil).

## Endpoints principales del API

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/canchas` | Lista de canchas activas |
| GET | `/api/disponibilidad/:canchaId?fecha=YYYY-MM-DD` | Grilla de slots con precio |
| POST | `/api/reservas` | Crear reserva (calcula abono) |
| POST | `/api/reservas/:id/cancelar` | Cancelar con politica de antelacion |
| GET | `/api/reservas?fecha=YYYY-MM-DD` | Reservas del dia (panel caja) |
| POST | `/api/pagos/wompi/webhook` | Webhook de Wompi (confirma pago) |

## Estado del proyecto (scaffold inicial)

✅ Modelo de datos completo (canchas, tarifas pico/valle, reservas, abonos,
recurrencias, bloqueos, pagos, mesas, clientes, staff)
✅ Motor de disponibilidad y tarifas por dia/hora
✅ Creacion de reservas con abono configurable
✅ Politica de cancelacion por antelacion
✅ Webhook de Wompi con verificacion de firma
✅ Frontend mobile-first con grilla de reservas

### Pendiente (siguientes iteraciones)
- [ ] Panel admin: bloqueos, reservas manuales, recurrentes, reportes
- [ ] Autenticacion de staff (JWT) y proteccion de rutas admin
- [ ] Generador de reservas a partir de reglas recurrentes
- [ ] Integracion frontend con checkout de Wompi (widget)
- [ ] Flujos n8n: confirmacion + recordatorio WhatsApp/Email, reporte diario
- [ ] Modulo Sport Bar: gestion de mesas y disponibilidad

## Propiedad del codigo

Todo el codigo de este repositorio se entrega al cliente al finalizar, junto con
accesos a hosting y dominio. No se usan plataformas SaaS de reservas de terceros.
