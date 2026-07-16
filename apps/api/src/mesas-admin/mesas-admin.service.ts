import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ActualizarMesaDto, CrearMesaDto } from "./dto";

const SELECT = { id: true, nombre: true, capacidad: true, activa: true } as const;

@Injectable()
export class MesasAdminService {
  constructor(private prisma: PrismaService) {}

  // ¿Nombre ya en uso (case-insensitive)? Opcionalmente excluyendo un id (al editar).
  private async nombreEnUso(nombre: string, exceptId?: string) {
    const existe = await this.prisma.mesa.findFirst({
      where: {
        nombre: { equals: nombre, mode: "insensitive" },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { id: true },
    });
    return !!existe;
  }

  // TODAS las mesas (incl. inactivas), para el admin. El salón del POS usa
  // GET /pos/mesas (solo activas) — ese endpoint NO se toca.
  listar() {
    return this.prisma.mesa.findMany({ select: SELECT, orderBy: { nombre: "asc" } });
  }

  async crear(dto: CrearMesaDto) {
    const nombre = dto.nombre.trim();
    if (await this.nombreEnUso(nombre)) {
      throw new ConflictException("Ya existe una mesa con ese nombre");
    }
    return this.prisma.mesa.create({
      data: { nombre, ...(dto.capacidad !== undefined ? { capacidad: dto.capacidad } : {}) },
      select: SELECT,
    });
  }

  async actualizar(id: string, dto: ActualizarMesaDto) {
    const existe = await this.prisma.mesa.findUnique({ where: { id }, select: { id: true } });
    if (!existe) throw new NotFoundException("Mesa no encontrada");

    const nombre = dto.nombre?.trim();
    if (nombre && (await this.nombreEnUso(nombre, id))) {
      throw new ConflictException("Ya existe una mesa con ese nombre");
    }
    // Editar el nombre NO afecta cuentas ya abiertas: su snapshot `cuenta.mesa` (texto)
    // conserva el nombre con el que se abrieron (histórico correcto).
    return this.prisma.mesa.update({
      where: { id },
      data: { nombre, capacidad: dto.capacidad },
      select: SELECT,
    });
  }

  // Activar/desactivar (soft delete — nunca se borra, preserva el histórico de cuentas).
  async cambiarEstado(id: string, activa: boolean) {
    const existe = await this.prisma.mesa.findUnique({ where: { id }, select: { id: true } });
    if (!existe) throw new NotFoundException("Mesa no encontrada");

    if (activa === false) {
      // 409 DURO: desactivar una mesa con cuenta ABIERTA la sacaría del salón dejando
      // dinero abierto sin acceso desde la UI. Se exige cerrar la cuenta primero.
      const abierta = await this.prisma.cuenta.findFirst({
        where: { mesaId: id, estado: "ABIERTA" },
        select: { id: true },
      });
      if (abierta) {
        throw new ConflictException("La mesa tiene una cuenta abierta; ciérrala antes de desactivarla");
      }
    }

    const mesa = await this.prisma.mesa.update({ where: { id }, data: { activa }, select: SELECT });
    return { aplicado: true, mesa };
  }
}
