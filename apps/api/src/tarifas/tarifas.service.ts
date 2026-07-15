import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// Campos a devolver (incluye el nombre de la cancha asociada).
const SELECT = {
  id: true,
  canchaId: true,
  diaSemana: true,
  horaInicio: true,
  horaFin: true,
  precio: true,
  tipo: true,
  activa: true,
  cancha: { select: { nombre: true } },
} as const;

@Injectable()
export class TarifasService {
  constructor(private prisma: PrismaService) {}

  // Lista TODAS las tarifas (incluidas inactivas), ordenadas por cancha/día/hora.
  listar() {
    return this.prisma.tarifa.findMany({
      select: SELECT,
      orderBy: [{ cancha: { nombre: "asc" } }, { diaSemana: "asc" }, { horaInicio: "asc" }],
    });
  }

  // FASE A: solo edita el precio. NO toca activa/horario/día → cobertura de slots
  // y rango operativo quedan intactos. No recalcula reservas existentes (guardan
  // su montoTotal como snapshot al crearse).
  async actualizarPrecio(id: string, precio: number) {
    const existe = await this.prisma.tarifa.findUnique({ where: { id }, select: { id: true } });
    if (!existe) throw new NotFoundException("Tarifa no encontrada");
    return this.prisma.tarifa.update({
      where: { id },
      data: { precio },
      select: SELECT,
    });
  }
}
