import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { MetodosCobroService } from "./metodos-cobro.service";
import { ActualizarMetodoCobroDto, CambiarEstadoMetodoCobroDto, CrearMetodoCobroDto } from "./dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

// Catálogo de métodos de cobro del POS: exclusivamente ADMIN.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/metodos-cobro")
export class MetodosCobroController {
  constructor(private readonly metodos: MetodosCobroService) {}

  @Get()
  listar() {
    return this.metodos.listar();
  }

  @Post()
  crear(@Body() dto: CrearMetodoCobroDto) {
    return this.metodos.crear(dto);
  }

  @Patch(":id")
  actualizar(@Param("id") id: string, @Body() dto: ActualizarMetodoCobroDto) {
    return this.metodos.actualizar(id, dto);
  }

  @Patch(":id/estado")
  cambiarEstado(@Param("id") id: string, @Body() dto: CambiarEstadoMetodoCobroDto) {
    return this.metodos.cambiarEstado(id, dto.activo);
  }
}
