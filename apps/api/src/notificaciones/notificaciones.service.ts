import { Injectable, Logger } from "@nestjs/common";
import { TipoAlerta } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Helper central de alertas al dueño (vía n8n). Diseñado para ser invocado SIN await
 * desde cualquier servicio, SIEMPRE después del commit (nunca dentro de un $transaction).
 */
@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Dispara una alerta SIN BLOQUEAR: retorna void de inmediato; el trabajo real
   * (leer config + fetch a n8n) corre en segundo plano. NUNCA lanza — el llamante
   * puede invocarlo sin try/catch y su operación jamás se cae.
   */
  dispararAlerta(tipo: TipoAlerta, payload: Record<string, unknown>): void {
    // `procesar` es async → llamarlo NUNCA lanza sincrónicamente (una rejección se
    // convierte en promesa rechazada). El .catch final es la red de seguridad última.
    void this.procesar(tipo, payload).catch((e) =>
      this.logger.error(`Alerta ${tipo} (inesperado): ${(e as Error).message}`),
    );
  }

  private async procesar(tipo: TipoAlerta, payload: Record<string, unknown>): Promise<void> {
    try {
      // a. Config de esta alerta. Si no existe o está desactivada → no dispara.
      const cfg = await this.prisma.configuracionAlerta.findUnique({ where: { tipo } });
      if (!cfg || !cfg.activo) return;

      // b. CAJA_CERRADA respeta el modo: en SOLO_DESCUADRE no avisa si cuadró (diferencia 0).
      if (tipo === "CAJA_CERRADA" && cfg.modo === "SOLO_DESCUADRE") {
        const dif = Number((payload as { diferencia?: unknown }).diferencia ?? 0);
        if (dif === 0) return;
      }

      // c. Webhook. Si no está configurado → no-op SILENCIOSO (esperado, sin logger.error).
      const url = process.env.N8N_WEBHOOK_ALERTA;
      if (!url) return;

      // d. POST con el sobre { tipo, ...payload, timestamp }. Timeout para no colgar.
      const body = { tipo, ...payload, timestamp: new Date().toISOString() };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) this.logger.error(`Alerta ${tipo}: n8n respondió ${res.status}`);
    } catch (e) {
      // Cualquier fallo (red, timeout, config, JSON…) SOLO se loguea. Jamás se propaga.
      this.logger.error(`No se pudo disparar la alerta ${tipo}: ${(e as Error).message}`);
    }
  }
}
