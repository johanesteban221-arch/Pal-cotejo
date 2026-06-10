import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CrearRecurrenteDto } from "./dto";
import { aMinutos, resolverTarifa } from "../disponibilidad/pricing.util";

@Injectable()
export class RecurrentesService {
  constructor(private prisma: PrismaService) {}

  /** Crea una regla recurrente (cliente fijo). */
  async crear(dto: CrearRecurrenteDto) {
    const cliente = await this.prisma.cliente.upsert({
      where: { telefono: dto.telefono },
      update: { nombre: dto.nombre },
      create: { nombre: dto.nombre, telefono: dto.telefono },
    });

    return this.prisma.reservaRecurrente.create({
      data: {
        canchaId: dto.canchaId,
        clienteId: cliente.id,
        frecuencia: dto.frecuencia,
        diaSemana: dto.diaSemana,
        horaInicio: dto.horaInicio,
        horaFin: dto.horaFin,
        fechaInicio: new Date(dto.fechaInicio + "T00:00:00"),
        fechaFin: dto.fechaFin ? new Date(dto.fechaFin + "T00:00:00") : null,
      },
    });
  }

  listar() {
    return this.prisma.reservaRecurrente.findMany({
      where: { activa: true },
      include: {
        cancha: { select: { nombre: true } },
        cliente: { select: { nombre: true, telefono: true } },
        _count: { select: { reservas: true } },
      },
      orderBy: { creadoEn: "desc" },
    });
  }

  async eliminar(id: string) {
    // Desactivamos la regla (no borramos las reservas ya generadas)
    return this.prisma.reservaRecurrente.update({ where: { id }, data: { activa: false } });
  }

  /**
   * Genera las próximas `cantidad` reservas concretas de la regla, saltando
   * las fechas que ya tengan reserva o estén bloqueadas. Devuelve el conteo.
   */
  async generar(id: string, cantidad = 4) {
    const regla = await this.prisma.reservaRecurrente.findUnique({
      where: { id },
      include: { cancha: { include: { tarifas: { where: { activa: true } } } } },
    });
    if (!regla) throw new NotFoundException("Regla recurrente no encontrada");
    if (!regla.activa) throw new BadRequestException("La regla está inactiva");

    const fechas = this.calcularFechas(regla.frecuencia, regla.diaSemana, regla.fechaInicio, regla.fechaFin, cantidad);

    let creadas = 0;
    let omitidas = 0;
    for (const fecha of fechas) {
      const fechaISO = fecha.toISOString().slice(0, 10);

      // ¿Ya existe una reserva activa en esa franja?
      const existe = await this.prisma.reserva.findFirst({
        where: {
          canchaId: regla.canchaId,
          fecha,
          horaInicio: regla.horaInicio,
          estado: { in: ["PENDIENTE", "CONFIRMADA"] },
        },
      });
      if (existe) { omitidas++; continue; }

      // ¿Bloqueo que se solape?
      const slotInicio = new Date(fechaISO + "T" + regla.horaInicio + ":00");
      const slotFin = new Date(fechaISO + "T" + regla.horaFin + ":00");
      const bloqueo = await this.prisma.bloqueo.findFirst({
        where: { canchaId: regla.canchaId, inicio: { lt: slotFin }, fin: { gt: slotInicio } },
      });
      if (bloqueo) { omitidas++; continue; }

      // Precio según tarifa del día/hora
      const tarifa = resolverTarifa(
        regla.cancha.tarifas,
        fecha.getDay(),
        aMinutos(regla.horaInicio),
        aMinutos(regla.horaFin),
      );
      const montoTotal = tarifa?.precio ?? 0;

      await this.prisma.reserva.create({
        data: {
          canchaId: regla.canchaId,
          clienteId: regla.clienteId,
          fecha,
          horaInicio: regla.horaInicio,
          horaFin: regla.horaFin,
          estado: "CONFIRMADA",
          origen: "MANUAL",
          montoTotal,
          montoAbonado: 0,
          saldo: montoTotal,
          recurrenteId: regla.id,
        },
      });
      creadas++;
    }
    return { creadas, omitidas, total: fechas.length };
  }

  /** Calcula las próximas fechas según frecuencia (a partir de hoy o de fechaInicio). */
  private calcularFechas(
    frecuencia: string,
    diaSemana: number,
    fechaInicio: Date,
    fechaFin: Date | null,
    cantidad: number,
  ): Date[] {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicio = fechaInicio > hoy ? new Date(fechaInicio) : hoy;
    inicio.setHours(0, 0, 0, 0);
    const out: Date[] = [];

    if (frecuencia === "SEMANAL") {
      const d = new Date(inicio);
      while (d.getDay() !== diaSemana) d.setDate(d.getDate() + 1);
      while (out.length < cantidad) {
        if (fechaFin && d > fechaFin) break;
        out.push(new Date(d));
        d.setDate(d.getDate() + 7);
      }
    } else {
      // MENSUAL: primera ocurrencia de ese día de la semana en cada mes
      let mes = inicio.getMonth();
      let anio = inicio.getFullYear();
      while (out.length < cantidad) {
        const primero = new Date(anio, mes, 1);
        while (primero.getDay() !== diaSemana) primero.setDate(primero.getDate() + 1);
        if (primero >= inicio && (!fechaFin || primero <= fechaFin)) {
          out.push(new Date(primero));
        }
        mes++;
        if (mes > 11) { mes = 0; anio++; }
        if (anio > inicio.getFullYear() + 3) break; // tope de seguridad
      }
    }
    return out;
  }
}
