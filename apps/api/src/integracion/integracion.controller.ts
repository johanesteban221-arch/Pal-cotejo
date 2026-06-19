import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { IntegracionService } from "./integracion.service";
import { ApiKeyGuard } from "./api-key.guard";

// Endpoints consumidos por n8n. Protegidos por API key (header x-api-key).
@UseGuards(ApiKeyGuard)
@Controller("integracion")
export class IntegracionController {
  constructor(private readonly integracion: IntegracionService) {}

  /** Reservas próximas a las que toca enviar recordatorio. */
  @Get("recordatorios")
  recordatorios(@Query("min") min?: string, @Query("max") max?: string) {
    return this.integracion.recordatoriosPendientes(
      min ? Number(min) : 150,
      max ? Number(max) : 210,
    );
  }

  /** Marca reservas como recordadas. Body: { ids: [...] } */
  @Post("recordatorios/marcar")
  marcar(@Body("ids") ids: string[]) {
    return this.integracion.marcarRecordadas(ids);
  }

  /** Resumen del día para el dueño. */
  @Get("reporte-diario")
  reporteDiario() {
    return this.integracion.reporteDiario();
  }

  /** Clientes de un segmento (para campañas de WhatsApp). */
  @Get("clientes")
  clientes(@Query("segmento") segmento?: string) {
    return this.integracion.clientesPorSegmento(segmento);
  }
}
