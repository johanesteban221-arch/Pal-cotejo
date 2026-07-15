# ONBOARDING — PAL COTEJO (para el equipo de Solucionez)

Bienvenido/a al proyecto. Esta guía te deja el proyecto corriendo en tu PC y te
explica cómo está montado y cómo se despliega. Cualquier duda: infra@solucionez.com.

---

## 1. Qué es
**PAL COTEJO** es un cliente de Solucionez: un *sport bar* con **una** cancha
sintética de fútbol (Bogotá). Le desarrollamos una **plataforma web de reservas
en línea** (mobile-first) + **panel de administración** + **POS del bar** con
inventario. El código se entrega al cliente al final (código, hosting y dominio son suyos).

- **Repo:** https://github.com/johanesteban221-arch/Pal-cotejo
- **Producción (VPS del cliente con Easypanel):**
  - Sitio/panel: `https://johan-pal-cotejo-web.qfdh9u.easypanel.host` (panel en `/admin`)
  - API: `https://johan-pal-cotejo-api.qfdh9u.easypanel.host`
- **Modo actual:** "pago en sitio" (la pasarela Wompi está en pausa — Fase 2).

---

## 2. Arquitectura

Monorepo con **npm workspaces**:

```
apps/web    → Frontend Next.js 14 (App Router, CSS plano). Sitio cliente + panel /admin
apps/api    → Backend NestJS 10 (JWT, roles ADMIN/CAJA). Reservas, tarifas, POS
packages/db → Prisma + PostgreSQL. Esquema, migraciones y seeds
n8n/        → Flujos de automatización (armados y validados, NO desplegados aún)
docs/       → Documentación de entrega y despliegue
scripts/    → Utilidades (capturas, etc.)
```

Stack: Next.js 14 · NestJS 10 · Prisma · PostgreSQL 16/17 · Docker (para desplegar).

---

## 3. Requisitos en tu PC
- **Node.js 20+** (recomendado 20 o 22).
- **Git**.
- **PostgreSQL** — la forma más fácil es con **Docker Desktop** (el repo trae `docker-compose.yml`).
  Alternativa: instalar PostgreSQL local y ajustar `DATABASE_URL`.
- Editor: **VS Code**.

---

## 4. Puesta en marcha (desarrollo local)

```bash
# 1. Clonar el repo
git clone https://github.com/johanesteban221-arch/Pal-cotejo.git
cd Pal-cotejo

# 2. Crear tu .env a partir del ejemplo
cp .env.example .env          # PowerShell: Copy-Item .env.example .env

# 3. Instalar dependencias del monorepo
npm install

# 4. Levantar PostgreSQL con Docker (Docker Desktop debe estar corriendo)
npm run db:up

# 5. Crear tablas + datos de ejemplo (demo)
npm run db:migrate
npm run prisma:seed --workspace @sportbar/db

# 6. Arrancar backend y frontend (dos terminales)
npm run dev:api               # API en http://localhost:3001
npm run dev:web               # Web en http://localhost:3000
```

Abre **http://localhost:3000** (sitio cliente) y **http://localhost:3000/admin** (panel).

> Si NO usas Docker y tienes PostgreSQL local, edita `DATABASE_URL` en tu `.env`
> con tu usuario/clave/puerto locales antes del paso 5.

### Cuentas de prueba (seed demo)
| Rol | Correo | Clave |
|---|---|---|
| Admin | `admin@palcotejo.co` | `admin123` |
| Caja | `caja@palcotejo.co` | `caja123` |

*(En **producción** las contraseñas son distintas — pídelas, ver §6.)*

---

## 5. Módulos ya construidos
- **Reservas:** calendario/grilla, tarifas pico/valle, reserva manual (caja), bloqueos.
- **Panel admin:** dashboard (ventas del día/semana), CRM de clientes (segmentos, export).
- **POS Sport Bar:** cuentas por mesa/cliente, cobro (efectivo/tarjeta/otro), **recibo imprimible**.
- **Inventario:** menú real (cervezas con presentaciones ½ petaco=15 / petaco=30 / six=6 que
  comparten stock del producto base), entradas, alerta de stock bajo, **kardex** (valor + movimientos).
- **Auth:** JWT, roles ADMIN (todo) y CAJA (sin Tarifas/Bloqueos/Productos/Inventario).
- **n8n:** flujos armados y validados (sin desplegar). Fase 2 (pagos + notificaciones) en pausa.

