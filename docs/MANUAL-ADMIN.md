# 👑 Guía del administrador / dueño — PAL COTEJO

Tu cuenta de **admin** ve TODO (el cajero no ve Productos, Tarifas ni Bloqueos).
Entra con: **admin@palcotejo.co** y tu contraseña de administrador.

---

## 📊 1. Ver cómo va el negocio → **Dashboard**
De un vistazo: **ingresos de hoy**, de la semana, reservas activas, ticket promedio,
ocupación, **horas más rentables** y las **reservas del día**. Úsalo para tomar decisiones
(qué horas se mueven más, reforzar personal, etc.).

---

## 🍔 2. Inventario y productos → **Productos**  *(solo tú)*
- **Agregar producto:** llena Nombre, Categoría, Precio, Stock inicial y Stock mínimo → **Agregar**.
- **Cargar mercancía que llega:** botón **➕ Entrada** en el producto → escribe cuántas unidades → suma al stock.
- **Cambiar precio o mínimo:** escribe el número y haz clic afuera (se guarda solo).
- **Stock en rojo** = está bajo el mínimo → toca reabastecer. Arriba ves *"X con stock bajo"*.
- **Quitar del menú:** **Off** (lo oculta, sin borrar) · **🗑** (lo borra del todo, solo si no tiene ventas).

> 🍺 **Cervezas con presentaciones:** la 1/2 petaco (15), petaco (30) y six (6) **comparten el stock**
> de la cerveza base. **Solo cargas el stock de la base** (ej. "Águila"); al vender un petaco,
> el sistema descuenta 30 solo.

---

## 🍺 3. Ventas del bar → **Sport bar**
Ves **ventas de hoy y de la semana** y los **productos más vendidos**. (También puedes vender
desde aquí igual que la caja.)

---

## 👥 4. Clientes → **Clientes (CRM)**
- Filtra por **segmento**: VIP, Frecuente, Regular, Nuevo, **Dormido** (sin venir hace 30+ días).
- Clic en un cliente → ves su **historial** y puedes anotar datos (equipo, notas).
- **Exportar CSV** (Excel) para tu base de datos o campañas.

---

## ⚽ 5. Canchas y reservas
- **Reservas** → ver todas, filtrar por día, o **crear una reserva manual**.
- **Bloqueos** *(solo tú)* → bloquear una cancha por **mantenimiento, torneo o evento**, y
  registrar **clientes fijos** (reservas recurrentes semanales/mensuales).
- **Tarifas** *(solo tú)* → ver los precios **pico/valle** por día y hora.

---

## 🔐 Reglas importantes
1. **No le des tu clave de admin a la caja.** La caja entra con su propia cuenta (rol CAJA) y
   solo ve lo que necesita.
2. **Al inicio, carga el inventario real** con **➕ Entrada** en cada producto base.
3. Cada redeploy del sistema **no borra** tus datos (reservas, clientes, ventas, stock).

---

*Soporte: Solucionez · infra@solucionez.com*
