# Automatizaciones n8n

Flujos de automatizacion que rodean la plataforma de reservas. Se construyen y
validan con el entorno n8n-mcp y se despliegan en la instancia self-hosted.

## Flujos previstos

### 1. Confirmacion de reserva (WhatsApp + Email) — ✅ ARMADO Y VALIDADO
- **Archivo:** [`confirmacion-reserva.json`](confirmacion-reserva.json) (validado con n8n-mcp, 0 errores).
- **Estado:** listo para importar; NO desplegado en la instancia todavia (a la espera de
  credenciales de WhatsApp Cloud API y SMTP).
- **Disparador:** Webhook `POST /webhook/reserva-confirmada` (lo llama el API al aprobarse
  el pago). El API envia el payload COMPLETO (cliente, cancha, fecha, hora, montos, mesa).
- **Pasos:** Code arma el mensaje → Enviar WhatsApp + (si hay correo) Enviar Email.
- **Para produccion:** conectar credenciales y cambiar WhatsApp a 'Send Template' con
  plantilla aprobada por Meta.

### 2. Recordatorio de juego — ✅ ARMADO Y VALIDADO
- **Archivo:** [`recordatorio-juego.json`](recordatorio-juego.json) (validado, 0 errores).
- **Disparador:** Schedule (cada hora).
- **Pasos:** GET `/api/integracion/recordatorios` (reservas que empiezan en ~3 h, no
  recordadas) → armar mensaje → WhatsApp → POST `/api/integracion/recordatorios/marcar`.

### 3. Reporte diario de ingresos — ✅ ARMADO Y VALIDADO
- **Archivo:** [`reporte-diario.json`](reporte-diario.json) (validado, 0 errores).
- **Disparador:** Schedule (diario, 23:00).
- **Pasos:** GET `/api/integracion/reporte-diario` → armar resumen → WhatsApp + Email al dueño.

> **Endpoints de integración:** los flujos 2 y 3 consumen la API de PAL COTEJO en
> `/api/integracion/*`, protegida con header `x-api-key` (variable `N8N_INTEGRATION_KEY`).
> Reemplazar `REEMPLAZAR_API_KEY` en los nodos HTTP con esa clave.

### 4. Gestion de cancelacion / reembolso
- **Disparador:** Webhook desde el API al cancelar una reserva.
- **Pasos:** segun politica (>=24 h reembolso total) → solicitar reembolso a Wompi
  → notificar al cliente.

## Convenciones
- Renombrar cada nodo de forma descriptiva.
- Usar sticky notes para documentar la logica no obvia.
- Validar nodos, conexiones y expresiones con n8n-mcp antes de desplegar.
- Desplegar siempre desactivado; activar solo tras aprobacion del usuario.
- Credenciales (WhatsApp, SMTP, DB) en el gestor de credenciales de n8n, nunca en nodos.
```

Los archivos JSON exportados de cada flujo se guardaran en esta carpeta.
