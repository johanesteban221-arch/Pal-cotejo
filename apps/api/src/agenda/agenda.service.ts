import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { aHHMM, aMinutos } from "../disponibilidad/pricing.util";

@Injectable()
export class AgendaService {
  constructor(private prisma: PrismaService) {}

  /**
   * Todo lo necesario para pintar la grilla de UN día con recursos en columnas:
   * recursos activos (columnas, ordenados), reservas y bloqueos del día por
   * recurso (listas planas con canchaId), y el rango horario a dibujar.
   */
  async dia(fecha: string) {
    const dayStart = new Date(fecha + "T00:00:00.000Z");
    const dayEnd = new Date(fecha + "T23:59:59.999Z");
    // Día de la semana como lo calcula disponibilidad (coherencia de tarifas).
    const diaSemana = new Date(fecha + "T00:00:00").getDay();

    // ── Columnas: recursos activos, orden por `orden` (nulls al final) → nombre ──
    const recursos = await this.prisma.cancha.findMany({
      where: { activa: true },
      select: { id: true, nombre: true, tipo: true, orden: true },
      orderBy: [{ orden: { sort: "asc", nulls: "last" } }, { nombre: "asc" }],
    });

    // ── Reservas del día (recursos activos, sin CANCELADA) ──
    const reservasRaw = await this.prisma.reserva.findMany({
      where: { fecha: dayStart, estado: { not: "CANCELADA" }, cancha: { activa: true } },
      select: {
        id: true,
        canchaId: true,
        horaInicio: true,
        horaFin: true,
        estado: true,
        montoTotal: true,
        cliente: { select: { nombre: true } },
      },
      orderBy: [{ canchaId: "asc" }, { horaInicio: "asc" }],
    });
    const reservas = reservasRaw.map((r) => ({
      id: r.id,
      canchaId: r.canchaId,
      horaInicio: r.horaInicio,
      horaFin: r.horaFin,
      estado: r.estado,
      montoTotal: r.montoTotal,
      cliente: r.cliente.nombre,
    }));

    // ── Bloqueos del día (recursos activos), normalizados y recortados al día ──
    const bloqueosRaw = await this.prisma.bloqueo.findMany({
      where: { inicio: { lte: dayEnd }, fin: { gte: dayStart }, cancha: { activa: true } },
      select: { id: true, canchaId: true, inicio: true, fin: true, motivo: true, nota: true },
      orderBy: { inicio: "asc" },
    });
    const bloqueos = bloqueosRaw.map((b) => {
      const iniISO = b.inicio.toISOString();
      const finISO = b.fin.toISOString();
      const diaIni = iniISO.slice(0, 10);
      const diaFin = finISO.slice(0, 10);
      const cruzaDias = diaIni !== diaFin;
      return {
        id: cruzaDias ? `${b.id}#${fecha}` : b.id,
        bloqueoId: b.id,
        canchaId: b.canchaId,
        // Recorta al día: "00:00" si empezó antes; "23:59" si termina después.
        horaInicio: diaIni === fecha ? iniISO.slice(11, 16) : "00:00",
        horaFin: diaFin === fecha ? finISO.slice(11, 16) : "23:59",
        motivo: b.motivo,
        nota: b.nota,
      };
    });

    // ── Rango horario a dibujar ──
    // Base: min/max de tarifas ACTIVAS de recursos activos aplicables a este día.
    // Se extiende para cubrir también reservas/bloqueos (que la grilla no recorte nada).
    const tarifas = await this.prisma.tarifa.findMany({
      where: { activa: true, cancha: { activa: true }, OR: [{ diaSemana: null }, { diaSemana }] },
      select: { horaInicio: true, horaFin: true },
    });
    const inicios = [
      ...tarifas.map((t) => t.horaInicio),
      ...reservas.map((r) => r.horaInicio),
      ...bloqueos.map((b) => b.horaInicio),
    ];
    const fines = [
      ...tarifas.map((t) => t.horaFin),
      ...reservas.map((r) => r.horaFin),
      ...bloqueos.map((b) => b.horaFin),
    ];
    const horaApertura = inicios.length ? aHHMM(Math.min(...inicios.map(aMinutos))) : null;
    const horaCierre = fines.length ? aHHMM(Math.max(...fines.map(aMinutos))) : null;

    return { fecha, recursos, horaApertura, horaCierre, reservas, bloqueos };
  }
}
