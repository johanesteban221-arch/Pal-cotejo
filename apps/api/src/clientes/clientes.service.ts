import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Segmento } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ActualizarClienteDto } from "./dto";

const ACTIVAS = { estado: { not: "CANCELADA" as const } };

@Injectable()
export class ClientesService {
  private readonly logger = new Logger(ClientesService.name);
  constructor(private prisma: PrismaService) {}

  private diasDesde(fecha?: Date | null): number {
    if (!fecha) return 9999;
    return Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000);
  }

  /** Lista paginada con filtro por segmento y búsqueda. Incluye agregados. */
  async listar(params: { segmento?: string; buscar?: string; page?: number; limit?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, params.limit ?? 20);
    const where: any = {};
    if (params.segmento) where.segmento = params.segmento;
    if (params.buscar)
      where.OR = [
        { nombre: { contains: params.buscar, mode: "insensitive" } },
        { telefono: { contains: params.buscar } },
      ];

    const [total, clientes] = await Promise.all([
      this.prisma.cliente.count({ where }),
      this.prisma.cliente.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { creadoEn: "desc" },
        include: { reservas: { where: ACTIVAS, select: { montoTotal: true, fecha: true } } },
      }),
    ]);

    const items = clientes.map((c) => {
      const totalGastado = c.reservas.reduce((s, r) => s + r.montoTotal, 0);
      const ultima = c.reservas.reduce<Date | null>((max, r) => (!max || r.fecha > max ? r.fecha : max), null);
      return {
        id: c.id,
        nombre: c.nombre,
        telefono: c.telefono,
        email: c.email,
        equipo: c.equipo,
        segmento: c.segmento,
        totalReservas: c.reservas.length,
        totalGastado,
        ultimaVisita: ultima ? ultima.toISOString().slice(0, 10) : null,
      };
    });
    return { items, total, page, limit };
  }

  /** Conteo por segmento para las pills del filtro. */
  async resumenSegmentos() {
    const grupos = await this.prisma.cliente.groupBy({ by: ["segmento"], _count: true });
    const porSegmento: Record<string, number> = {};
    let total = 0;
    for (const g of grupos) {
      porSegmento[g.segmento] = g._count;
      total += g._count;
    }
    return { total, porSegmento };
  }

  /** Perfil completo con historial de reservas. */
  async perfil(id: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      include: {
        reservas: {
          orderBy: { fecha: "desc" },
          take: 10,
          include: { cancha: { select: { nombre: true } } },
        },
      },
    });
    if (!cliente) throw new NotFoundException("Cliente no encontrado");
    return cliente;
  }

  /** Stats del cliente: total gastado, reservas, última visita, días inactivo. */
  async stats(id: string) {
    const reservas = await this.prisma.reserva.findMany({
      where: { clienteId: id, ...ACTIVAS },
      select: { montoTotal: true, fecha: true },
    });
    const totalGastado = reservas.reduce((s, r) => s + r.montoTotal, 0);
    const ultima = reservas.reduce<Date | null>((max, r) => (!max || r.fecha > max ? r.fecha : max), null);
    return {
      totalGastado,
      totalReservas: reservas.length,
      ultimaVisita: ultima ? ultima.toISOString().slice(0, 10) : null,
      diasInactivo: ultima ? this.diasDesde(ultima) : null,
    };
  }

  async actualizar(id: string, dto: ActualizarClienteDto) {
    return this.prisma.cliente.update({
      where: { id },
      data: {
        ...dto,
        cumpleanos: dto.cumpleanos ? new Date(dto.cumpleanos) : undefined,
      },
    });
  }

  /** Calcula el segmento de un cliente a partir de sus reservas y recurrentes. */
  private calcularSegmento(totalReservas: number, diasInactivo: number, tieneRecurrente: boolean): Segmento {
    if (tieneRecurrente) return "RECURRENTE";
    if (totalReservas === 0) return "NUEVO";
    if (diasInactivo > 30) return "DORMIDO";
    if (totalReservas >= 16) return "VIP";
    if (totalReservas >= 8) return "FRECUENTE";
    if (totalReservas >= 3) return "REGULAR";
    return "NUEVO";
  }

  /** Recalcula el segmento de todos los clientes. */
  async recalcularSegmentos() {
    const clientes = await this.prisma.cliente.findMany({
      include: {
        reservas: { where: ACTIVAS, select: { fecha: true } },
        recurrentes: { where: { activa: true }, select: { id: true } },
      },
    });
    let actualizados = 0;
    for (const c of clientes) {
      const ultima = c.reservas.reduce<Date | null>((max, r) => (!max || r.fecha > max ? r.fecha : max), null);
      const segmento = this.calcularSegmento(c.reservas.length, this.diasDesde(ultima), c.recurrentes.length > 0);
      if (segmento !== c.segmento) {
        await this.prisma.cliente.update({ where: { id: c.id }, data: { segmento } });
        actualizados++;
      }
    }
    this.logger.log(`Segmentos recalculados: ${actualizados}/${clientes.length} clientes actualizados`);
    return { total: clientes.length, actualizados };
  }

  /** Recalcula el segmento de un solo cliente (al crear una reserva). */
  async recalcularUno(clienteId: string) {
    const c = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
      include: {
        reservas: { where: ACTIVAS, select: { fecha: true } },
        recurrentes: { where: { activa: true }, select: { id: true } },
      },
    });
    if (!c) return;
    const ultima = c.reservas.reduce<Date | null>((max, r) => (!max || r.fecha > max ? r.fecha : max), null);
    const segmento = this.calcularSegmento(c.reservas.length, this.diasDesde(ultima), c.recurrentes.length > 0);
    if (segmento !== c.segmento) {
      await this.prisma.cliente.update({ where: { id: clienteId }, data: { segmento } });
    }
  }

  /** Exporta clientes a CSV (opcionalmente filtrado por segmento). */
  async exportarCsv(segmento?: string): Promise<string> {
    const clientes = await this.prisma.cliente.findMany({
      where: segmento ? { segmento: segmento as Segmento } : {},
      include: { reservas: { where: ACTIVAS, select: { montoTotal: true, fecha: true } } },
      orderBy: { nombre: "asc" },
    });
    const header = "Nombre,Telefono,Email,Segmento,Total reservas,Total gastado,Ultima visita";
    const esc = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`;
    const rows = clientes.map((c) => {
      const gastado = c.reservas.reduce((s, r) => s + r.montoTotal, 0);
      const ultima = c.reservas.reduce<Date | null>((max, r) => (!max || r.fecha > max ? r.fecha : max), null);
      return [
        esc(c.nombre),
        esc(c.telefono),
        esc(c.email ?? ""),
        c.segmento,
        c.reservas.length,
        gastado,
        ultima ? ultima.toISOString().slice(0, 10) : "",
      ].join(",");
    });
    return [header, ...rows].join("\n");
  }

  /** Dispara una campaña de WhatsApp por segmento vía n8n. */
  async campana(segmento: string, mensaje: string) {
    const cantidad = await this.prisma.cliente.count({
      where: segmento ? { segmento: segmento as Segmento } : {},
    });
    const url = process.env.N8N_WEBHOOK_CAMPANA;
    if (!url) return { ok: false, motivo: "N8N_WEBHOOK_CAMPANA no configurado", destinatarios: cantidad };
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segmento, mensaje }),
      });
      return { ok: true, destinatarios: cantidad };
    } catch (e) {
      this.logger.error(`No se pudo disparar la campaña: ${(e as Error).message}`);
      return { ok: false, motivo: (e as Error).message, destinatarios: cantidad };
    }
  }

  /** Cron diario: recalcula segmentos a medianoche. */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async segmentosDiarios() {
    await this.recalcularSegmentos();
  }
}
