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

  // Productos / inventario
  await p.goto(`${BASE}/admin/productos`, { waitUntil: "networkidle" });
  await wait(1500);
  await p.screenshot({ path: path.join(OUT, "admin-inventario.png"), fullPage: true });
  console.log("inventario ✓");

  // POS → abrir cuenta, agregar, cobrar → recibo
  await p.goto(`${BASE}/admin/bar`, { waitUntil: "networkidle" });
  await wait(1200);
  await p.getByPlaceholder(/Mesa . nombre/).fill("Mesa 7");
  await p.getByRole("button", { name: /\+ Abrir/ }).click();
  await wait(1000);
  const botones = p.locator("button.btn-outline");
  const n = await botones.count();
  for (let i = 0; i < n && i < 2; i++) {
    const t = await botones.nth(i).innerText().catch(() => "");
    if (t.includes("·")) { await botones.nth(i).click(); await wait(500); }
  }
  await wait(500);
  await p.getByRole("button", { name: /Efectivo/ }).click();
  await wait(1200);
  await p.screenshot({ path: path.join(OUT, "admin-recibo.png") });
  console.log("recibo ✓");
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
