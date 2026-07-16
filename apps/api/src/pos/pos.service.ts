import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AbrirCuentaDto, ActualizarProductoDto, AgregarItemDto, CrearProductoDto } from "./dto";
import { NotificacionesService } from "../notificaciones/notificaciones.service";

@Injectable()
export class PosService {
  constructor(
    private prisma: PrismaService,
    private notificaciones: NotificacionesService,
  ) {}

  // ── Catálogo de productos ──
  listarProductos(soloActivos = true) {
    return this.prisma.producto.findMany({
      where: soloActivos ? { activo: true } : {},
      include: { stockBase: { select: { nombre: true } } },
      orderBy: [{ categoria: "asc" }, { stockBaseId: "asc" }, { unidades: "asc" }, { nombre: "asc" }],
    });
  }
  async crearProducto(dto: CrearProductoDto) {
    const nombre = dto.nombre.trim();
    if (await this.nombreProductoEnUso(nombre)) {
      throw new ConflictException("Ya existe un producto con ese nombre");
    }
    return this.prisma.producto.create({ data: { ...dto, nombre } });
  }

  // ¿Nombre de producto ya en uso (case-insensitive)? Excluye opcionalmente un id (al editar).
  private async nombreProductoEnUso(nombre: string, exceptId?: string) {
    const existe = await this.prisma.producto.findFirst({
      where: {
        nombre: { equals: nombre.trim(), mode: "insensitive" },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { id: true },
    });
    return !!existe;
  }
  async actualizarProducto(id: string, dto: ActualizarProductoDto) {
    const existe = await this.prisma.producto.findUnique({ where: { id }, select: { id: true } });
    if (!existe) throw new NotFoundException("Producto no encontrado");
    const nombre = dto.nombre?.trim();
    if (nombre && (await this.nombreProductoEnUso(nombre, id))) {
      throw new ConflictException("Ya existe un producto con ese nombre");
    }
    return this.prisma.producto.update({ where: { id }, data: nombre ? { ...dto, nombre } : dto });
  }
  desactivarProducto(id: string) {
    return this.prisma.producto.update({ where: { id }, data: { activo: false } });
  }

  // ── Cuentas (consumos) ──
  // Mesas activas del catálogo (para abrir cuentas por mesa formal).
  listarMesas() {
    return this.prisma.mesa.findMany({
      where: { activa: true },
      select: { id: true, nombre: true, capacidad: true },
      orderBy: { nombre: "asc" },
    });
  }

  // Métodos de cobro ACTIVOS para el POS (lectura A·S·C). El CRUD del catálogo es admin.
  listarMetodosCobro() {
    return this.prisma.metodoCobro.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, codigo: true, verificacion: true, activo: true, orden: true },
      orderBy: [{ orden: { sort: "asc", nulls: "last" } }, { nombre: "asc" }],
    });
  }

  async abrirCuenta(dto: AbrirCuentaDto) {
    if (!dto.mesa && !dto.mesaId && !dto.reservaId && !dto.clienteId) {
      throw new BadRequestException("Indica al menos una mesa, reserva o cliente");
    }
    let mesaTexto = dto.mesa;
    if (dto.mesaId) {
      const mesa = await this.prisma.mesa.findUnique({
        where: { id: dto.mesaId },
        select: { id: true, nombre: true, activa: true },
      });
      if (!mesa) throw new NotFoundException("Mesa no encontrada");
      if (!mesa.activa) throw new BadRequestException("La mesa no está activa");
      // Regla: una sola cuenta ABIERTA por mesa formal.
      const abierta = await this.prisma.cuenta.findFirst({
        where: { mesaId: dto.mesaId, estado: "ABIERTA" },
        select: { id: true },
      });
      if (abierta) throw new ConflictException("La mesa ya tiene una cuenta abierta");
      mesaTexto = mesa.nombre; // snapshot para recibo/etiquetas que leen cuenta.mesa
    }
    return this.prisma.cuenta.create({
      data: { mesa: mesaTexto, mesaId: dto.mesaId, reservaId: dto.reservaId, clienteId: dto.clienteId },
    });
  }

  cuentasAbiertas() {
    return this.prisma.cuenta.findMany({
      where: { estado: "ABIERTA" },
      include: {
        items: { include: { producto: { select: { nombre: true } } } },
        cliente: { select: { nombre: true } },
      },
      orderBy: { abiertaEn: "asc" },
    });
  }

  async obtenerCuenta(id: string) {
    const cuenta = await this.prisma.cuenta.findUnique({
      where: { id },
      include: {
        items: { include: { producto: { select: { nombre: true } } }, orderBy: { id: "asc" } },
        cliente: { select: { nombre: true, telefono: true } },
        reserva: { select: { fecha: true, horaInicio: true } },
      },
    });
    if (!cuenta) throw new NotFoundException("Cuenta no encontrada");
    return cuenta;
  }

  private async recalcularTotal(cuentaId: string) {
    const items = await this.prisma.itemCuenta.findMany({
      where: { cuentaId },
      select: { subtotal: true },
    });
    const total = items.reduce((s, i) => s + i.subtotal, 0);
    await this.prisma.cuenta.update({ where: { id: cuentaId }, data: { total } });
    return total;
  }

  async agregarItem(cuentaId: string, dto: AgregarItemDto) {
    const cuenta = await this.prisma.cuenta.findUnique({ where: { id: cuentaId } });
    if (!cuenta) throw new NotFoundException("Cuenta no encontrada");
    if (cuenta.estado !== "ABIERTA") throw new BadRequestException("La cuenta no está abierta");

    const producto = await this.prisma.producto.findUnique({ where: { id: dto.productoId } });
    if (!producto) throw new NotFoundException("Producto no encontrado");

    const cantidad = dto.cantidad ?? 1;
    // Si el producto ya está en la cuenta, incrementa; si no, crea un renglón.
    const existente = await this.prisma.itemCuenta.findFirst({
      where: { cuentaId, productoId: dto.productoId },
    });
    if (existente) {
      const nuevaCant = existente.cantidad + cantidad;
      await this.prisma.itemCuenta.update({
        where: { id: existente.id },
        data: { cantidad: nuevaCant, subtotal: nuevaCant * existente.precioUnit },
      });
    } else {
      await this.prisma.itemCuenta.create({
        data: {
          cuentaId,
          productoId: producto.id,
          cantidad,
          precioUnit: producto.precio,
          subtotal: producto.precio * cantidad,
        },
      });
    }
    await this.recalcularTotal(cuentaId);
    return this.obtenerCuenta(cuentaId);
  }

  async quitarItem(itemId: string) {
    const item = await this.prisma.itemCuenta.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException("Renglón no encontrado");
    await this.prisma.itemCuenta.delete({ where: { id: itemId } });
    await this.recalcularTotal(item.cuentaId);
    return this.obtenerCuenta(item.cuentaId);
  }

  async cobrar(id: string, metodoPago: string) {
    const cuenta = await this.prisma.cuenta.findUnique({ where: { id }, include: { items: true } });
    if (!cuenta) throw new NotFoundException("Cuenta no encontrada");
    if (cuenta.estado !== "ABIERTA") throw new BadRequestException("La cuenta ya fue cerrada");
    if (cuenta.items.length === 0) throw new BadRequestException("La cuenta no tiene productos");

    // Validar el método contra el catálogo ACTIVO (case-insensitive). Se guarda el
    // codigo canónico del catálogo (no el string crudo) para que el arqueo lo reconozca
    // sin ambigüedad de mayúsculas.
    const metodo = await this.prisma.metodoCobro.findFirst({
      where: { codigo: { equals: metodoPago, mode: "insensitive" }, activo: true },
      select: { codigo: true },
    });
    if (!metodo) throw new BadRequestException("Método de pago no válido");

    // Exigir caja abierta: sin sesión no se puede cobrar (no cuadraría en el arqueo).
    const sesion = await this.prisma.sesionCaja.findFirst({ where: { estado: "ABIERTA" }, select: { id: true } });
    if (!sesion) throw new ConflictException("Abre la caja antes de cobrar");

    // Cobrar + descontar inventario (venta) en una sola transacción (todo o nada).
    return this.prisma.$transaction(async (tx) => {
      // Resolver cada ítem a su producto (nombre/unidades/base). El stock vive en la base.
      const resueltos = await Promise.all(
        cuenta.items.map(async (it) => {
          const prod = await tx.producto.findUnique({
            where: { id: it.productoId },
            select: { id: true, nombre: true, unidades: true, stockBaseId: true },
          });
          return prod ? { prod, cantidad: it.cantidad } : null;
        }),
      );
      const items = resueltos.filter((r): r is NonNullable<typeof r> => r !== null);

      // Demanda total de stock POR BASE (las presentaciones suman a su base).
      const demandaPorBase = new Map<string, number>();
      for (const { prod, cantidad } of items) {
        const baseId = prod.stockBaseId ?? prod.id;
        demandaPorBase.set(baseId, (demandaPorBase.get(baseId) ?? 0) + prod.unidades * cantidad);
      }

      // GUARD: leer cada base UNA vez (stock + flag + nombre) y evaluar TODAS.
      // Bloquea si la demanda supera el stock y la base NO permite vender sin stock.
      const bases = await tx.producto.findMany({
        where: { id: { in: [...demandaPorBase.keys()] } },
        select: { id: true, nombre: true, stock: true, permitirSinStock: true },
      });
      const sinStock = bases
        .filter((b) => (demandaPorBase.get(b.id) ?? 0) > b.stock && !b.permitirSinStock)
        .map((b) => b.nombre);
      if (sinStock.length > 0) {
        // Throw dentro de la transacción → rollback total: la cuenta NO pasa a PAGADA,
        // no se descuenta stock, no se crean movimientos. Todo o nada.
        throw new BadRequestException(`Sin stock suficiente de: ${sinStock.join(", ")}.`);
      }

      // Guard superado → cobrar y descontar (igual que antes).
      const pagada = await tx.cuenta.update({
        where: { id },
        data: { estado: "PAGADA", metodoPago: metodo.codigo, cerradaEn: new Date(), sesionCajaId: sesion.id },
      });
      for (const { prod, cantidad } of items) {
        const baseId = prod.stockBaseId ?? prod.id;
        const descuento = prod.unidades * cantidad;
        await tx.producto.update({ where: { id: baseId }, data: { stock: { decrement: descuento } } });
        await tx.movimientoInventario.create({
          data: { productoId: baseId, tipo: "SALIDA", cantidad: descuento, motivo: `Venta ${prod.nombre} ×${cantidad} · cuenta ${id.slice(-6)}` },
        });
      }
      return pagada;
    });
  }

  /** Registra una entrada de inventario (compra/reposición). El stock se suma al producto base. */
  async entradaInventario(productoId: string, cantidad: number, motivo?: string) {
    const producto = await this.prisma.producto.findUnique({ where: { id: productoId } });
    if (!producto) throw new NotFoundException("Producto no encontrado");
    const baseId = producto.stockBaseId ?? producto.id;
    const [actualizado] = await this.prisma.$transaction([
      this.prisma.producto.update({ where: { id: baseId }, data: { stock: { increment: cantidad } } }),
      this.prisma.movimientoInventario.create({
        data: { productoId: baseId, tipo: "ENTRADA", cantidad, motivo: motivo || "Entrada de inventario" },
      }),
    ]);
    return actualizado;
  }

  /** Valor del inventario (a precio de venta) por producto base + total. */
  async valorInventario() {
    const bases = await this.prisma.producto.findMany({
      where: { stockBaseId: null, activo: true },
      orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
    });
    const items = bases.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria,
      stock: p.stock,
      precio: p.precio,
      valor: p.stock * p.precio,
      bajo: p.stock <= p.stockMinimo,
    }));
    return {
      valorTotal: items.reduce((s, i) => s + i.valor, 0),
      unidadesTotales: items.reduce((s, i) => s + i.stock, 0),
      productosBajos: items.filter((i) => i.bajo).length,
      items,
    };
  }

  /** Historial de movimientos de inventario (kardex). */
  async movimientos(limit = 150) {
    const movs = await this.prisma.movimientoInventario.findMany({
      take: Math.min(500, limit),
      orderBy: { creadoEn: "desc" },
      include: { producto: { select: { nombre: true } } },
    });
    return movs.map((m) => ({
      id: m.id,
      fecha: m.creadoEn,
      producto: m.producto?.nombre ?? "—",
      tipo: m.tipo,
      cantidad: m.cantidad,
      motivo: m.motivo ?? "",
    }));
  }

  /** Productos base activos con stock en o por debajo del mínimo. */
  async productosBajoStock() {
    const productos = await this.prisma.producto.findMany({ where: { activo: true, stockBaseId: null } });
    return productos.filter((p) => p.stock <= p.stockMinimo);
  }

  /** Borra un producto por completo, solo si no tiene ventas ni presentaciones. */
  async eliminarProducto(id: string) {
    const ventas = await this.prisma.itemCuenta.count({ where: { productoId: id } });
    if (ventas > 0) throw new BadRequestException("El producto tiene ventas registradas. Use 'Desactivar'.");
    const pres = await this.prisma.producto.count({ where: { stockBaseId: id } });
    if (pres > 0) throw new BadRequestException("Tiene presentaciones asociadas. Elimínalas primero.");
    await this.prisma.producto.delete({ where: { id } });
    return { ok: true };
  }

  async anular(id: string, rol: string) {
    const cuenta = await this.prisma.cuenta.findUnique({
      where: { id },
      select: { estado: true },
    });
    if (!cuenta) throw new NotFoundException("Cuenta no encontrada");
    // Solo ADMIN puede anular una cuenta ya cobrada; S/C solo cuentas abiertas.
    if (cuenta.estado === "PAGADA" && rol !== "ADMIN") {
      throw new ForbiddenException("Solo un administrador puede anular una cuenta ya cobrada");
    }
    return this.prisma.cuenta.update({
      where: { id },
      data: { estado: "ANULADA", cerradaEn: new Date() },
    });
  }

  // ── Reporte de ventas del bar ──
  /**
   * Cobra (total o parcial) el saldo de una reserva ligándolo a la caja como una
   * Cuenta PAGADA más — así el arqueo lo cuenta con la MISMA lógica (verificacion=CAJON),
   * sin tocar cerrarCaja. Cada abono queda en la sesión abierta en ESE momento.
   */
  async cobrarReserva(reservaId: string, metodoPago: string, monto?: number) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id: reservaId },
      select: {
        id: true, estado: true, montoTotal: true, montoAbonado: true,
        cliente: { select: { nombre: true } },
        cancha: { select: { nombre: true } },
      },
    });
    if (!reserva) throw new NotFoundException("Reserva no encontrada");

    // Saldo real (recomputado, no confiamos en un campo posiblemente desincronizado).
    const saldo = reserva.montoTotal - reserva.montoAbonado;
    if (saldo <= 0) throw new BadRequestException("La reserva ya está saldada");

    // Exigir caja abierta (igual que el cobro del POS).
    const sesion = await this.prisma.sesionCaja.findFirst({ where: { estado: "ABIERTA" }, select: { id: true } });
    if (!sesion) throw new ConflictException("Abre la caja antes de cobrar");

    // Validar método contra el catálogo ACTIVO; guardar código canónico (para el arqueo).
    const metodo = await this.prisma.metodoCobro.findFirst({
      where: { codigo: { equals: metodoPago, mode: "insensitive" }, activo: true },
      select: { codigo: true, nombre: true },
    });
    if (!metodo) throw new BadRequestException("Método de pago no válido");

    // Monto: omitido = saldo completo; validar rango.
    const aCobrar = monto == null ? saldo : monto;
    if (!Number.isInteger(aCobrar) || aCobrar <= 0) {
      throw new BadRequestException("El monto debe ser un entero mayor a 0");
    }
    if (aCobrar > saldo) {
      throw new BadRequestException(`El monto supera el saldo (saldo: $${saldo})`);
    }

    const etiqueta = `Reserva ${reserva.cancha.nombre} · ${reserva.cliente.nombre}`;
    const nuevoAbonado = reserva.montoAbonado + aCobrar;
    const nuevoSaldo = reserva.montoTotal - nuevoAbonado;
    // Un abono/pago aprobado confirma una reserva que estaba PENDIENTE; el resto de
    // estados no se tocan (no inventamos un estado nuevo).
    const nuevoEstado = reserva.estado === "PENDIENTE" ? "CONFIRMADA" : reserva.estado;

    // Todo o nada: si algo falla, ni se crea la Cuenta ni se mueve el saldo.
    const out = await this.prisma.$transaction(async (tx) => {
      // Cuenta PAGADA sin items → no descuenta stock (no hay productos). Nace PAGADA,
      // así que NO aparece en el salón ni en cuentas abiertas (esas filtran ABIERTA).
      const cuenta = await tx.cuenta.create({
        data: {
          reservaId: reserva.id,
          estado: "PAGADA",
          total: aCobrar,
          metodoPago: metodo.codigo,
          sesionCajaId: sesion.id,
          mesa: etiqueta,
          cerradaEn: new Date(),
        },
        select: { id: true },
      });
      const r = await tx.reserva.update({
        where: { id: reserva.id },
        data: { montoAbonado: nuevoAbonado, saldo: nuevoSaldo, estado: nuevoEstado },
        select: { montoTotal: true, montoAbonado: true, saldo: true, estado: true },
      });
      return { cuentaId: cuenta.id, ...r };
    });

    // Recibo del cobro (nombre amigable del método para el cliente).
    return {
      cuentaId: out.cuentaId,
      reservaId: reserva.id,
      cobro: aCobrar,
      metodo: metodo.nombre,
      metodoCodigo: metodo.codigo,
      montoTotal: out.montoTotal,
      montoAbonado: out.montoAbonado,
      saldo: out.saldo,
      estado: out.estado,
      reserva: { cancha: reserva.cancha.nombre, cliente: reserva.cliente.nombre },
    };
  }

  async reporte() {
    const OFFSET = 5 * 3600 * 1000;
    const fechaCol = new Date(Date.now() - OFFSET).toISOString().slice(0, 10);
    const inicioHoy = new Date(`${fechaCol}T00:00:00`);
    const hace7 = new Date(inicioHoy);
    hace7.setDate(inicioHoy.getDate() - 6);

    const [pagadasHoy, pagadasSemana, abiertas] = await Promise.all([
      this.prisma.cuenta.findMany({ where: { estado: "PAGADA", cerradaEn: { gte: inicioHoy } }, select: { total: true } }),
      this.prisma.cuenta.findMany({ where: { estado: "PAGADA", cerradaEn: { gte: hace7 } }, select: { total: true } }),
      this.prisma.cuenta.count({ where: { estado: "ABIERTA" } }),
    ]);

    // Top productos (por cantidad) entre cuentas pagadas
    const items = await this.prisma.itemCuenta.findMany({
      where: { cuenta: { estado: "PAGADA" } },
      include: { producto: { select: { nombre: true } } },
    });
    const mapa = new Map<string, { nombre: string; cantidad: number; ingresos: number }>();
    for (const it of items) {
      const cur = mapa.get(it.productoId) ?? { nombre: it.producto.nombre, cantidad: 0, ingresos: 0 };
      cur.cantidad += it.cantidad;
      cur.ingresos += it.subtotal;
      mapa.set(it.productoId, cur);
    }
    const topProductos = Array.from(mapa.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    return {
      ventasHoy: pagadasHoy.reduce((s, c) => s + c.total, 0),
      ventasSemana: pagadasSemana.reduce((s, c) => s + c.total, 0),
      cuentasAbiertas: abiertas,
      cuentasHoy: pagadasHoy.length,
      topProductos,
    };
  }

  // ── Caja (sesión / turno) ──
  async abrirCaja(usuarioId: string, montoInicial: number) {
    const abierta = await this.prisma.sesionCaja.findFirst({ where: { estado: "ABIERTA" }, select: { id: true } });
    if (abierta) throw new ConflictException("Ya hay una caja abierta");
    return this.prisma.sesionCaja.create({
      data: { usuarioAperturaId: usuarioId, montoInicial, estado: "ABIERTA" },
    });
  }

  // Cierre a ciegas: el POS NO ve ventas ni esperado. Solo datos base de la sesión.
  // Los montos los consulta el ADMIN en el módulo histórico (endpoint aparte).
  async cajaActual() {
    return this.prisma.sesionCaja.findFirst({
      where: { estado: "ABIERTA" },
      select: {
        id: true,
        abiertaEn: true,
        montoInicial: true,
        estado: true,
        usuarioAperturaId: true,
      },
    });
  }

  // Cierre + arqueo. Congela montoEsperado/contado/diferencia. Exige nota si descuadra.
  async cerrarCaja(usuarioId: string, montoContado: number, nota?: string) {
    const sesion = await this.prisma.sesionCaja.findFirst({ where: { estado: "ABIERTA" } });
    if (!sesion) throw new ConflictException("No hay caja abierta");

    // Qué codigos cuentan al cajón (verificacion = CAJON). Se lee el catálogo COMPLETO
    // (incluidos archivados): el arqueo respeta la verificacion del método con el que se
    // cobró, aunque se archive a mitad de sesión → no descuadra ventas ya hechas.
    const metodosCajon = await this.prisma.metodoCobro.findMany({
      where: { verificacion: "CAJON" },
      select: { codigo: true },
    });
    const codigosCajon = new Set(metodosCajon.map((m) => m.codigo));

    // Ventas de la sesión agrupadas por método (solo PAGADA).
    const porMetodo = await this.prisma.cuenta.groupBy({
      by: ["metodoPago"],
      where: { sesionCajaId: sesion.id, estado: "PAGADA" },
      _sum: { total: true },
    });
    // Efectivo en cajón = suma de las ventas cuyo método es CAJON.
    const efectivo = porMetodo
      .filter((g) => g.metodoPago != null && codigosCajon.has(g.metodoPago))
      .reduce((acc, g) => acc + (g._sum.total ?? 0), 0);

    // Arqueo: el esperado del cajón es fondo + efectivo (tarjeta/otro no están en caja).
    const montoEsperado = sesion.montoInicial + efectivo;
    const diferencia = montoContado - montoEsperado;

    // Regla de la nota: descuadre exige motivo, o no se cierra.
    if (diferencia !== 0 && !(nota && nota.trim())) {
      const tipo = diferencia > 0 ? "sobrante" : "faltante";
      throw new BadRequestException(
        `Hay una diferencia de $${Math.abs(diferencia)} (${tipo}). Indica el motivo del descuadre.`,
      );
    }

    // Se CONGELA todo en la sesión (para el ADMIN), igual que antes.
    const cerrada = await this.prisma.sesionCaja.update({
      where: { id: sesion.id },
      data: {
        estado: "CERRADA",
        cerradaEn: new Date(),
        usuarioCierreId: usuarioId,
        montoEsperado,
        montoContado,
        diferencia,
        nota: nota?.trim() || null,
      },
    });

    // Alerta al dueño (fire-and-forget, POST-commit; NO dentro de transacción). El servicio
    // decide si dispara según activo + modo (SOLO_DESCUADRE/SIEMPRE) con la diferencia. No
    // afecta el cierre ni la respuesta a ciegas.
    this.notificaciones.dispararAlerta("CAJA_CERRADA", {
      sesionId: sesion.id,
      montoEsperado,
      montoContado,
      diferencia,
      nota: cerrada.nota,
      usuarioCierreId: usuarioId,
      cerradaEn: cerrada.cerradaEn,
    });

    // Cierre a ciegas: la respuesta al cajero solo dice si cuadró y cuánto es la diferencia.
    // El desglose/esperado quedan congelados en la sesión y los ve el ADMIN en el histórico.
    return { cuadrada: cerrada.diferencia === 0, diferencia: cerrada.diferencia };
  }

  // Consulta de una sesión (arqueos pasados).
  async obtenerSesion(id: string) {
    const s = await this.prisma.sesionCaja.findUnique({ where: { id } });
    if (!s) throw new NotFoundException("Sesión de caja no encontrada");
    return s;
  }
}
