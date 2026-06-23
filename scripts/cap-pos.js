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

  await p.goto(`${BASE}/admin/bar`, { waitUntil: "networkidle" });
  await wait(1500);
  // Abrir una cuenta
  await p.getByPlaceholder(/Mesa . nombre/).fill("Mesa 5");
  await p.getByRole("button", { name: /\+ Abrir/ }).click();
  await wait(1200);
  // Agregar un par de productos
  const botones = p.locator("button.btn-outline");
  const n = await botones.count();
  for (let i = 0; i < Math.min(3, n); i++) {
    const txt = await botones.nth(i).innerText().catch(() => "");
    if (txt.includes("·")) { await botones.nth(i).click(); await wait(500); }
  }
  await wait(800);
  await p.screenshot({ path: path.join(OUT, "admin-pos.png"), fullPage: true });
  console.log("pos ✓");
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
