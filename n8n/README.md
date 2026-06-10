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

### 2. Recordatorio de juego
- **Disparador:** Schedule (cada hora).
- **Pasos:** buscar reservas CONFIRMADAS que empiezan en ~3 h y aun sin recordatorio
  → enviar WhatsApp + Email → marcar recordatorio enviado.

### 3. Reporte diario de ingresos
- **Disparador:** Schedule (diario, ej. 23:00).
- **Pasos:** agregar pagos APROBADOS del dia → calcular horas mas rentables y
  ocupacion → enviar resumen al dueño por WhatsApp/Email.

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
