import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ConteoService } from "./conteo.service";
import { GuardarLineaDto } from "./dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

// Conteo físico de inventario — flujo del cajero, a ciegas. A·S·C.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "SUPERVISOR", "CAJA")
@Controller("pos/conteo")
export class ConteoController {
  constructor(private readonly conteo: ConteoService) {}

  @Post("abrir")
  abrir(@Req() req: any) {
    return this.conteo.abrir(req.user.sub);
  }

  @Get("actual")
  actual() {
    return this.conteo.actual();
  }

  @Patch("linea/:lineaId")
  guardarLinea(@Param("lineaId") lineaId: string, @Body() dto: GuardarLineaDto) {
    return this.conteo.guardarLinea(lineaId, dto.stockContado);
  }

  @Post("enviar")
  enviar() {
    return this.conteo.enviar();
  }

  // ── Revisión y ajuste — solo ADMIN/SUPERVISOR ──
  @Roles("ADMIN", "SUPERVISOR")
  @Get("pendientes")
  pendientes() {
    return this.conteo.pendientes();
  }

  @Roles("ADMIN", "SUPERVISOR")
  @Get(":id/revision")
  revision(@Param("id") id: string) {
    return this.conteo.revision(id);
  }

  @Roles("ADMIN", "SUPERVISOR")
  @Post(":id/ajustar-linea/:lineaId")
  ajustarLinea(@Param("id") id: string, @Param("lineaId") lineaId: string, @Req() req: any) {
    return this.conteo.ajustarLinea(id, lineaId, req.user.sub);
  }

  @Roles("ADMIN", "SUPERVISOR")
  @Post(":id/cerrar")
  cerrar(@Param("id") id: string, @Req() req: any) {
    return this.conteo.cerrar(id, req.user.sub);
  }
}
