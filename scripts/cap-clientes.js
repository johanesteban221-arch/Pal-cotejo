const { chromium } = require("playwright");
const path = require("path");
const OUT = path.join(__dirname, "..", "demo-capturas", "v2");
const BASE = "http://localhost:3000";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1320, height: 950 }, deviceScaleFactor: 1.3 });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await p.getByPlaceholder("admin@palcotejo.co").fill("admin@palcotejo.co");
  await p.getByPlaceholder("••••••••").fill("admin123");
  await p.getByRole("button", { name: /Iniciar sesión/ }).click();
  await p.waitForURL("**/admin", { timeout: 10000 });
  await p.goto(`${BASE}/admin/clientes`, { waitUntil: "networkidle" });
  await wait(2500);
  await p.screenshot({ path: path.join(OUT, "admin-clientes.png"), fullPage: true });
  console.log("clientes ✓");
  // Abrir modal de perfil (primera fila)
  const filas = p.locator("tbody tr");
  if (await filas.count()) {
    await filas.first().click();
    await wait(2000);
    await p.screenshot({ path: path.join(OUT, "admin-cliente-perfil.png") });
    console.log("perfil ✓");
  }
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
