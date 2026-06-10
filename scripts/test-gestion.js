// Prueba la página de gestión admin (Fase 3) con Playwright.
const { chromium } = require("playwright");
const path = require("path");
const OUT = path.join(__dirname, "..", "demo-capturas");
const BASE = "http://localhost:3000";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1040, height: 1500 }, deviceScaleFactor: 1.4 });
  const p = await ctx.newPage();

  // Login
  await p.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await p.getByPlaceholder("admin@palcotejo.co").fill("admin@palcotejo.co");
  await p.getByPlaceholder("••••••••").fill("admin123");
  await p.getByRole("button", { name: /Iniciar sesión/ }).click();
  await p.waitForURL("**/admin", { timeout: 10000 });
  await wait(1500);

  // Ir a Gestión
  await p.goto(`${BASE}/admin/gestion`, { waitUntil: "networkidle" });
  await wait(1500);
  await p.screenshot({ path: path.join(OUT, "gestion-1-inicial.png"), fullPage: true });

  // Crear un bloqueo (la nota + click Bloquear)
  await p.getByPlaceholder("Nota (opcional)").fill("Prueba automatizada");
  await p.getByRole("button", { name: /^Bloquear$/ }).click();
  await wait(1500);
  const okBloqueo = await p.locator("text=/Bloqueo creado/i").count();
  console.log("Bloqueo creado:", okBloqueo > 0 ? "SÍ ✓" : "NO");

  // Generar reservas de la primera recurrente si existe
  const genBtn = p.getByRole("button", { name: /Generar 4/ }).first();
  if (await genBtn.count()) {
    await genBtn.click();
    await wait(1500);
    const okGen = await p.locator("text=/Generadas/i").count();
    console.log("Generar recurrente:", okGen > 0 ? "SÍ ✓" : "NO");
  }

  await wait(800);
  await p.screenshot({ path: path.join(OUT, "gestion-2-tras-acciones.png"), fullPage: true });
  await browser.close();
  console.log("Listo. Capturas gestion-*.png");
}
main().catch((e) => { console.error(e); process.exit(1); });
