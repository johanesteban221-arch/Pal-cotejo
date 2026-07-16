import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ActualizarMetodoCobroDto, CrearMetodoCobroDto } from "./dto";

const SELECT = {
  id: true,
  nombre: true,
  codigo: true,
  verificacion: true,
  activo: true,
  orden: true,
} as const;

// Slug estable: MAYÚSCULAS, espacios/guiones → "_", solo [A-Z0-9_].
// "Nequi" → "NEQUI"; "Daviplata empresa" → "DAVIPLATA_EMPRESA".
function normalizarCodigo(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

@Injectable()
export class MetodosCobroService {
  constructor(private prisma: PrismaService) {}

  // ¿Código ya en uso (case-insensitive)? Opcionalmente excluyendo un id.
  private async codigoEnUso(codigo: string, exceptId?: string) {
    const existe = await this.prisma.metodoCobro.findFirst({
      where: {
        codigo: { equals: codigo, mode: "insensitive" },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { id: true },
    });
    return !!existe;
  }

  // Todos (incl. archivados). Orden por `orden` (nulls al final), luego nombre.
  listar() {
    return this.prisma.metodoCobro.findMany({
      select: SELECT,
      orderBy: [{ orden: { sort: "asc", nulls: "last" } }, { nombre: "asc" }],
    });
  }

  async crear(dto: CrearMetodoCobroDto) {
    const nombre = dto.nombre.trim();
    const codigo = normalizarCodigo(dto.codigo);
    if (!codigo) throw new BadRequestException("El código no puede quedar vacío tras normalizar");
    if (await this.codigoEnUso(codigo)) {
      throw new ConflictException("Ya existe un método de cobro con ese código");
    }
    return this.prisma.metodoCobro.create({
      data: { nombre, codigo, verificacion: dto.verificacion, orden: dto.orden, activo: true },
      select: SELECT,
    });
  }

  // Edita nombre/verificacion/orden. El `codigo` es INMUTABLE: ni se acepta ni se escribe.
  async actualizar(id: string, dto: ActualizarMetodoCobroDto) {
    const existe = await this.prisma.metodoCobro.findUnique({ where: { id }, select: { id: true } });
    if (!existe) throw new NotFoundException("Método de cobro no encontrado");
    return this.prisma.metodoCobro.update({
      where: { id },
      data: {
        nombre: dto.nombre?.trim(),
        verificacion: dto.verificacion,
        orden: dto.orden,
      },
      select: SELECT,
    });
  }

  // Archivar/reactivar. No se puede archivar el ÚLTIMO activo. Archivar no borra.
  async cambiarEstado(id: string, activo: boolean) {
    const metodo = await this.prisma.metodoCobro.findUnique({
      where: { id },
      select: { id: true, activo: true },
    });
    if (!metodo) throw new NotFoundException("Método de cobro no encontrado");

    if (activo === false && metodo.activo) {
      const activos = await this.prisma.metodoCobro.count({ where: { activo: true } });
      if (activos <= 1) {
        throw new ConflictException("Debe quedar al menos un método de cobro activo");
      }
    }

    const actualizado = await this.prisma.metodoCobro.update({
      where: { id },
      data: { activo },
      select: SELECT,
    });
    return { aplicado: true, metodo: actualizado };
  }
}
