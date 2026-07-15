import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CanchasAdminService } from "./canchas-admin.service";
import { ActualizarCanchaDto, CambiarEstadoCanchaDto, CrearCanchaDto } from "./dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

// Gestión de recursos reservables: exclusivamente ADMIN.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/canchas")
export class CanchasAdminController {
  constructor(private readonly canchas: CanchasAdminService) {}

  @Get()
  listar() {
    return this.canchas.listar();
  }

  @Post()
  crear(@Body() dto: CrearCanchaDto) {
    return this.canchas.crear(dto);
  }

  @Patch(":id")
  actualizar(@Param("id") id: string, @Body() dto: ActualizarCanchaDto) {
    return this.canchas.actualizar(id, dto);
  }

  @Patch(":id/estado")
  cambiarEstado(@Param("id") id: string, @Body() dto: CambiarEstadoCanchaDto) {
    return this.canchas.cambiarEstado(id, dto.activa, dto.confirmar);
  }
}
