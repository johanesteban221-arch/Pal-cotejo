// Recorrido automatizado de la demo PAL COTEJO con Playwright.
// Graba video (.webm) y captura screenshots de cada pantalla del flujo.
// Uso: node scripts/grabar-demo.js   (con la web corriendo en localhost:3000)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:3000";
const OUT = path.join(__dirname, "..", "demo-capturas");
const VID = path.join(__dirname, "..", "demo-video");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(VID, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch();

  // ───────── PASS 1: Flujo del cliente (móvil) con video ─────────
  const ctxCli = await browser.newContext({
    viewport: { width: 460, height: 940 },
    deviceScaleFactor: 2,
    recordVideo: { dir: VID, size: { width: 460, height: 940 } },
  });
  const p = await ctxCli.newPage();

  await p.goto(BASE, { waitUntil: "networkidle" });
  await wait(1200);
  await p.screenshot({ path: path.join(OUT, "flujo-1-cancha.png") });

  // Paso 1 -> 2
  await p.getByRole("button", { name: /Continuar/ }).click();
  await wait(900);
  await p.screenshot({ path: path.join(OUT, "flujo-2-fecha.png") });

  // Elegir una fecha (chip cercano, ej. el 6º día)
  const chips = p.locator(".fecha-chip");
  const nChips = await chips.count();
  await chips.nth(Math.min(5, nChips - 1)).click();
  await wait(500);
  await p.getByRole("button", { name: /Ver horarios/ }).click();
  await wait(1500); // cargar disponibilidad
  await p.screenshot({ path: path.join(OUT, "flujo-3-horario.png") });

  // Elegir el último horario disponible (noche, suele estar libre)
  const libres = p.locator(".slot:not(.off)");
  const nLibres = await libres.count();
  if (nLibres > 0) await libres.nth(nLibres - 1).click();
  await wait(600);
  await p.getByRole("button", { name: /Continuar/ }).click();
  await wait(900);
  await p.screenshot({ path: path.join(OUT, "flujo-4a-extras.png") });

  // Activar mesa del sport bar
  await p.locator(".toggle").first().click();
  await wait(500);
  // Datos del cliente
  await p.getByPlaceholder("Tu nombre").fill("Andrés Ramírez");
  await p.getByPlaceholder(/WhatsApp/).fill("+57 300 555 6677");
  await wait(500);
  await p.screenshot({ path: path.join(OUT, "flujo-4b-datos.png") });

  // Pagar
  await p.getByRole("button", { name: /Pagar/ }).click();
  await p.waitForSelector(".success-ring", { timeout: 15000 });
  await wait(1500);
  await p.screenshot({ path: path.join(OUT, "flujo-5-confirmacion.png"), fullPage: true });

  await ctxCli.close();
  const vidCliPath = await p.video().path();

  // ───────── PASS 2: Panel admin (escritorio) con video ─────────
  const ctxAdm = await browser.newContext({
    viewport: { width: 1320, height: 900 },
    deviceScaleFactor: 1.5,
    recordVideo: { dir: VID, size: { width: 1320, height: 900 } },
  });
  const a = await ctxAdm.newPage();
  await a.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await wait(2500); // cargar gráficas
  await a.screenshot({ path: path.join(OUT, "admin-dashboard.png"), fullPage: true });
  // Pequeño scroll para el video
  await a.mouse.wheel(0, 400);
  await wait(1200);
  await a.mouse.wheel(0, -400);
  await wait(800);
  await ctxAdm.close();
  const vidAdmPath = await a.video().path();

  await browser.close();

  // Renombrar videos
  const dest1 = path.join(VID, "1-recorrido-cliente.webm");
  const dest2 = path.join(VID, "2-panel-admin.webm");
  try { fs.renameSync(vidCliPath, dest1); } catch {}
  try { fs.renameSync(vidAdmPath, dest2); } catch {}

  console.log("✔ Listo:");
  console.log("  Video cliente:", dest1);
  console.log("  Video admin:  ", dest2);
  console.log("  Screenshots en:", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
