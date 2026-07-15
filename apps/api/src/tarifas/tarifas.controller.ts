import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { TarifasService } from "./tarifas.service";
import { ActualizarPrecioDto, CambiarEstadoDto, CrearTarifaDto, EditarFranjaDto } from "./dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

// Gestión de tarifas: exclusivamente ADMIN.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/tarifas")
export class TarifasController {
  constructor(private readonly tarifas: TarifasService) {}

  @Post()
  crear(@Body() dto: CrearTarifaDto) {
    return this.tarifas.crear(dto);
  }

  @Get()
  listar() {
    return this.tarifas.listar();
  }

  @Patch(":id")
  actualizarPrecio(@Param("id") id: string, @Body() dto: ActualizarPrecioDto) {
    return this.tarifas.actualizarPrecio(id, dto.precio);
  }

  @Patch(":id/estado")
  cambiarEstado(@Param("id") id: string, @Body() dto: CambiarEstadoDto) {
    return this.tarifas.cambiarEstado(id, dto.activa, dto.confirmar);
  }

  @Patch(":id/franja")
  editarFranja(@Param("id") id: string, @Body() dto: EditarFranjaDto) {
    return this.tarifas.editarFranja(id, dto);
  }
}
