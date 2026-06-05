import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// Estados que cuentan como ingreso real
const ESTADOS_VALIDOS = ["CONFIRMADA", "COMPLETADA"] as const;

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) {}

  /** KPIs principales: ingresos, reservas, ticket promedio, ocupacion, % abonos. */
  async resumen() {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const [reservasMes, totalReservas, mesas] = await Promise.all([
      this.prisma.reserva.findMany({
        where: { estado: { in: ESTADOS_VALIDOS as any }, fecha: { gte: inicioMes } },
        select: { montoTotal: true, saldo: true },
      }),
      this.prisma.reserva.count({ where: { estado: { in: ESTADOS_VALIDOS as any } } }),
      this.prisma.reservaMesa.count(),
    ]);

    const ingresosMes = reservasMes.reduce((s, r) => s + r.montoTotal, 0);
    const saldoPendiente = reservasMes.reduce((s, r) => s + r.saldo, 0);
    const ticket = reservasMes.length ? Math.round(ingresosMes / reservasMes.length) : 0;

    return {
      ingresosMes,
      reservasMes: reservasMes.length,
      ticketPromedio: ticket,
      saldoPendienteCaja: saldoPendiente,
      totalReservasHistoricas: totalReservas,
      reservasMesaBar: mesas,
    };
  }

  /** Ingresos por dia de los ultimos N dias (para la grafica de linea). */
  async ingresosDiarios(dias = 30) {
    const desde = new Date();
    desde.setDate(desde.getDate() - dias);
    desde.setHours(0, 0, 0, 0);

    const reservas = await this.prisma.reserva.findMany({
      where: { estado: { in: ESTADOS_VALIDOS as any }, fecha: { gte: desde } },
      select: { fecha: true, montoTotal: true },
      orderBy: { fecha: "asc" },
    });

    const mapa = new Map<string, number>();
    for (const r of reservas) {
      const k = r.fecha.toISOString().slice(0, 10);
      mapa.set(k, (mapa.get(k) ?? 0) + r.montoTotal);
    }
    return Array.from(mapa.entries()).map(([fecha, ingresos]) => ({ fecha, ingresos }));
  }

  /** Ingresos y nro de reservas por hora del dia (horas mas rentables). */
  async horasRentables() {
    const reservas = await this.prisma.reserva.findMany({
      where: { estado: { in: ESTADOS_VALIDOS as any } },
      select: { horaInicio: true, montoTotal: true },
    });

    const mapa = new Map<string, { ingresos: number; reservas: number }>();
    for (const r of reservas) {
      const cur = mapa.get(r.horaInicio) ?? { ingresos: 0, reservas: 0 };
      cur.ingresos += r.montoTotal;
      cur.reservas += 1;
      mapa.set(r.horaInicio, cur);
    }
    return Array.from(mapa.entries())
      .map(([hora, v]) => ({ hora, ...v }))
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }

  /** Ingresos y reservas por cancha. */
  async ocupacionCanchas() {
    const canchas = await this.prisma.cancha.findMany({ select: { id: true, nombre: true } });
    const out: { cancha: string; reservas: number; ingresos: number }[] = [];
    for (const c of canchas) {
      const reservas = await this.prisma.reserva.findMany({
        where: { canchaId: c.id, estado: { in: ESTADOS_VALIDOS as any } },
        select: { montoTotal: true },
      });
      out.push({
        cancha: c.nombre,
        reservas: reservas.length,
        ingresos: reservas.reduce((s, r) => s + r.montoTotal, 0),
      });
    }
    return out;
  }

  /** Ranking de clientes por nro de reservas (base de datos de clientes). */
  async topClientes(limite = 5) {
    const clientes = await this.prisma.cliente.findMany({
      include: { _count: { select: { reservas: true } } },
    });
    return clientes
      .map((c) => ({ nombre: c.nombre, telefono: c.telefono, reservas: c._count.reservas }))
      .sort((a, b) => b.reservas - a.reservas)
      .slice(0, limite);
  }
}
