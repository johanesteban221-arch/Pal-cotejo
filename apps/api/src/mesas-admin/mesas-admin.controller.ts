import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { MesasAdminService } from "./mesas-admin.service";
import { ActualizarMesaDto, CambiarEstadoMesaDto, CrearMesaDto } from "./dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

// Gestión de mesas del salón: exclusivamente ADMIN.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/mesas")
export class MesasAdminController {
  constructor(private readonly mesas: MesasAdminService) {}

  @Get()
  listar() {
    return this.mesas.listar();
  }

  @Post()
  crear(@Body() dto: CrearMesaDto) {
    return this.mesas.crear(dto);
  }

  @Patch(":id")
  actualizar(@Param("id") id: string, @Body() dto: ActualizarMesaDto) {
    return this.mesas.actualizar(id, dto);
  }

  @Patch(":id/estado")
  cambiarEstado(@Param("id") id: string, @Body() dto: CambiarEstadoMesaDto) {
    return this.mesas.cambiarEstado(id, dto.activa);
  }
}
