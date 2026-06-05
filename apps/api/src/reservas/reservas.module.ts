import { Module } from "@nestjs/common";
import { ReservasController } from "./reservas.controller";
import { ReservasService } from "./reservas.service";
import { DisponibilidadModule } from "../disponibilidad/disponibilidad.module";

@Module({
  imports: [DisponibilidadModule],
  controllers: [ReservasController],
  providers: [ReservasService],
  exports: [ReservasService],
})
export class ReservasModule {}
