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
}
