import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { CanchasModule } from "./canchas/canchas.module";
import { DisponibilidadModule } from "./disponibilidad/disponibilidad.module";
import { ReservasModule } from "./reservas/reservas.module";
import { PagosModule } from "./pagos/pagos.module";
import { ReportesModule } from "./reportes/reportes.module";
import { AuthModule } from "./auth/auth.module";
import { BloqueosModule } from "./bloqueos/bloqueos.module";
import { RecurrentesModule } from "./recurrentes/recurrentes.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CanchasModule,
    DisponibilidadModule,
    ReservasModule,
    PagosModule,
    ReportesModule,
    BloqueosModule,
    RecurrentesModule,
  ],
})
export class AppModule {}
