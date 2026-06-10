import { Injectable, Logger } from "@nestjs/common";
import { createHash } from "crypto";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Maneja los eventos (webhooks) de Wompi.
 * Doc: https://docs.wompi.co/docs/colombia/eventos/
 */
@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);

  constructor(private prisma: PrismaService) {}

  /** Verifica la firma del evento segun el secreto de eventos de Wompi. */
  verificarFirma(body: any): boolean {
    const secret = process.env.WOMPI_EVENTS_SECRET;
    if (!secret) {
      this.logger.warn("WOMPI_EVENTS_SECRET no configurado — firma no verificada");
      return false;
    }
    const props: string[] = body?.signature?.properties ?? [];
    const checksumRecibido: string = body?.signature?.checksum ?? "";
    const timestamp = body?.timestamp ?? "";

    // Concatena el valor de cada propiedad listada + timestamp + secret
    let cadena = "";
    for (const ruta of props) {
      const valor = ruta.split(".").reduce((acc: any, k: string) => acc?.[k], body.data);
      cadena += valor;
    }
    cadena += timestamp + secret;
    const checksumCalculado = createHash("sha256").update(cadena).digest("hex").toUpperCase();
    return checksumCalculado === checksumRecibido?.toUpperCase();
  }

  /**
   * Procesa transaction.updated. La 'reference' de Wompi debe contener el id
   * de la reserva (lo definimos al crear la transaccion en el frontend).
   */
  async procesarEvento(body: any) {
    const tx = body?.data?.transaction;
    if (!tx) return { ok: false, motivo: "Sin transaccion en el evento" };

    const reservaId: string = tx.reference;
    const reserva = await this.prisma.reserva.findUnique({ where: { id: reservaId } });
    if (!reserva) {
      this.logger.warn(`Reserva ${reservaId} no encontrada para tx ${tx.id}`);
      return { ok: false, motivo: "Reserva no encontrada" };
    }

    const montoCop = Math.round((tx.amount_in_cents ?? 0) / 100);
    const aprobado = tx.status === "APPROVED";

    await this.prisma.$transaction(async (db) => {
      await db.pago.upsert({
        where: { referenciaPasarela: tx.id },
        update: {
          estado: aprobado ? "APROBADO" : tx.status === "DECLINED" ? "RECHAZADO" : "PENDIENTE",
          payloadPasarela: tx,
        },
        create: {
          reservaId,
          monto: montoCop,
          tipo: montoCop >= reserva.montoTotal ? "TOTAL" : "ABONO",
          metodo: "WOMPI_TARJETA",
          estado: aprobado ? "APROBADO" : "PENDIENTE",
          referenciaPasarela: tx.id,
          payloadPasarela: tx,
        },
      });

      if (aprobado) {
        const nuevoAbonado = reserva.montoAbonado + montoCop;
        await db.reserva.update({
          where: { id: reservaId },
          data: {
            estado: "CONFIRMADA",
            montoAbonado: nuevoAbonado,
            saldo: Math.max(0, reserva.montoTotal - nuevoAbonado),
          },
        });
      }
    });

    if (aprobado) await this.notificarN8n(reservaId);
    return { ok: true, aprobado };
  }

  /** Dispara el flujo de n8n (WhatsApp + Email de confirmacion) con los datos completos. */
  private async notificarN8n(reservaId: string) {
    const url = process.env.N8N_WEBHOOK_RESERVA_CONFIRMADA;
    if (!url) return;
    try {
      const reserva = await this.prisma.reserva.findUnique({
        where: { id: reservaId },
        include: { cliente: true, cancha: true, reservaMesa: true },
      });
      if (!reserva) return;

      // Payload plano y listo para que n8n arme el mensaje
      const payload = {
        reservaId: reserva.id,
        codigo: reserva.id.slice(-6).toUpperCase(),
        clienteNombre: reserva.cliente.nombre,
        clienteTelefono: reserva.cliente.telefono, // formato +57...
        clienteEmail: reserva.cliente.email ?? null,
        cancha: reserva.cancha.nombre,
        fecha: reserva.fecha.toISOString().slice(0, 10),
        horaInicio: reserva.horaInicio,
        horaFin: reserva.horaFin,
        montoTotal: reserva.montoTotal,
        montoAbonado: reserva.montoAbonado,
        saldoEnCaja: reserva.saldo,
        tieneMesa: !!reserva.reservaMesa,
        personasMesa: reserva.reservaMesa?.personas ?? null,
      };

      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      this.logger.error(`No se pudo notificar a n8n: ${(e as Error).message}`);
    }
  }
}
