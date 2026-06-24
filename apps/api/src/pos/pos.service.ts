import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AbrirCuentaDto, ActualizarProductoDto, AgregarItemDto, CrearProductoDto } from "./dto";

@Injectable()
export class PosService {
  constructor(private prisma: PrismaService) {}

  // ── Catálogo de productos ──
  listarProductos(soloActivos = true) {
    return this.prisma.producto.findMany({
      where: soloActivos ? { activo: true } : {},
      include: { stockBase: { select: { nombre: true } } },
      orderBy: [{ categoria: "asc" }, { stockBaseId: "asc" }, { unidades: "asc" }, { nombre: "asc" }],
    });
  }
  crearProducto(dto: CrearProductoDto) {
    return this.prisma.producto.create({ data: dto });
  }
  actualizarProducto(id: string, dto: ActualizarProductoDto) {
    return this.prisma.producto.update({ where: { id }, data: dto });
  }
  desactivarProducto(id: string) {
    return this.prisma.producto.update({ where: { id }, data: { activo: false } });
  }

  // ── Cuentas (consumos) ──
  async abrirCuenta(dto: AbrirCuentaDto) {
    if (!dto.mesa && !dto.reservaId && !dto.clienteId) {
      throw new BadRequestException("Indica al menos una mesa, reserva o cliente");
    }
    return this.prisma.cuenta.create({
      data: { mesa: dto.mesa, reservaId: dto.reservaId, clienteId: dto.clienteId },
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

    // Cobrar + descontar inventario (venta) en una sola transacción.
    return this.prisma.$transaction(async (tx) => {
      const pagada = await tx.cuenta.update({
        where: { id },
        data: { estado: "PAGADA", metodoPago, cerradaEn: new Date() },
      });
      for (const it of cuenta.items) {
        const prod = await tx.producto.findUnique({ where: { id: it.productoId } });
        if (!prod) continue;
        // El stock vive en el producto base (si es una presentación). Descuenta unidades × cantidad.
        const baseId = prod.stockBaseId ?? prod.id;
        const descuento = prod.unidades * it.cantidad;
        await tx.producto.update({ where: { id: baseId }, data: { stock: { decrement: descuento } } });
        await tx.movimientoInventario.create({
          data: { productoId: baseId, tipo: "SALIDA", cantidad: descuento, motivo: `Venta ${prod.nombre} ×${it.cantidad} · cuenta ${id.slice(-6)}` },
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

  async anular(id: string) {
    return this.prisma.cuenta.update({
      where: { id },
      data: { estado: "ANULADA", cerradaEn: new Date() },
    });
  }

  // ── Reporte de ventas del bar ──
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
}
