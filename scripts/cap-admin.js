const { chromium } = require("playwright");
const path = require("path");
const OUT = path.join(__dirname, "..", "demo-capturas", "v2");
const BASE = "http://localhost:3000";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1320, height: 900 }, deviceScaleFactor: 1.3 });
  const p = await ctx.newPage();

  await p.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await p.getByPlaceholder("admin@palcotejo.co").fill("admin@palcotejo.co");
  await p.getByPlaceholder("••••••••").fill("admin123");
  await p.getByRole("button", { name: /Iniciar sesión/ }).click();
  await p.waitForURL("**/admin", { timeout: 10000 });
  await wait(2500);
  await p.screenshot({ path: path.join(OUT, "admin-dashboard.png"), fullPage: true });
  console.log("dashboard ✓");

  await p.goto(`${BASE}/admin/bloqueos`, { waitUntil: "networkidle" });
  await wait(2000);
  await p.screenshot({ path: path.join(OUT, "admin-bloqueos.png"), fullPage: true });
  console.log("bloqueos ✓");

  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
