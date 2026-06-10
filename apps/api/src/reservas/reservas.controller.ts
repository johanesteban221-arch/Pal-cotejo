import { Body, Controller, Get, Param, Post, Query, BadRequestException, UseGuards } from "@nestjs/common";
import { ReservasService } from "./reservas.service";
import { CrearReservaDto, CrearReservaManualDto } from "./dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("reservas")
export class ReservasController {
  constructor(private readonly reservas: ReservasService) {}

  // Pública: la usa el cliente al reservar desde la web.
  @Post()
  crear(@Body() dto: CrearReservaDto) {
    return this.reservas.crear(dto);
  }

  // Reserva manual ingresada por caja: requiere sesión de staff.
  @UseGuards(JwtAuthGuard)
  @Post("manual")
  crearManual(@Body() dto: CrearReservaManualDto) {
    return this.reservas.crearManual(dto);
  }

  // Acción de caja: requiere sesión de staff.
  @UseGuards(JwtAuthGuard)
  @Post(":id/cancelar")
  cancelar(@Param("id") id: string, @Body("motivo") motivo?: string) {
    return this.reservas.cancelar(id, motivo);
  }

  /** GET /api/reservas?fecha=YYYY-MM-DD (panel admin) — requiere sesión. */
  @UseGuards(JwtAuthGuard)
  @Get()
  listar(@Query("fecha") fecha: string) {
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new BadRequestException("Parametro 'fecha' requerido (YYYY-MM-DD)");
    }
    return this.reservas.listarPorFecha(fecha);
  }
}
