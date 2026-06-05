import { Controller, Get, Param, Query, BadRequestException } from "@nestjs/common";
import { DisponibilidadService } from "./disponibilidad.service";

@Controller("disponibilidad")
export class DisponibilidadController {
  constructor(private readonly disponibilidad: DisponibilidadService) {}

  /** GET /api/disponibilidad/:canchaId?fecha=YYYY-MM-DD */
  @Get(":canchaId")
  porCancha(@Param("canchaId") canchaId: string, @Query("fecha") fecha: string) {
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new BadRequestException("Parametro 'fecha' requerido en formato YYYY-MM-DD");
    }
    return this.disponibilidad.porCanchaYFecha(canchaId, fecha);
  }
}