Detalle por fases en [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## 6. Secretos y accesos (NO están en el repo)
Por seguridad, las credenciales **no se suben a GitHub** (`.gitignore` las excluye).
Pídeselas a Johan / infra@solucionez.com por un canal seguro:

- **`.env` de producción** (o al menos `DATABASE_URL`, `JWT_SECRET`) — para levantar local ya te sirve `.env.example`.
- **Contraseñas de producción:** admin y caja del panel en vivo.
- **Acceso a Easypanel** (panel del VPS `72.60.168.60`) — para ver/gestionar el despliegue.
- **AnyDesk** del PC de caja del cliente.
- **`.mcp.json`** con las llaves de n8n (`N8N_API_URL`, `N8N_API_KEY`) si vas a trabajar automatizaciones.

---

## 7. Despliegue (producción)
- Producción corre en **Easypanel** (VPS del cliente): 3 servicios → `pal-cotejo-db`, `pal-cotejo-api`, `pal-cotejo-web` (Dockerfiles `Dockerfile.api` / `Dockerfile.web`, puertos 3001 / 3000).
- **Auto-deploy activo:** cada `git push` a `main` **redespliega solo** api y web
  (vía webhooks de GitHub → URLs de "Activación de implementación" de Easypanel). **No hay que darle "Implementar" a mano.**
- El seed de producción (`seed-prod.js`) es **idempotente y NO borra datos**.
- Guía completa: [`docs/DESPLIEGUE-EASYPANEL.md`](docs/DESPLIEGUE-EASYPANEL.md).

---

## 8. Flujo de trabajo con Git
```bash
git pull                       # antes de empezar, trae lo último
# ...haces cambios...
git add -A && git commit -m "descripción del cambio"
git push origin main           # esto DISPARA el auto-deploy a producción
```
> Como `push` a `main` va directo a producción, prueba en local antes de subir.
> Para cambios grandes, considera una rama y merge cuando esté probado.

---

## 9. Guías de referencia (carpeta `docs/`)
- [`ROADMAP.md`](docs/ROADMAP.md) — fases del proyecto y qué falta.
- [`DESPLIEGUE-EASYPANEL.md`](docs/DESPLIEGUE-EASYPANEL.md) — cómo desplegar en el VPS.
- [`INSTALACION-CAJA.md`](docs/INSTALACION-CAJA.md) — dejar el PC de caja listo (AnyDesk).
- [`MANUAL-CAJA.md`](docs/MANUAL-CAJA.md) / [`MANUAL-ADMIN.md`](docs/MANUAL-ADMIN.md) — manuales de uso.
- `kit-presentacion/` — guías en PDF para cajero y administrador.

---

## 10. Convenciones
- **Comunicación con el cliente:** en español. Código y config en inglés.
- No inventar tipos/parámetros de nodos n8n — confirmar con n8n-mcp.
- Los secretos van en credenciales de n8n / variables de entorno, **nunca hardcodeados**.
- Fase 2 (pagos Wompi + WhatsApp/Email) está **en pausa** hasta que el cliente defina la pasarela.

---

## 11. Nota sobre el naming (sportbar vs pal-cotejo)

**Esto es una decisión deliberada, no un descuido. No lo "arregles".**

En el repo conviven dos nombres y es intencional:

- **Interno (se mantiene como `sportbar`, a propósito):**
  - El **scope de npm workspaces** `@sportbar/*` (`@sportbar/api`, `@sportbar/web`,
    `@sportbar/db`) y el nombre del paquete raíz `sportbar-reservas`.
  - Los **identificadores de PostgreSQL**: rol/usuario `sportbar`, base `sportbar`,
    volumen Docker `sportbar_pgdata` y contenedor `sportbar_postgres`.
- **De cara al usuario (ya usa `pal-cotejo`):** los servicios de despliegue
  (`pal-cotejo-db/api/web`), las URLs públicas (p. ej. `pal-cotejo-api.onrender.com`
  y el host de Easypanel) y los correos del staff `@palcotejo.co`.

**Por qué el scope npm se deja como está:** es invisible para el cliente y para el
proveedor de despliegue (Easypanel solo construye el Dockerfile; los `--workspace`
internos son consistentes entre sí). Renombrarlo sería puro pulido cosmético sin
beneficio funcional.

**Por qué NO se renombran los identificadores de Postgres:** el volumen local y las
bases ya provisionadas (Render/Easypanel) se inicializaron con el rol y la base
`sportbar`. Postgres solo crea usuario/base en el **primer arranque de un volumen
vacío**; cambiar esos nombres contra un volumen o una DB existente **rompe la
conexión** (`pg_isready`/auth fallan) y, en la práctica, implica recrear la base con
**riesgo de pérdida de datos** — todo ello a cambio de **cero beneficio funcional**
(un nombre de rol de base de datos no se ve en ningún lado y es perfectamente válido
aunque diga "sportbar").

**Conclusión:** mantener `@sportbar` y los identificadores de Postgres es la opción
de menor riesgo. Lo de cara al usuario ya está alineado a `pal-cotejo`; no hay nada
que corregir aquí.
