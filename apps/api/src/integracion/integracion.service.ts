import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// Colombia: UTC-5 fijo (sin horario de verano).
const OFFSET = "-05:00";

@Injectable()
export class IntegracionService {
  constructor(private prisma: PrismaService) {}

  /** Fecha de "hoy" en Colombia (YYYY-MM-DD). */
  private fechaHoyColombia(): string {
    return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
  }

  /**
   * Reservas CONFIRMADAS cuyo inicio cae dentro de la ventana [minMin, maxMin]
   * minutos a partir de ahora y a las que aún no se les envió recordatorio.
   * Pensado para correr cada hora con una ventana de ~3h.
   */
  async recordatoriosPendientes(minMin = 150, maxMin = 210) {
    const ahora = Date.now();
    const desde = new Date();
    desde.setDate(desde.getDate() - 1);
    desde.setHours(0, 0, 0, 0);

    const reservas = await this.prisma.reserva.findMany({
      where: { estado: "CONFIRMADA", recordatorioEnviado: false, fecha: { gte: desde } },
      include: { cliente: true, cancha: true },
    });

    return reservas
      .map((r) => {
        const fechaISO = r.fecha.toISOString().slice(0, 10);
        const inicioUTC = new Date(`${fechaISO}T${r.horaInicio}:00${OFFSET}`).getTime();
        const minutos = Math.round((inicioUTC - ahora) / 60000);
        return {
          reservaId: r.id,
          codigo: r.id.slice(-6).toUpperCase(),
          clienteNombre: r.cliente.nombre,
          clienteTelefono: r.cliente.telefono,
          clienteEmail: r.cliente.email ?? null,
          cancha: r.cancha.nombre,
          fecha: fechaISO,
          horaInicio: r.horaInicio,
          minutosParaInicio: minutos,
        };
      })
      .filter((x) => x.minutosParaInicio >= minMin && x.minutosParaInicio <= maxMin);
  }

  /** Marca reservas como recordadas para no repetir el aviso. */
  async marcarRecordadas(ids: string[]) {
    if (!ids?.length) return { actualizadas: 0 };
    const res = await this.prisma.reserva.updateMany({
      where: { id: { in: ids } },
      data: { recordatorioEnviado: true },
    });
    return { actualizadas: res.count };
  }

  /** Resumen del día para el reporte al dueño. */
  async reporteDiario() {
    const fechaCol = this.fechaHoyColombia();
    const dia = new Date(`${fechaCol}T00:00:00`);

    const reservas = await this.prisma.reserva.findMany({
      where: { fecha: dia, estado: { in: ["CONFIRMADA", "COMPLETADA"] } },
      include: { reservaMesa: true },
    });

    const ingresos = reservas.reduce((s, r) => s + r.montoTotal, 0);
    const saldoPendiente = reservas.reduce((s, r) => s + r.saldo, 0);
    const mesas = reservas.filter((r) => r.reservaMesa).length;

    // Hora más activa del día
    const porHora = new Map<string, number>();
    for (const r of reservas) porHora.set(r.horaInicio, (porHora.get(r.horaInicio) ?? 0) + 1);
    let horaTop = "—";
    let maxRes = 0;
    for (const [h, c] of porHora) if (c > maxRes) { maxRes = c; horaTop = h; }

    return {
      fecha: fechaCol,
      reservas: reservas.length,
      ingresos,
      saldoPendienteCaja: saldoPendiente,
      mesasBar: mesas,
      horaMasActiva: horaTop,
    };
  }
}
