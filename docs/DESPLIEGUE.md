# Guía de despliegue — Publicar la demo PAL COTEJO en internet

Objetivo: que la demo quede con un **link público** (ej. `https://pal-cotejo-web.onrender.com`)
que tu familiar pueda abrir y presentar **desde cualquier computador**, sin depender de tu PC.

Usamos **Render.com** porque permite desplegar las 3 piezas (base de datos + API + web)
desde un solo archivo (`render.yaml`) y tiene **plan gratuito**.

---

## Lo que necesitas (gratis, 2 cuentas)
1. Una cuenta de **GitHub** → https://github.com/signup
2. Una cuenta de **Render** → https://render.com (puedes entrar con el mismo GitHub)

> Estas cuentas van **a tu nombre** (usan tu correo), por eso este paso lo hacemos juntos
> o lo haces tú siguiendo esta guía. El código y todo lo demás ya está listo.

---

## Paso 1 — Subir el código a GitHub
El proyecto ya es un repositorio git local. Falta enviarlo a GitHub.

**Opción fácil (visual):** instala *GitHub Desktop* (https://desktop.github.com), inicia sesión,
elige *Add Local Repository* → selecciona la carpeta `sportbar-reservas` → *Publish repository*
(márcalo como **privado**).

**Opción terminal:**
```bash
cd sportbar-reservas
git add .
git commit -m "Demo PAL COTEJO lista para desplegar"
# Crea el repo en github.com (privado) y luego:
git remote add origin https://github.com/TU_USUARIO/pal-cotejo.git
git branch -M main
git push -u origin main
```

---

## Paso 2 — Desplegar en Render con el Blueprint
1. Entra a https://dashboard.render.com
2. Clic en **New +** → **Blueprint**.
3. Conecta tu cuenta de GitHub y elige el repo `pal-cotejo`.
4. Render detecta el archivo **`render.yaml`** y te muestra los 3 servicios
   (base de datos, API y web). Clic en **Apply**.
5. Espera a que terminen de construirse (5–10 min la primera vez). Verás 3 servicios en verde.

---

## Paso 3 — Verificar la URL de la API
1. Abre el servicio **pal-cotejo-api** en Render y copia su URL
   (ej. `https://pal-cotejo-api.onrender.com`).
2. Abre `https://pal-cotejo-api.onrender.com/api/canchas` en el navegador:
   debe mostrar las canchas en formato JSON. ✅
3. **Si la URL es distinta** a `https://pal-cotejo-api.onrender.com`:
   - Ve al servicio **pal-cotejo-web** → *Environment* → variable `NEXT_PUBLIC_API_URL`
   - Pégale la URL real de la API → *Save* → el web se reconstruye solo.

---

## Paso 4 — ¡Listo! Tu link para presentar
Abre el servicio **pal-cotejo-web** y copia su URL (ej. `https://pal-cotejo-web.onrender.com`).

- 👉 **Cliente:** `https://pal-cotejo-web.onrender.com`
- 👉 **Panel admin:** `https://pal-cotejo-web.onrender.com/admin`

Ese es el enlace que le pasas a tu familiar. Funciona desde cualquier computador o celular.

---

## ⚠️ Importante sobre el plan gratuito (para la presentación)
- **Se "duerme" por inactividad:** si nadie lo usa por ~15 min, la primera carga tarda
  **30–50 segundos** en despertar. **Truco:** abre el link **1–2 minutos antes** de presentar
  para que esté despierto.
- **Datos de demostración:** cada vez que se redespliega, la base se recarga con los datos
  de ejemplo (eso está bien para una demo).
- **No usar con datos reales todavía:** es un ambiente de demostración. Para producción se
  configura un plan pago, dominio propio y credenciales reales de Wompi/WhatsApp.

---

## Resumen
| Pieza | Servicio en Render | Para qué |
|---|---|---|
| Base de datos | `pal-cotejo-db` (PostgreSQL) | Guarda canchas, reservas, pagos |
| API | `pal-cotejo-api` (Node) | Lógica de reservas y reportes |
| Web | `pal-cotejo-web` (Next.js) | Lo que ve el cliente y el admin |

Todo está definido en [`render.yaml`](../render.yaml). Si algo falla, escríbeme y lo revisamos.
