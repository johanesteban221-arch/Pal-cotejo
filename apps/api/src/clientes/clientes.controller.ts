import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { ClientesService } from "./clientes.service";
import { ActualizarClienteDto, CampanaDto } from "./dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "CAJA")
@Controller("admin/clientes")
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  @Get()
  listar(
    @Query("segmento") segmento?: string,
    @Query("buscar") buscar?: string,
    @Query("page") page?: string,
  ) {
    return this.clientes.listar({ segmento, buscar, page: page ? Number(page) : 1 });
  }

  @Get("resumen")
  resumen() {
    return this.clientes.resumenSegmentos();
  }

  /** Descarga CSV. */
  @Get("exportar")
  async exportar(@Res() res: Response, @Query("segmento") segmento?: string) {
    const csv = await this.clientes.exportarCsv(segmento);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="clientes-pal-cotejo.csv"');
    res.send(csv);
  }

  @Get(":id")
  perfil(@Param("id") id: string) {
    return this.clientes.perfil(id);
  }

  @Get(":id/stats")
  stats(@Param("id") id: string) {
    return this.clientes.stats(id);
  }

  @Patch(":id")
  actualizar(@Param("id") id: string, @Body() dto: ActualizarClienteDto) {
    return this.clientes.actualizar(id, dto);
  }

  // Acciones solo de ADMIN
  @Roles("ADMIN")
  @Post("recalcular-segmentos")
  recalcular() {
    return this.clientes.recalcularSegmentos();
  }

  @Roles("ADMIN")
  @Post("campana")
  campana(@Body() dto: CampanaDto) {
    return this.clientes.campana(dto.segmento, dto.mensaje);
  }
}
