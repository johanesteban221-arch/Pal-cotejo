import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { franjasSinCobertura } from "../disponibilidad/pricing.util";

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

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

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

  /**
   * Detecta qué días/franjas quedarían SIN tarifa activa si se desactivara la
   * tarifa dada. Solo huecos internos del rango operativo + días que pierden toda
   * cobertura que antes tenían. (No avisa por encoger horas del borde.)
   */
  async analizarDesactivacion(id: string) {
    const objetivo = await this.prisma.tarifa.findUnique({
      where: { id },
      select: { id: true, canchaId: true },
    });
    if (!objetivo) throw new NotFoundException("Tarifa no encontrada");

    const activas = await this.prisma.tarifa.findMany({
      where: { canchaId: objetivo.canchaId, activa: true },
      select: { id: true, diaSemana: true, horaInicio: true, horaFin: true, precio: true, tipo: true },
    });
    const restantes = activas.filter((t) => t.id !== id);

    const huecos: { dia: number; franjas: string[] }[] = [];
    for (let dia = 0; dia < 7; dia++) {
      const tarifasDia = restantes.filter((t) => t.diaSemana === null || t.diaSemana === dia);
      if (tarifasDia.length === 0) {
        // Solo avisar si ANTES ese día tenía cobertura (si no, desactivar no cambia nada).
        const teniaAntes = activas.some((t) => t.diaSemana === null || t.diaSemana === dia);
        if (teniaAntes) huecos.push({ dia, franjas: ["todo el día"] });
        continue;
      }
      const gaps = franjasSinCobertura(restantes, dia);
      if (gaps.length > 0) {
        huecos.push({ dia, franjas: gaps.map((g) => `${g.horaInicio}\u2013${g.horaFin}`) });
      }
    }
    return huecos;
  }

  /**
   * Activa/desactiva una tarifa. Reactivar es directo (solo añade cobertura).
   * Desactivar sin confirmar: si dejaría huecos, NO aplica y pide confirmación.
   */
  async cambiarEstado(id: string, activa: boolean, confirmar?: boolean) {
    const objetivo = await this.prisma.tarifa.findUnique({ where: { id }, select: { id: true } });
    if (!objetivo) throw new NotFoundException("Tarifa no encontrada");

    if (activa === false && !confirmar) {
      const huecos = await this.analizarDesactivacion(id);
      if (huecos.length > 0) {
        const detalle = huecos.map((h) => `${DIAS[h.dia]} ${h.franjas.join(", ")}`).join("; ");
        return {
          aplicado: false,
          requiereConfirmacion: true,
          mensaje: `Desactivar esta tarifa dejará sin precio: ${detalle}.`,
          huecos,
        };
      }
    }

    const tarifa = await this.prisma.tarifa.update({
      where: { id },
      data: { activa },
      select: SELECT,
    });
    return { aplicado: true, tarifa };
  }
}
