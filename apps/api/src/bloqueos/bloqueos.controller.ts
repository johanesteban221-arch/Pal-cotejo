import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { BloqueosService } from "./bloqueos.service";
import { CrearBloqueoDto } from "./dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

// Gestión de bloqueos: solo staff autenticado.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "SUPERVISOR")
@Controller("bloqueos")
export class BloqueosController {
  constructor(private readonly bloqueos: BloqueosService) {}

  @Post()
  crear(@Body() dto: CrearBloqueoDto) {
    return this.bloqueos.crear(dto);
  }

  @Get()
  listar() {
    return this.bloqueos.listar();
  }

  @Delete(":id")
  eliminar(@Param("id") id: string) {
    return this.bloqueos.eliminar(id);
  }
}
