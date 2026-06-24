// Datos de ejemplo para la DEMO de presentacion.
// Genera canchas, tarifas pico/valle, mesas, clientes y ~8 semanas de reservas
// con una distribucion realista (mas demanda en noches y fines de semana) para
// que el panel de reportes se vea lleno.
// Ejecutar: npm run prisma:seed --workspace @sportbar/db
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { cargarMenu } = require("./menu");

const prisma = new PrismaClient();

function hash(s) {
  return bcrypt.hashSync(s, 10);
}

// PRNG determinista para que la demo sea reproducible.
let _seed = 12345;
function rnd() {
  _seed = (_seed * 1103515245 + 12345) & 0x7fffffff;
  return _seed / 0x7fffffff;
}
function pick(arr) {
  return arr[Math.floor(rnd() * arr.length)];
}

const NOMBRES = [
  "Juan Perez", "Carlos Gomez", "Andres Ruiz", "Felipe Torres", "Mateo Diaz",
  "Santiago Lopez", "David Castro", "Sebastian Mora", "Camilo Rios", "Nicolas Vega",
  "Equipo Los Tigres", "Equipo FC Barrio", "Equipo Halcones", "Daniela Soto", "Laura Niño",
];

async function main() {
  console.log("Limpiando datos previos…");
  await prisma.cuenta.deleteMany(); // cascada borra items_cuenta (libera FK a productos)
  await prisma.reservaMesa.deleteMany();
  await prisma.pago.deleteMany();
  await prisma.reserva.deleteMany();
  await prisma.reservaRecurrente.deleteMany();
  await prisma.bloqueo.deleteMany();
  await prisma.tarifa.deleteMany();
  await prisma.cancha.deleteMany();
  await prisma.mesa.deleteMany();
  await prisma.cliente.deleteMany();

  // ── Canchas ──
  const cancha1 = await prisma.cancha.create({
    data: { nombre: "Cancha Principal", tipo: "Futbol 5", activa: true },
  });
  const canchas = [cancha1];

  // ── Tarifas: valle diurno, pico nocturno, pico fin de semana ──
  for (const cancha of canchas) {
    await prisma.tarifa.createMany({
      data: [
        { canchaId: cancha.id, diaSemana: null, horaInicio: "06:00", horaFin: "17:00", precio: 70000, tipo: "VALLE" },
        { canchaId: cancha.id, diaSemana: null, horaInicio: "17:00", horaFin: "23:00", precio: 110000, tipo: "PICO" },
      ],
    });
    for (const dia of [0, 6]) {
      await prisma.tarifa.create({
        data: { canchaId: cancha.id, diaSemana: dia, horaInicio: "06:00", horaFin: "23:00", precio: 120000, tipo: "PICO" },
      });
    }
  }

  // ── Mesas del sport bar ──
  await prisma.mesa.createMany({
    data: [
      { nombre: "Mesa 1", capacidad: 4 },
      { nombre: "Mesa 2", capacidad: 4 },
      { nombre: "Mesa 3", capacidad: 6 },
      { nombre: "Mesa VIP", capacidad: 8 },
    ],
  });
  const mesas = await prisma.mesa.findMany();

  // ── Catálogo de productos del bar (menú real PAL COTEJO) ──
  await prisma.movimientoInventario.deleteMany();
  await prisma.producto.deleteMany();
  await cargarMenu(prisma, { demo: true });

  // ── Clientes ──
  const clientes = [];
  for (let i = 0; i < NOMBRES.length; i++) {
    const c = await prisma.cliente.create({
      data: {
        nombre: NOMBRES[i],
        telefono: `+5730012${String(10000 + i).slice(-5)}`,
        email: `cliente${i}@correo.com`,
      },
    });
    clientes.push(c);
  }

  // ── Precio segun dia/hora (espejo de las tarifas) ──
  function precioDe(fecha, horaIni) {
    const dia = fecha.getDay();
    const h = parseInt(horaIni.slice(0, 2), 10);
    if (dia === 0 || dia === 6) return 120000; // fin de semana
    return h >= 17 ? 110000 : 70000; // noche pico / dia valle
  }

  // ── Generar ~8 semanas de reservas con distribucion realista ──
  console.log("Generando historial de reservas (demo)…");
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  let totalReservas = 0;

  for (let d = 56; d >= 0; d--) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() - d);
    const dia = fecha.getDay();
    const finde = dia === 0 || dia === 6;

    // Franjas candidatas del dia (mas probabilidad en la noche)
    const franjas = [
      { ini: "08:00", fin: "09:00", p: 0.15 },
      { ini: "10:00", fin: "11:00", p: 0.15 },
      { ini: "16:00", fin: "17:00", p: 0.3 },
      { ini: "17:00", fin: "18:00", p: 0.55 },
      { ini: "18:00", fin: "19:00", p: 0.8 },
      { ini: "19:00", fin: "20:00", p: 0.85 },
      { ini: "20:00", fin: "21:00", p: 0.8 },
      { ini: "21:00", fin: "22:00", p: 0.55 },
    ];

    for (const cancha of canchas) {
      for (const f of franjas) {
        const prob = finde ? Math.min(1, f.p + 0.2) : f.p;
        if (rnd() > prob) continue;

        const cliente = pick(clientes);
        const montoTotal = precioDe(fecha, f.ini);
        const esFuturo = fecha >= hoy;
        // Reservas pasadas = COMPLETADA; futuras = CONFIRMADA
        const estado = esFuturo ? "CONFIRMADA" : "COMPLETADA";
        // 70% pago abono 50%, 30% pago total
        const pagoTotal = rnd() < 0.3;
        const montoAbonado = pagoTotal ? montoTotal : Math.round(montoTotal / 2);
        const saldo = montoTotal - montoAbonado;

        const reserva = await prisma.reserva.create({
          data: {
            canchaId: cancha.id,
            clienteId: cliente.id,
            fecha,
            horaInicio: f.ini,
            horaFin: f.fin,
            estado,
            origen: rnd() < 0.8 ? "WEB" : "MANUAL",
            montoTotal,
            montoAbonado,
            saldo,
            pagos: {
              create: {
                monto: montoAbonado,
                tipo: pagoTotal ? "TOTAL" : "ABONO",
                metodo: pick(["WOMPI_TARJETA", "WOMPI_PSE", "WOMPI_NEQUI"]),
                estado: "APROBADO",
                referenciaPasarela: `demo_${cancha.id.slice(-4)}_${d}_${f.ini}`,
              },
            },
          },
        });

        // ~35% reservan tambien mesa en el bar (venta cruzada)
        if (rnd() < 0.35) {
          await prisma.reservaMesa.create({
            data: {
              reservaId: reserva.id,
              mesaId: pick(mesas).id,
              clienteId: cliente.id,
              fecha,
              hora: f.fin,
              personas: 2 + Math.floor(rnd() * 6),
              estado: "CONFIRMADA",
            },
          });
        }
        totalReservas++;
      }
    }
  }

  // ── Un bloqueo de ejemplo (mantenimiento) ──
  const finde = new Date(hoy);
  finde.setDate(hoy.getDate() + 2);
  await prisma.bloqueo.create({
    data: {
      canchaId: cancha1.id,
      inicio: new Date(finde.toISOString().slice(0, 10) + "T14:00:00"),
      fin: new Date(finde.toISOString().slice(0, 10) + "T16:00:00"),
      motivo: "MANTENIMIENTO",
      nota: "Corte de cesped y limpieza",
    },
  });

  // ── Una reserva recurrente de ejemplo (cliente fijo) ──
  await prisma.reservaRecurrente.create({
    data: {
      canchaId: cancha1.id,
      clienteId: clientes[10].id, // Equipo Los Tigres
      frecuencia: "SEMANAL",
      diaSemana: 3, // miercoles
      horaInicio: "20:00",
      horaFin: "21:00",
      fechaInicio: hoy,
      activa: true,
    },
  });

  // ── Usuarios de staff (contraseñas con bcrypt) ──
  await prisma.usuarioStaff.deleteMany();
  await prisma.usuarioStaff.create({
    data: {
      nombre: "Administrador",
      email: "admin@palcotejo.co",
      passwordHash: hash("admin123"), // CAMBIAR en produccion
      rol: "ADMIN",
    },
  });
  await prisma.usuarioStaff.create({
    data: {
      nombre: "Cajero",
      email: "caja@palcotejo.co",
      passwordHash: hash("caja123"), // CAMBIAR en produccion
      rol: "CAJA",
    },
  });

  console.log(`✔ Seed demo completado: ${canchas.length} cancha(s), ${clientes.length} clientes, ${totalReservas} reservas con pagos, mesas y reportes listos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
