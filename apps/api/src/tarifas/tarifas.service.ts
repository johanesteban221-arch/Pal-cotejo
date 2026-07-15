import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { aMinutos, franjasSinCobertura, hayConflicto } from "../disponibilidad/pricing.util";
import { CrearTarifaDto, EditarFranjaDto } from "./dto";

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

  // FASE C: crea una tarifa validando cancha, orden horario y solapamiento.
  async crear(dto: CrearTarifaDto) {
    const cancha = await this.prisma.cancha.findUnique({
      where: { id: dto.canchaId },
      select: { id: true },
    });
    if (!cancha) throw new NotFoundException("Cancha no encontrada");
    if (aMinutos(dto.horaInicio) >= aMinutos(dto.horaFin)) {
      throw new BadRequestException("La hora de inicio debe ser anterior a la de fin");
    }
    const diaSemana = dto.diaSemana ?? null;

    // Solo contra tarifas ACTIVAS (las inactivas no participan en la resolución).
    const activas = await this.prisma.tarifa.findMany({
      where: { canchaId: dto.canchaId, activa: true },
      select: { diaSemana: true, horaInicio: true, horaFin: true },
    });
    const nueva = { diaSemana, horaInicio: dto.horaInicio, horaFin: dto.horaFin };
    if (hayConflicto(nueva, activas)) {
      throw new ConflictException("Se solaparía con una tarifa existente del mismo tipo de día");
    }

    return this.prisma.tarifa.create({
      data: {
        canchaId: dto.canchaId,
        diaSemana,
        horaInicio: dto.horaInicio,
        horaFin: dto.horaFin,
        precio: dto.precio,
        tipo: dto.tipo,
        activa: true,
      },
      select: SELECT,
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

  /**
   * FASE C: edita franja/día. Solapamiento BLOQUEA (409, antes que nada);
   * si el cambio deja un hueco interno de cobertura, AVISA (requiereConfirmacion)
   * como en cambiarEstado, salvo confirmar:true. Solo toca horario/día.
   */
  async editarFranja(id: string, dto: EditarFranjaDto) {
    const t = await this.prisma.tarifa.findUnique({
      where: { id },
      select: { id: true, canchaId: true, diaSemana: true, horaInicio: true, horaFin: true, activa: true },
    });
    if (!t) throw new NotFoundException("Tarifa no encontrada");

    // Fusionar entrante con lo existente (diaSemana: null explícito vs omitido).
    const horaInicio = dto.horaInicio ?? t.horaInicio;
    const horaFin = dto.horaFin ?? t.horaFin;
    const diaSemana = dto.diaSemana !== undefined ? dto.diaSemana : t.diaSemana;

    if (aMinutos(horaInicio) >= aMinutos(horaFin)) {
      throw new BadRequestException("La hora de inicio debe ser anterior a la de fin");
    }

    // SOLAPAMIENTO (bloquea, se chequea ANTES que hueco). Excluye esta tarifa.
    const otras = await this.prisma.tarifa.findMany({
      where: { canchaId: t.canchaId, activa: true, id: { not: id } },
      select: { diaSemana: true, horaInicio: true, horaFin: true },
    });
    const fusionada = { diaSemana, horaInicio, horaFin };
    if (hayConflicto(fusionada, otras)) {
      throw new ConflictException("Se solaparía con una tarifa existente del mismo tipo de día");
    }

    // HUECO (avisa): solo si la tarifa está activa (si no, no cambia cobertura).
    if (!dto.confirmar && t.activa) {
      const huecos = await this.huecosPostEdicion(t.canchaId, id, fusionada);
      if (huecos.length > 0) {
        const detalle = huecos.map((h) => `${DIAS[h.dia]} ${h.franjas.join(", ")}`).join("; ");
        return {
          aplicado: false,
          requiereConfirmacion: true,
          mensaje: `Este cambio dejará sin precio: ${detalle}.`,
          huecos,
        };
      }
    }

    const tarifa = await this.prisma.tarifa.update({
      where: { id },
      data: { horaInicio, horaFin, diaSemana },
      select: SELECT,
    });
    return { aplicado: true, tarifa };
  }

  /** Huecos internos (+ días que pierden toda su cobertura previa) que dejaría
   *  reemplazar la franja de una tarifa ACTIVA por los valores fusionados. */
  private async huecosPostEdicion(
    canchaId: string,
    tarifaId: string,
    merged: { diaSemana: number | null; horaInicio: string; horaFin: string },
  ) {
    const activas = await this.prisma.tarifa.findMany({
      where: { canchaId, activa: true },
      select: { id: true, diaSemana: true, horaInicio: true, horaFin: true, precio: true, tipo: true },
    });
    const postEdit = activas.map((x) =>
      x.id === tarifaId
        ? { ...x, diaSemana: merged.diaSemana, horaInicio: merged.horaInicio, horaFin: merged.horaFin }
        : x,
    );
    const huecos: { dia: number; franjas: string[] }[] = [];
    for (let dia = 0; dia < 7; dia++) {
      const tarifasDia = postEdit.filter((x) => x.diaSemana === null || x.diaSemana === dia);
      if (tarifasDia.length === 0) {
        const teniaAntes = activas.some((x) => x.diaSemana === null || x.diaSemana === dia);
        if (teniaAntes) huecos.push({ dia, franjas: ["todo el día"] });
        continue;
      }
      const gaps = franjasSinCobertura(postEdit, dia);
      if (gaps.length > 0) {
        huecos.push({ dia, franjas: gaps.map((g) => `${g.horaInicio}\u2013${g.horaFin}`) });
      }
    }
    return huecos;
  }
}
