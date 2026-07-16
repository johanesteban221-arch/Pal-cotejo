import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ConteoService {
  constructor(private prisma: PrismaService) {}

  // Vista A CIEGAS del conteo: cada línea trae el producto y lo contado, NUNCA el
  // stockEsperado ni la diferencia (el cajero no debe verlos). La omisión se hace en
  // el `select` → el esperado ni siquiera sale de la DB.
  private async obtenerCiego(id: string) {
    return this.prisma.conteoInventario.findUnique({
      where: { id },
      select: {
        id: true,
        estado: true,
        abiertoEn: true,
        usuarioAperturaId: true,
        lineas: {
          select: {
            id: true,
            productoId: true,
            stockContado: true,
            producto: { select: { nombre: true, categoria: true } },
          },
          orderBy: { producto: { nombre: "asc" } },
        },
      },
    });
  }

  // Abre un conteo. UNO A LA VEZ: si hay uno ABIERTO o PENDIENTE_REVISION → 409.
  async abrir(usuarioId: string) {
    const enCurso = await this.prisma.conteoInventario.findFirst({
      where: { estado: { in: ["ABIERTO", "PENDIENTE_REVISION"] } },
      select: { id: true },
    });
    if (enCurso) throw new ConflictException("Ya hay un conteo en curso");

    // Solo productos base activos (tienen stock propio). Congela stockEsperado = stock actual.
    const bases = await this.prisma.producto.findMany({
      where: { stockBaseId: null, activo: true },
      select: { id: true, stock: true },
      orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
    });
    if (bases.length === 0) throw new BadRequestException("No hay productos base activos para contar");

    const conteo = await this.prisma.conteoInventario.create({
      data: {
        usuarioAperturaId: usuarioId,
        estado: "ABIERTO",
        lineas: { create: bases.map((b) => ({ productoId: b.id, stockEsperado: b.stock })) },
      },
      select: { id: true },
    });
    return this.obtenerCiego(conteo.id);
  }

  // El conteo ABIERTO actual (o null), a ciegas, para que el cajero siga contando.
  async actual() {
    const conteo = await this.prisma.conteoInventario.findFirst({
      where: { estado: "ABIERTO" },
      select: { id: true },
    });
    return conteo ? this.obtenerCiego(conteo.id) : null;
  }

  // Guarda lo contado de una línea. Solo con el conteo ABIERTO. No devuelve esperado/diferencia.
  async guardarLinea(lineaId: string, stockContado: number) {
    const linea = await this.prisma.conteoLinea.findUnique({
      where: { id: lineaId },
      select: { id: true, conteo: { select: { estado: true } } },
    });
    if (!linea) throw new NotFoundException("Línea de conteo no encontrada");
    if (linea.conteo.estado !== "ABIERTO") throw new BadRequestException("El conteo no está abierto");

    await this.prisma.conteoLinea.update({ where: { id: lineaId }, data: { stockContado } });
    return { id: lineaId, stockContado };
  }

  // Envía a revisión: exige TODAS las líneas contadas, fija la diferencia por línea y
  // pasa a PENDIENTE_REVISION. La respuesta al cajero sigue a ciegas.
  async enviar() {
    const conteo = await this.prisma.conteoInventario.findFirst({
      where: { estado: "ABIERTO" },
      select: { id: true, lineas: { select: { id: true, stockContado: true, stockEsperado: true } } },
    });
    if (!conteo) throw new BadRequestException("No hay un conteo abierto");

    const faltan = conteo.lineas.filter((l) => l.stockContado == null).length;
    if (faltan > 0) {
      throw new BadRequestException(`Faltan ${faltan} producto(s) por contar. El conteo debe estar completo.`);
    }

    await this.prisma.$transaction([
      ...conteo.lineas.map((l) =>
        this.prisma.conteoLinea.update({
          where: { id: l.id },
          data: { diferencia: (l.stockContado as number) - l.stockEsperado },
        }),
      ),
      this.prisma.conteoInventario.update({
        where: { id: conteo.id },
        data: { estado: "PENDIENTE_REVISION" },
      }),
    ]);

    return { enviado: true, estado: "PENDIENTE_REVISION" };
  }

  // ── Revisión y ajuste (ADMIN/SUPERVISOR) ──

  // Conteos en revisión, para que el admin elija cuál abrir.
  pendientes() {
    return this.prisma.conteoInventario.findMany({
      where: { estado: "PENDIENTE_REVISION" },
      select: { id: true, abiertoEn: true, usuarioAperturaId: true, _count: { select: { lineas: true } } },
      orderBy: { abiertoEn: "desc" },
    });
  }

  // Vista COMPLETA para el admin: SÍ incluye stockEsperado y diferencia (tiene derecho a verlo).
  // Ordena por |diferencia| desc (las diferencias grandes primero).
  async revision(id: string) {
    const conteo = await this.prisma.conteoInventario.findUnique({
      where: { id },
      select: {
        id: true, estado: true, abiertoEn: true, usuarioAperturaId: true,
        usuarioRevisionId: true, revisadoEn: true, nota: true,
        lineas: {
          select: {
            id: true, productoId: true, stockEsperado: true, stockContado: true,
            diferencia: true, ajustado: true,
            producto: { select: { nombre: true, categoria: true } },
          },
        },
      },
    });
    if (!conteo) throw new NotFoundException("Conteo no encontrado");
    conteo.lineas.sort((a, b) => Math.abs(b.diferencia ?? 0) - Math.abs(a.diferencia ?? 0));
    return conteo;
  }

  // Aplica el ajuste de UNA línea (aprobación por línea). Toca el stock real.
  async ajustarLinea(conteoId: string, lineaId: string, usuarioRevisionId: string) {
    const linea = await this.prisma.conteoLinea.findUnique({
      where: { id: lineaId },
      select: {
        id: true, conteoId: true, productoId: true, ajustado: true,
        stockEsperado: true, stockContado: true, diferencia: true,
        conteo: { select: { estado: true } },
      },
    });
    if (!linea || linea.conteoId !== conteoId) throw new NotFoundException("Línea de conteo no encontrada");
    if (linea.conteo.estado !== "PENDIENTE_REVISION") throw new BadRequestException("El conteo no está en revisión");
    if (linea.ajustado) throw new BadRequestException("Esta línea ya fue ajustada");
    if (linea.diferencia == null || linea.diferencia === 0) {
      throw new BadRequestException("La línea no tiene diferencia que ajustar");
    }

    const diff = linea.diferencia;
    const signo = diff > 0 ? `+${diff}` : `${diff}`;
    const motivo = `Conteo #${conteoId.slice(-6)}: ${linea.stockEsperado}→${linea.stockContado} (${signo}) · rev:${usuarioRevisionId.slice(-6)}`;

    // Todo o nada: stock += diferencia (delta) + movimiento AJUSTE + marcar la línea.
    const [prod] = await this.prisma.$transaction([
      this.prisma.producto.update({
        where: { id: linea.productoId },
        data: { stock: { increment: diff } },
        select: { id: true, nombre: true, stock: true },
      }),
      this.prisma.movimientoInventario.create({
        data: { productoId: linea.productoId, tipo: "AJUSTE", cantidad: Math.abs(diff), motivo },
      }),
      this.prisma.conteoLinea.update({ where: { id: lineaId }, data: { ajustado: true } }),
    ]);

    return { lineaId, productoId: prod.id, producto: prod.nombre, aplicado: diff, stockNuevo: prod.stock, ajustado: true };
  }

  // Cierra el conteo (SOLO sella; NO auto-ajusta). Las líneas sin ajustar quedan como
  // registro (diferencia sin aplicar). Una vez CERRADO es inmutable.
  async cerrar(id: string, usuarioRevisionId: string) {
    const conteo = await this.prisma.conteoInventario.findUnique({ where: { id }, select: { estado: true } });
    if (!conteo) throw new NotFoundException("Conteo no encontrado");
    if (conteo.estado !== "PENDIENTE_REVISION") throw new BadRequestException("El conteo no está en revisión");
    const cerrado = await this.prisma.conteoInventario.update({
      where: { id },
      data: { estado: "CERRADO", usuarioRevisionId, revisadoEn: new Date() },
      select: { id: true, estado: true, revisadoEn: true },
    });
    return cerrado;
  }
}
