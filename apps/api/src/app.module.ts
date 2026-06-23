import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./prisma/prisma.module";
import { CanchasModule } from "./canchas/canchas.module";
import { DisponibilidadModule } from "./disponibilidad/disponibilidad.module";
import { ReservasModule } from "./reservas/reservas.module";
import { PagosModule } from "./pagos/pagos.module";
import { ReportesModule } from "./reportes/reportes.module";
import { AuthModule } from "./auth/auth.module";
import { BloqueosModule } from "./bloqueos/bloqueos.module";
import { RecurrentesModule } from "./recurrentes/recurrentes.module";
import { IntegracionModule } from "./integracion/integracion.module";
import { HealthModule } from "./health/health.module";
import { ClientesModule } from "./clientes/clientes.module";
import { PosModule } from "./pos/pos.module";
import { envValidationSchema } from "./config/env.validation";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    CanchasModule,
    DisponibilidadModule,
    ReservasModule,
    PagosModule,
    ReportesModule,
    BloqueosModule,
    RecurrentesModule,
    IntegracionModule,
    HealthModule,
    ClientesModule,
    PosModule,
  ],
})
export class AppModule {}
