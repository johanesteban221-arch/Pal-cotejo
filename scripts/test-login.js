// Prueba el flujo de login del panel admin con Playwright.
const { chromium } = require("playwright");
const path = require("path");
const OUT = path.join(__dirname, "..", "demo-capturas");
const BASE = "http://localhost:3000";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 460, height: 940 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();

  // 1) Entrar a /admin sin sesión → debe redirigir a login
  await p.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await wait(1200);
  const url1 = p.url();
  console.log("Sin sesión, /admin redirige a:", url1);
  await p.screenshot({ path: path.join(OUT, "auth-1-login.png") });

  // 2) Login con credenciales correctas
  await p.getByPlaceholder("admin@palcotejo.co").fill("admin@palcotejo.co");
  await p.getByPlaceholder("••••••••").fill("admin123");
  await p.getByRole("button", { name: /Iniciar sesión/ }).click();
  await p.waitForURL("**/admin", { timeout: 10000 });
  await wait(2500); // cargar dashboard
  const url2 = p.url();
  console.log("Tras login, estamos en:", url2);
  await p.screenshot({ path: path.join(OUT, "auth-2-dashboard.png"), fullPage: true });

  // 3) Probar credenciales incorrectas (nueva sesión limpia)
  const ctx2 = await browser.newContext({ viewport: { width: 460, height: 940 }, deviceScaleFactor: 2 });
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await p2.getByPlaceholder("admin@palcotejo.co").fill("admin@palcotejo.co");
  await p2.getByPlaceholder("••••••••").fill("claveincorrecta");
  await p2.getByRole("button", { name: /Iniciar sesión/ }).click();
  await wait(1500);
  await p2.screenshot({ path: path.join(OUT, "auth-3-error.png") });
  const errVisible = await p2.locator("text=/incorrecto/i").count();
  console.log("Mensaje de error mostrado:", errVisible > 0 ? "SÍ ✓" : "NO");

  await browser.close();
  console.log("Listo. Capturas en demo-capturas/auth-*.png");
}
main().catch((e) => { console.error(e); process.exit(1); });
