import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AgendaService } from "./agenda.service";
import { DiaDto } from "./dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

// Vista de calendario: mismos roles que /admin/reservas.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "SUPERVISOR", "CAJA")
@Controller("agenda")
export class AgendaController {
  constructor(private readonly agenda: AgendaService) {}

  @Get("dia")
  dia(@Query() q: DiaDto) {
    return this.agenda.dia(q.fecha);
  }
}
