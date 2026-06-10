# 🗺️ Roadmap de desarrollo — PAL COTEJO (demo → producción)

Plan por fases para llevar la plataforma de **demo funcional** a **producto en producción**.
El orden respeta las dependencias técnicas (lo de abajo necesita lo de arriba).

> **Estado base (ya hecho):** modelo de datos, motor de disponibilidad y tarifas, creación
> de reservas con abono, política de cancelación (lógica), webhook Wompi (base), panel de
> reportes (visual), demo desplegada en la nube.
>
> **Avance:** ✅ Fase 1 (auth staff JWT) · ✅ Fase 3 (gestión admin: bloqueos, reservas
> manuales, recurrentes) · ⏸️ Fase 2 (pagos) en pausa hasta que el cliente defina la pasarela.

---

## Fase 1 — 🔐 Fundamentos de producción (seguridad)
*Base obligatoria antes de exponer el panel y cobrar de verdad.*
- Autenticación de **staff** (JWT): login, roles **ADMIN** y **CAJA**.
- Proteger rutas `/admin` y endpoints sensibles (reportes, reservas manuales, bloqueos).
- Reemplazar credenciales demo, hash real de contraseñas (bcrypt).
- CORS restringido al dominio real, validación y manejo de errores consistente.

**Entregable:** solo el personal autorizado entra al panel. **Dependencias:** ninguna.

---

## Fase 2 — 💳 Pagos reales (Wompi)
*El corazón del cobro. Requiere cuenta Wompi del cliente.*
- Integrar el **checkout/widget de Wompi** en el frontend (firma de integridad).
- Webhook real con verificación de firma y **conciliación** del pago con la reserva.
- **Expiración** de reservas `PENDIENTE` no pagadas (liberar el cupo a los X min).
- Reembolsos según política de cancelación.

**Entregable:** el cliente paga abono o total con tarjeta/PSE/Nequi y la reserva se confirma sola.
**Dependencias:** Fase 1. **El cliente aporta:** cuenta Wompi + llaves.

---

## Fase 3 — 🛠️ Gestión operativa (panel admin real)
*Lo que usa la caja todos los días.*
- **Bloqueos** de cancha (mantenimiento, torneos, eventos) — interfaz CRUD.
- **Reservas manuales** (clientes que llaman o llegan al local).
- **Reservas recurrentes** + **generador automático** (cron) que crea las reservas concretas.
- **Gestión de tarifas** (editar precios pico/valle desde el panel).
- Gestión de canchas y mesas.

**Entregable:** la operación completa se maneja desde el panel, sin tocar la base de datos.
**Dependencias:** Fase 1.

---

## Fase 4 — 📲 Automatización n8n (notificaciones)
*La especialidad de este entorno. Requiere WhatsApp API y correo.*
- **Confirmación** por WhatsApp + Email al aprobarse el pago (el API ya emite el evento).
- **Recordatorio** automático X horas antes del partido (schedule).
- **Reporte diario** de ingresos al dueño.
- Aviso de **cancelación/reembolso**.

**Entregable:** el cliente recibe todo automático; el dueño recibe su cierre diario.
**Dependencias:** Fase 2 (evento de pago). **El cliente aporta:** número WhatsApp Business
verificado + plantillas aprobadas, y correo (SMTP).

---

## Fase 5 — 🍻 Módulo Sport Bar completo
- Disponibilidad real de **mesas** (no solo cupo): asignación y aforo por franja.
- Venta cruzada mejorada y reporte de ocupación del bar.

**Entregable:** gestión completa de mesas integrada a las reservas. **Dependencias:** Fase 3.

---

## Fase 6 — 🚀 Pulido, PWA e infraestructura de producción
- **PWA real**: service worker, instalable, íconos propios, carga offline básica.
- **Reportes exportables** a Excel/CSV.
- Infraestructura de producción: **dominio propio**, hosting pago (sin "dormir"),
  base de datos gestionada con **backups**, HTTPS, rate limiting, manejo de secretos.
- Pruebas (unit/e2e) y monitoreo básico.

**Entregable:** plataforma rápida, segura y estable, lista para uso real.
**El cliente aporta:** dominio + decisión de hosting.

---

## Fase 7 — 📦 Entrega final
- Documentación y manual de uso.
- Capacitación al personal.
- Traspaso de **accesos, código fuente y dominio** a nombre del cliente.

---

## 📊 Mapeo con los planes comerciales
| Fase | Plan Inicial | Plan Esencial | Plan Full |
|---|:---:|:---:|:---:|
| 1 · Seguridad | ✅ | ✅ | ✅ |
| 2 · Pagos Wompi | ✅ | ✅ | ✅ |
| 3 · Gestión admin | parcial | ✅ | ✅ |
| 4 · n8n notificaciones | — | ✅ | ✅ |
| 5 · Sport Bar | — | — | ✅ |
| 6 · Pulido/PWA/infra | básico | ✅ | ✅ |
| 7 · Entrega | ✅ | ✅ | ✅ |

---

## 🔑 Lo que necesitamos del cliente (para no bloquearnos)
1. **Cuenta Wompi** (comercio) + llaves → Fase 2.
2. **WhatsApp Business** verificado + plantillas + **correo SMTP** → Fase 4.
3. **Dominio** y decisión de **hosting de producción** → Fase 6.

## ▶️ Punto de arranque recomendado
**Fase 1 (Seguridad)** — es la base de todo lo demás y no depende de cuentas externas,
así que podemos empezar ya mismo sin esperar nada del cliente.
