import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { AlertasService } from "./alertas.service";
import { ActualizarAlertaDto } from "./dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

// Config de alertas al dueño: exclusivamente ADMIN.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("alertas")
export class AlertasController {
  constructor(private readonly alertas: AlertasService) {}

  @Get("config")
  listar() {
    return this.alertas.listar();
  }

  @Patch("config/:tipo")
  actualizar(@Param("tipo") tipo: string, @Body() dto: ActualizarAlertaDto) {
    return this.alertas.actualizar(tipo, dto);
  }
}
