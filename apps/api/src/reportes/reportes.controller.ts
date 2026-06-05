import { Controller, Get, Query } from "@nestjs/common";
import { ReportesService } from "./reportes.service";

@Controller("reportes")
export class ReportesController {
  constructor(private readonly reportes: ReportesService) {}

  @Get("resumen")
  resumen() {
    return this.reportes.resumen();
  }

  @Get("ingresos-diarios")
  ingresosDiarios(@Query("dias") dias?: string) {
    return this.reportes.ingresosDiarios(dias ? Number(dias) : 30);
  }

  @Get("horas-rentables")
  horasRentables() {
    return this.reportes.horasRentables();
  }

  @Get("ocupacion-canchas")
  ocupacionCanchas() {
    return this.reportes.ocupacionCanchas();
  }

  @Get("top-clientes")
  topClientes() {
    return this.reportes.topClientes();
  }
}
