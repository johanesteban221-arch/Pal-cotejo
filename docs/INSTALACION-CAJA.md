# Instalación en el PC de caja (vía AnyDesk) — PAL COTEJO

El PC de escritorio del cliente **no es un servidor**: es la estación donde la caja
abre el **panel admin** en el navegador. "Instalar" aquí = dejar un acceso tipo app +
sesión iniciada + capacitar. Toma ~15 minutos.

> **Requisito previo:** la plataforma ya desplegada (ver `DESPLIEGUE-EASYPANEL.md`).
> Ten a la mano la URL del panel: `https://tudominio.com/admin`.

---

## Paso 1 — Abrir el panel
1. Conéctate por **AnyDesk** al PC del cliente.
2. Abre **Microsoft Edge** o **Google Chrome**.
3. Entra a `https://tudominio.com/admin`.
4. Inicia sesión con la cuenta de **CAJA**:
   - Correo: `caja@palcotejo.co`
   - Contraseña: la que definiste en el despliegue (`CAJA_PASSWORD`).

> La sesión queda guardada ~7 días; no hay que iniciar sesión cada vez.

---

## Paso 2 — Dejarlo como "app" en el escritorio
Así la caja lo abre con un ícono, en su propia ventana (sin barra de navegador).

**En Microsoft Edge:**
- Menú **⋯** (arriba a la derecha) → **Aplicaciones** → **Instalar este sitio como una aplicación**.
- Acepta el nombre "PAL COTEJO" → **Instalar**.
- Marca **"Anclar a la barra de tareas"** y **"Crear acceso directo en el escritorio"**.

**En Google Chrome:**
- Menú **⋮** → **Guardar y compartir** (o **Más herramientas**) → **Crear acceso directo…**
- Marca **"Abrir como ventana"** → **Crear**.

Resultado: un ícono **PAL COTEJO** en el escritorio que abre el panel como un programa.

---

## Paso 3 — Capacitación rápida a la caja (qué mostrarle)
- **Dashboard:** ventas del día/semana, horas más rentables, reservas de hoy.
- **Reservas → Nueva reserva manual:** para clientes que **llaman o llegan** al local.
- **Reservas (tabla):** ver y filtrar las reservas por día.
- **Clientes (CRM):** ver historial, segmentos, exportar a Excel.
- **Canchas / Sport bar:** estado general.

> El **cliente final reserva solo** desde su celular con el **link o un QR** — la caja
> no tiene que hacer esas reservas; solo las telefónicas/presenciales.

---

## Paso 4 — Recomendaciones finales
- **Pon un QR** con el link del cliente (`https://tudominio.com`) en la entrada y las mesas.
- **No le des la clave de ADMIN a la caja.** La caja usa el rol **CAJA** (no ve Tarifas ni
  Bloqueos); esos los maneja el **dueño/administrador** con su propia cuenta.
- Si el PC se reinicia, solo hay que abrir el ícono de PAL COTEJO; la sesión sigue activa.
- Para soporte: Solucionez · infra@solucionez.com.

---

## Resumen de cuentas
| Rol | Correo | Ve | Úsala en |
|---|---|---|---|
| **Caja** | `caja@palcotejo.co` | Dashboard, Reservas, Clientes, Canchas, Bar | PC de caja |
| **Admin/Dueño** | `admin@palcotejo.co` | Todo + Tarifas + Bloqueos | Equipo del dueño |
