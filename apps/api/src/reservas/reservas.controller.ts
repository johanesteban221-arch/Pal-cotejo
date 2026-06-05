import { Body, Controller, Get, Param, Post, Query, BadRequestException } from "@nestjs/common";
import { ReservasService } from "./reservas.service";
import { CrearReservaDto } from "./dto";

@Controller("reservas")
export class ReservasController {
  constructor(private readonly reservas: ReservasService) {}

  @Post()
  crear(@Body() dto: CrearReservaDto) {
    return this.reservas.crear(dto);
  }

  @Post(":id/cancelar")
  cancelar(@Param("id") id: string, @Body("motivo") motivo?: string) {
    return this.reservas.cancelar(id, motivo);
  }

  /** GET /api/reservas?fecha=YYYY-MM-DD (panel admin) */
  @Get()
  listar(@Query("fecha") fecha: string) {
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new BadRequestException("Parametro 'fecha' requerido (YYYY-MM-DD)");
    }
    return this.reservas.listarPorFecha(fecha);
  }
}
