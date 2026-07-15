import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ActualizarCanchaDto, CrearCanchaDto } from "./dto";

const SELECT = {
  id: true,
  nombre: true,
  tipo: true,
  descripcion: true,
  capacidad: true,
  orden: true,
  activa: true,
} as const;

@Injectable()
export class CanchasAdminService {
  constructor(private prisma: PrismaService) {}

  // ¿Nombre ya en uso (case-insensitive)? Opcionalmente excluyendo un id (al editar).
  private async nombreEnUso(nombre: string, exceptId?: string) {
    const existe = await this.prisma.cancha.findFirst({
      where: {
        nombre: { equals: nombre, mode: "insensitive" },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { id: true },
    });
    return !!existe;
  }

  // Todos los recursos (incl. inactivos). Orden por `orden` (nulls al final), luego nombre.
  listar() {
    return this.prisma.cancha.findMany({
      select: SELECT,
      orderBy: [{ orden: { sort: "asc", nulls: "last" } }, { nombre: "asc" }],
    });
  }

  async crear(dto: CrearCanchaDto) {
    const nombre = dto.nombre.trim();
    if (await this.nombreEnUso(nombre)) {
      throw new ConflictException("Ya existe un recurso con ese nombre");
    }
    return this.prisma.cancha.create({
      data: {
        nombre,
        tipo: dto.tipo,
        descripcion: dto.descripcion,
        capacidad: dto.capacidad,
        orden: dto.orden,
        activa: true,
      },
      select: SELECT,
    });
  }

  async actualizar(id: string, dto: ActualizarCanchaDto) {
    const existe = await this.prisma.cancha.findUnique({ where: { id }, select: { id: true } });
    if (!existe) throw new NotFoundException("Recurso no encontrado");

    const nombre = dto.nombre?.trim();
    if (nombre && (await this.nombreEnUso(nombre, id))) {
      throw new ConflictException("Ya existe un recurso con ese nombre");
    }
    return this.prisma.cancha.update({
      where: { id },
      data: {
        nombre,
        tipo: dto.tipo,
        descripcion: dto.descripcion,
        capacidad: dto.capacidad,
        orden: dto.orden,
      },
      select: SELECT,
    });
  }

  // Activar/desactivar. Reactivar es directo. Desactivar con reservas futuras: avisa.
  async cambiarEstado(id: string, activa: boolean, confirmar?: boolean) {
    const existe = await this.prisma.cancha.findUnique({ where: { id }, select: { id: true } });
    if (!existe) throw new NotFoundException("Recurso no encontrado");

    if (activa === false && !confirmar) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const reservasFuturas = await this.prisma.reserva.count({
        where: { canchaId: id, estado: { not: "CANCELADA" }, fecha: { gte: hoy } },
      });
      if (reservasFuturas > 0) {
        return {
          aplicado: false,
          requiereConfirmacion: true,
          reservasFuturas,
          mensaje: `Este recurso tiene ${reservasFuturas} reserva(s) futura(s). Desactivarlo lo ocultará pero NO las cancela.`,
        };
      }
    }

    const cancha = await this.prisma.cancha.update({ where: { id }, data: { activa }, select: SELECT });
    return { aplicado: true, cancha };
  }
}
