import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { aHHMM, aMinutos, resolverTarifa } from "./pricing.util";

export interface Slot {
  horaInicio: string; // "HH:mm"
  horaFin: string; // "HH:mm"
  disponible: boolean;
  precio: number | null; // COP
  tipo: "PICO" | "VALLE" | null;
  motivo?: string; // por que no esta disponible
}

@Injectable()
export class DisponibilidadService {
  // Duracion de cada slot en minutos (1 hora). Configurable a futuro.
  private readonly SLOT_MIN = 60;

  constructor(private prisma: PrismaService) {}

  /**
   * Devuelve la grilla de slots de una cancha para una fecha dada,
   * marcando disponibilidad (reservas + bloqueos) y precio por slot.
   */
  async porCanchaYFecha(canchaId: string, fechaISO: string): Promise<Slot[]> {
    const cancha = await this.prisma.cancha.findUnique({
      where: { id: canchaId },
      include: { tarifas: { where: { activa: true } } },
    });
    if (!cancha) throw new NotFoundException("Cancha no encontrada");

    const fecha = new Date(fechaISO + "T00:00:00");
    const diaSemana = fecha.getDay(); // 0=Dom ... 6=Sab

    // Rango operativo del dia = min(horaInicio) .. max(horaFin) de las tarifas aplicables
    const tarifasDia = cancha.tarifas.filter(
      (t) => t.diaSemana === null || t.diaSemana === diaSemana,
    );
    if (tarifasDia.length === 0) return [];
    const aperturaMin = Math.min(...tarifasDia.map((t) => aMinutos(t.horaInicio)));
    const cierreMin = Math.max(...tarifasDia.map((t) => aMinutos(t.horaFin)));

    // Reservas activas del dia (ocupan slots)
    const reservas = await this.prisma.reserva.findMany({
      where: {
        canchaId,
        fecha,
        estado: { in: ["PENDIENTE", "CONFIRMADA"] },
      },
      select: { horaInicio: true, horaFin: true },
    });

    // Bloqueos que se solapan con el dia
    const inicioDia = new Date(fechaISO + "T00:00:00");
    const finDia = new Date(fechaISO + "T23:59:59");
    const bloqueos = await this.prisma.bloqueo.findMany({
      where: { canchaId, inicio: { lte: finDia }, fin: { gte: inicioDia } },
    });

    const slots: Slot[] = [];
    for (let m = aperturaMin; m + this.SLOT_MIN <= cierreMin; m += this.SLOT_MIN) {
      const ini = m;
      const fin = m + this.SLOT_MIN;
      const horaInicio = aHHMM(ini);
      const horaFin = aHHMM(fin);

      // ¿reservado?
      const reservado = reservas.some(
        (r) => aMinutos(r.horaInicio) < fin && aMinutos(r.horaFin) > ini,
      );

      // ¿bloqueado?
      const slotInicio = new Date(fechaISO + "T" + horaInicio + ":00");
      const slotFin = new Date(fechaISO + "T" + horaFin + ":00");
      const bloqueado = bloqueos.some((b) => b.inicio < slotFin && b.fin > slotInicio);

      const tarifa = resolverTarifa(tarifasDia, diaSemana, ini, fin);

      slots.push({
        horaInicio,
        horaFin,
        disponible: !reservado && !bloqueado && !!tarifa,
        precio: tarifa?.precio ?? null,
        tipo: (tarifa?.tipo as "PICO" | "VALLE") ?? null,
        motivo: reservado ? "Reservado" : bloqueado ? "Bloqueado" : undefined,
      });
    }
    return slots;
  }
}
