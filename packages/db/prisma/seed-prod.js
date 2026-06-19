// Seed de PRODUCCIÓN — idempotente y seguro.
// A diferencia de seed.js (demo), este NO borra nada y NO crea datos de ejemplo.
// Solo garantiza la base mínima para operar: 1 cancha + tarifas, mesas y usuarios staff.
// Se puede correr en cada despliegue sin riesgo (usa upsert / guard por conteo).
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // ── Cancha (solo si no hay ninguna) ──
  let cancha = await prisma.cancha.findFirst();
  if (!cancha) {
    cancha = await prisma.cancha.create({
      data: { nombre: "Cancha Principal", tipo: "Futbol 5", activa: true },
    });
    await prisma.tarifa.createMany({
      data: [
        { canchaId: cancha.id, diaSemana: null, horaInicio: "06:00", horaFin: "17:00", precio: 70000, tipo: "VALLE" },
        { canchaId: cancha.id, diaSemana: null, horaInicio: "17:00", horaFin: "23:00", precio: 110000, tipo: "PICO" },
        { canchaId: cancha.id, diaSemana: 0, horaInicio: "06:00", horaFin: "23:00", precio: 120000, tipo: "PICO" },
        { canchaId: cancha.id, diaSemana: 6, horaInicio: "06:00", horaFin: "23:00", precio: 120000, tipo: "PICO" },
      ],
    });
    console.log("✔ Cancha + tarifas iniciales creadas (ajustar precios reales en producción).");
  }

  // ── Mesas (solo si no hay ninguna) ──
  if ((await prisma.mesa.count()) === 0) {
    await prisma.mesa.createMany({
      data: [
        { nombre: "Mesa 1", capacidad: 4 },
        { nombre: "Mesa 2", capacidad: 4 },
        { nombre: "Mesa 3", capacidad: 6 },
        { nombre: "Mesa VIP", capacidad: 8 },
      ],
    });
    console.log("✔ Mesas iniciales creadas.");
  }

  // ── Usuarios staff (upsert por email). Contraseñas vienen de variables de entorno. ──
  const adminEmail = process.env.ADMIN_EMAIL || "admin@palcotejo.co";
  const adminPass = process.env.ADMIN_PASSWORD || "cambiar123";
  const cajaEmail = process.env.CAJA_EMAIL || "caja@palcotejo.co";
  const cajaPass = process.env.CAJA_PASSWORD || "cambiar123";

  await prisma.usuarioStaff.upsert({
    where: { email: adminEmail },
    update: {},
    create: { nombre: "Administrador", email: adminEmail, passwordHash: bcrypt.hashSync(adminPass, 10), rol: "ADMIN" },
  });
  await prisma.usuarioStaff.upsert({
    where: { email: cajaEmail },
    update: {},
    create: { nombre: "Cajero", email: cajaEmail, passwordHash: bcrypt.hashSync(cajaPass, 10), rol: "CAJA" },
  });
  console.log(`✔ Usuarios staff asegurados (${adminEmail}, ${cajaEmail}).`);

  console.log("✔ Seed de producción completado (idempotente, sin datos demo).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
