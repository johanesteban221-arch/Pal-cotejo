import { Module } from "@nestjs/common";
import { ReservasController } from "./reservas.controller";
import { ReservasService } from "./reservas.service";
import { DisponibilidadModule } from "../disponibilidad/disponibilidad.module";
import { ClientesModule } from "../clientes/clientes.module";

@Module({
  imports: [DisponibilidadModule, ClientesModule],
  controllers: [ReservasController],
  providers: [ReservasService],
  exports: [ReservasService],
})
export class ReservasModule {}
