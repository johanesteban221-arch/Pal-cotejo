import { Body, Controller, Post, HttpCode } from "@nestjs/common";
import { PagosService } from "./pagos.service";

@Controller("pagos")
export class PagosController {
  constructor(private readonly pagos: PagosService) {}

  /** Webhook que Wompi llama al cambiar el estado de una transaccion. */
  @Post("wompi/webhook")
  @HttpCode(200)
  async webhook(@Body() body: any) {
    const firmaOk = this.pagos.verificarFirma(body);
    if (!firmaOk) {
      // Respondemos 200 para que Wompi no reintente, pero no procesamos.
      return { ok: false, motivo: "Firma invalida" };
    }
    return this.pagos.procesarEvento(body);
  }
}
