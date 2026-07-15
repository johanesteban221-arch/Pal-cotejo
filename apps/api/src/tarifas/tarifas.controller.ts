import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { TarifasService } from "./tarifas.service";
import { ActualizarPrecioDto } from "./dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

// Gestión de tarifas: exclusivamente ADMIN.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/tarifas")
export class TarifasController {
  constructor(private readonly tarifas: TarifasService) {}

  @Get()
  listar() {
    return this.tarifas.listar();
  }

  @Patch(":id")
  actualizarPrecio(@Param("id") id: string, @Body() dto: ActualizarPrecioDto) {
    return this.tarifas.actualizarPrecio(id, dto.precio);
  }
}
