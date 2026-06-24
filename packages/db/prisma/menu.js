// Menú real PAL COTEJO. Carga única e idempotente (guard por "Águila").
// Cervezas: producto base en UNIDADES + presentaciones (1/2 petaco=15, petaco=30, six=6)
// que comparten el stock del base (stockBaseId). Al vender una presentación, el stock
// del base baja por unidades × cantidad.
async function cargarMenu(prisma, { demo = false } = {}) {
  // Ya cargado → no hacer nada
  if (await prisma.producto.findFirst({ where: { nombre: "Águila" } })) return;

  const st = (n) => (demo ? n : 0); // en demo cargamos stock; en producción arranca en 0

  // Quitar productos de ejemplo previos (borrar si no tienen ventas; si tienen, desactivar)
  const ejemplos = [
    "Cerveza nacional", "Cerveza importada", "Gaseosa", "Agua",
    "Aguardiente (botella)", "Picada personal", "Alitas x6", "Hamburguesa",
  ];
  for (const nombre of ejemplos) {
    const p = await prisma.producto.findFirst({ where: { nombre } });
    if (!p) continue;
    const ventas = await prisma.itemCuenta.count({ where: { productoId: p.id } });
    if (ventas === 0) await prisma.producto.delete({ where: { id: p.id } });
    else await prisma.producto.update({ where: { id: p.id }, data: { activo: false } });
  }

  // ── Cervezas con presentaciones ──
  const cervezas = [
    { nombre: "Águila", precio: 5000, half: 70000, petaco: 120000 },
    { nombre: "Águila Light", precio: 5000, half: 70000, petaco: 120000 },
    { nombre: "Poker", precio: 5000, half: 70000, petaco: 120000 },
    { nombre: "Club Colombia", precio: 6000, half: 80000, petaco: 140000 },
  ];
  for (const c of cervezas) {
    const base = await prisma.producto.create({
      data: { nombre: c.nombre, categoria: "BEBIDA", precio: c.precio, unidades: 1, stock: st(90), stockMinimo: 30 },
    });
    await prisma.producto.create({ data: { nombre: `${c.nombre} 1/2 Petaco`, categoria: "BEBIDA", precio: c.half, unidades: 15, stockBaseId: base.id } });
    await prisma.producto.create({ data: { nombre: `${c.nombre} Petaco`, categoria: "BEBIDA", precio: c.petaco, unidades: 30, stockBaseId: base.id } });
  }

  // Coronas por six
  const coronita = await prisma.producto.create({ data: { nombre: "Coronita", categoria: "BEBIDA", precio: 6000, unidades: 1, stock: st(48), stockMinimo: 24 } });
  await prisma.producto.create({ data: { nombre: "Coronita Six", categoria: "BEBIDA", precio: 30000, unidades: 6, stockBaseId: coronita.id } });
  const corona = await prisma.producto.create({ data: { nombre: "Corona", categoria: "BEBIDA", precio: 10000, unidades: 1, stock: st(48), stockMinimo: 24 } });
  await prisma.producto.create({ data: { nombre: "Corona Six", categoria: "BEBIDA", precio: 50000, unidades: 6, stockBaseId: corona.id } });

  // ── Bebidas sin alcohol ──
  await prisma.producto.createMany({
    data: [
      { nombre: "Agua", categoria: "BEBIDA", precio: 3000, stock: st(40), stockMinimo: 12 },
      { nombre: "Gatorade", categoria: "BEBIDA", precio: 6000, stock: st(30), stockMinimo: 12 },
      { nombre: "Coca-Cola", categoria: "BEBIDA", precio: 5000, stock: st(40), stockMinimo: 12 },
    ],
  });

  // ── Snacks ──
  await prisma.producto.createMany({
    data: [
      { nombre: "Todo Rico", categoria: "OTRO", precio: 5000, stock: st(20), stockMinimo: 6 },
      { nombre: "Todo Rico Grande", categoria: "OTRO", precio: 15000, stock: st(15), stockMinimo: 6 },
      { nombre: "Choclitos y Arepa", categoria: "OTRO", precio: 2000, stock: st(25), stockMinimo: 6 },
      { nombre: "Papas Margarita", categoria: "OTRO", precio: 4000, stock: st(25), stockMinimo: 6 },
    ],
  });

  console.log("✔ Menú PAL COTEJO cargado (cervezas con presentaciones + bebidas + snacks).");
}

module.exports = { cargarMenu };
