import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DisponibilidadService } from "../disponibilidad/disponibilidad.service";
import { CrearReservaDto, CrearReservaManualDto } from "./dto";

@Injectable()
export class ReservasService {
  constructor(
    private prisma: PrismaService,
    private disponibilidad: DisponibilidadService,
  ) {}

  private depositoPorDefecto(): number {
    const pct = Number(process.env.DEFAULT_DEPOSIT_PERCENT ?? 50);
    return isNaN(pct) ? 50 : Math.min(100, Math.max(0, pct));
  }

  /**
   * Crea una reserva en estado PENDIENTE. Valida que el slot este libre,
   * calcula el precio desde el motor de tarifas y determina abono vs total.
   * Devuelve la reserva lista para iniciar el pago en Wompi.
   */
  async crear(dto: CrearReservaDto) {
    // 1. Validar disponibilidad real del slot
    const slots = await this.disponibilidad.porCanchaYFecha(dto.canchaId, dto.fecha);
    const slot = slots.find(
      (s) => s.horaInicio === dto.horaInicio && s.horaFin === dto.horaFin,
    );
    if (!slot) throw new BadRequestException("La franja solicitada no existe en la grilla");
    if (!slot.disponible) throw new BadRequestException(`Franja no disponible: ${slot.motivo ?? ""}`);
    if (slot.precio == null) throw new BadRequestException("Sin tarifa configurada para la franja");

    const montoTotal = slot.precio;
    const abonoPct = dto.pagarAbono === false ? 100 : this.depositoPorDefecto();
    const montoAPagar = Math.round((montoTotal * abonoPct) / 100);
    const saldo = montoTotal - montoAPagar;

    // 2. Upsert del cliente por telefono
    const cliente = await this.prisma.cliente.upsert({
      where: { telefono: dto.telefono },
      update: { nombre: dto.nombre, email: dto.email },
      create: { nombre: dto.nombre, telefono: dto.telefono, email: dto.email },
    });

    // 3. Crear reserva PENDIENTE (+ mesa opcional) en una transaccion
    const reserva = await this.prisma.$transaction(async (tx) => {
      const r = await tx.reserva.create({
        data: {
          canchaId: dto.canchaId,
          clienteId: cliente.id,
          fecha: new Date(dto.fecha + "T00:00:00"),
          horaInicio: dto.horaInicio,
          horaFin: dto.horaFin,
          estado: "PENDIENTE",
          origen: "WEB",
          montoTotal,
          montoAbonado: 0,
          saldo,
        },
      });

      if (dto.reservarMesa) {
        await tx.reservaMesa.create({
          data: {
            reservaId: r.id,
            clienteId: cliente.id,
            fecha: new Date(dto.fecha + "T00:00:00"),
            hora: dto.horaFin, // mesa para el post-partido
            personas: dto.personasMesa ?? 2,
            estado: "SOLICITADA",
          },
        });
      }
      return r;
    });

    return {
      reservaId: reserva.id,
      montoTotal,
      abonoPct,
      montoAPagar, // lo que cobra Wompi ahora
      saldoEnCaja: saldo,
      estado: reserva.estado,
    };
  }

  /**
   * Crea una reserva MANUAL desde caja (ya CONFIRMADA, sin pago en linea).
   * Si `pagado` es true, se marca el total como pagado; si no, queda saldo en caja.
   */
  async crearManual(dto: CrearReservaManualDto) {
    const slots = await this.disponibilidad.porCanchaYFecha(dto.canchaId, dto.fecha);
    const slot = slots.find(
      (s) => s.horaInicio === dto.horaInicio && s.horaFin === dto.horaFin,
    );
    if (!slot) throw new BadRequestException("La franja solicitada no existe en la grilla");
    if (!slot.disponible) throw new BadRequestException(`Franja no disponible: ${slot.motivo ?? ""}`);
    if (slot.precio == null) throw new BadRequestException("Sin tarifa configurada para la franja");

    const montoTotal = slot.precio;
    const montoAbonado = dto.pagado ? montoTotal : 0;
    const saldo = montoTotal - montoAbonado;

    const cliente = await this.prisma.cliente.upsert({
      where: { telefono: dto.telefono },
      update: { nombre: dto.nombre, email: dto.email },
      create: { nombre: dto.nombre, telefono: dto.telefono, email: dto.email },
    });

    const reserva = await this.prisma.reserva.create({
      data: {
        canchaId: dto.canchaId,
        clienteId: cliente.id,
        fecha: new Date(dto.fecha + "T00:00:00"),
        horaInicio: dto.horaInicio,
        horaFin: dto.horaFin,
        estado: "CONFIRMADA",
        origen: "MANUAL",
        montoTotal,
        montoAbonado,
        saldo,
      },
    });
    return { reservaId: reserva.id, montoTotal, montoAbonado, saldo, estado: reserva.estado };
  }

  /**
   * Cancela una reserva aplicando la politica segun antelacion.
   * >= 24h: reembolso total. < 24h: sin reembolso (penalizacion 100%).
   * El reembolso efectivo en Wompi y el aviso se disparan via n8n.
   */
  async cancelar(id: string, motivo?: string) {
    const reserva = await this.prisma.reserva.findUnique({ where: { id } });
    if (!reserva) throw new NotFoundException("Reserva no encontrada");
    if (reserva.estado === "CANCELADA") throw new BadRequestException("Ya esta cancelada");

    const inicio = new Date(
      reserva.fecha.toISOString().slice(0, 10) + "T" + reserva.horaInicio + ":00",
    );
    const horasAntelacion = (inicio.getTime() - Date.now()) / (1000 * 60 * 60);
    const reembolsoTotal = horasAntelacion >= 24;

    await this.prisma.reserva.update({
      where: { id },
      data: { estado: "CANCELADA", canceladaEn: new Date(), motivoCancelacion: motivo },
    });

    return {
      reservaId: id,
      horasAntelacion: Math.round(horasAntelacion),
      politica: reembolsoTotal ? "REEMBOLSO_TOTAL" : "SIN_REEMBOLSO",
      montoReembolsable: reembolsoTotal ? reserva.montoAbonado : 0,
    };
  }

  listarPorFecha(fechaISO: string) {
    return this.prisma.reserva.findMany({
      where: { fecha: new Date(fechaISO + "T00:00:00") },
      include: { cancha: true, cliente: true },
      orderBy: [{ canchaId: "asc" }, { horaInicio: "asc" }],
    });
  }
}
