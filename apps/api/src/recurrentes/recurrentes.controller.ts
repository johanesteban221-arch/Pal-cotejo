import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { RecurrentesService } from "./recurrentes.service";
import { CrearRecurrenteDto } from "./dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller("recurrentes")
export class RecurrentesController {
  constructor(private readonly recurrentes: RecurrentesService) {}

  @Post()
  crear(@Body() dto: CrearRecurrenteDto) {
    return this.recurrentes.crear(dto);
  }

  @Get()
  listar() {
    return this.recurrentes.listar();
  }

  @Delete(":id")
  eliminar(@Param("id") id: string) {
    return this.recurrentes.eliminar(id);
  }

  /** Genera las próximas N reservas de la regla. POST /recurrentes/:id/generar?cantidad=4 */
  @Post(":id/generar")
  generar(@Param("id") id: string, @Query("cantidad") cantidad?: string) {
    return this.recurrentes.generar(id, cantidad ? Number(cantidad) : 4);
  }
}
