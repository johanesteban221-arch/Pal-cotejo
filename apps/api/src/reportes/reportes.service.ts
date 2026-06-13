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

  /** KPIs + datos del dashboard admin (lo que pide el diseño aprobado). */
  async dashboard() {
    const OFFSET = 5 * 3600 * 1000; // Colombia UTC-5
    const fechaCol = new Date(Date.now() - OFFSET).toISOString().slice(0, 10);
    const hoy = new Date(`${fechaCol}T00:00:00`);
    const hace7 = new Date(hoy);
    hace7.setDate(hoy.getDate() - 6);

    const [reservasHoyRaw, semana, canchas, mes] = await Promise.all([
      this.prisma.reserva.findMany({
        where: { fecha: hoy },
        include: { cliente: true, cancha: true },
        orderBy: { horaInicio: "asc" },
      }),
      this.prisma.reserva.findMany({
        where: { estado: { in: ESTADOS_VALIDOS as any }, fecha: { gte: hace7, lte: hoy } },
        select: { fecha: true, montoTotal: true },
      }),
      this.prisma.cancha.count({ where: { activa: true } }),
      this.prisma.reserva.findMany({
        where: {
          estado: { in: ESTADOS_VALIDOS as any },
          fecha: { gte: new Date(`${fechaCol.slice(0, 7)}-01T00:00:00`) },
        },
        select: { montoTotal: true },
      }),
    ]);

    const validas = reservasHoyRaw.filter((r) => ["CONFIRMADA", "COMPLETADA"].includes(r.estado));
    const ingresosHoy = validas.reduce((s, r) => s + r.montoTotal, 0);
    const cancelaciones = reservasHoyRaw.filter((r) => r.estado === "CANCELADA").length;
    const reservasActivas = await this.prisma.reserva.count({
      where: { estado: "CONFIRMADA", fecha: { gte: hoy } },
    });
    const ticket = mes.length ? Math.round(mes.reduce((s, r) => s + r.montoTotal, 0) / mes.length) : 0;
    const ingresosSemana = semana.reduce((s, r) => s + r.montoTotal, 0);

    // Ocupación aproximada de hoy (17 franjas 06-23 por cancha)
    const capacidad = Math.max(1, canchas * 17);
    const ocupacion = Math.min(100, Math.round((validas.length / capacidad) * 100));

    // Ingresos por día (últimos 7) para la gráfica de barras
    const mapaDia = new Map<string, number>();
    for (const r of semana) {
      const k = r.fecha.toISOString().slice(0, 10);
      mapaDia.set(k, (mapaDia.get(k) ?? 0) + r.montoTotal);
    }
    const ingresosUltimos7: { fecha: string; ingresos: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(hace7);
      d.setDate(hace7.getDate() + i);
      const k = d.toISOString().slice(0, 10);
      ingresosUltimos7.push({ fecha: k, ingresos: mapaDia.get(k) ?? 0 });
    }

    const reservasHoy = reservasHoyRaw.map((r) => ({
      codigo: r.id.slice(-6).toUpperCase(),
      cliente: r.cliente.nombre,
      cancha: r.cancha.nombre,
      horaInicio: r.horaInicio,
      horaFin: r.horaFin,
      monto: r.montoTotal,
      estado: r.estado,
    }));

    return {
      fecha: fechaCol,
      ingresosHoy,
      reservasActivas,
      ticketPromedio: ticket,
      cancelaciones,
      ocupacion,
      ingresosSemana,
      ingresosUltimos7,
      reservasHoy,
    };
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
