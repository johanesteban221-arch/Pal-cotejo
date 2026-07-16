import { join } from "path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule } from "@nestjs/throttler";
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
import { UsuariosModule } from "./usuarios/usuarios.module";
import { TarifasModule } from "./tarifas/tarifas.module";
import { CanchasAdminModule } from "./canchas-admin/canchas-admin.module";
import { AgendaModule } from "./agenda/agenda.module";
import { MetodosCobroModule } from "./metodos-cobro/metodos-cobro.module";
import { ConteoModule } from "./conteo/conteo.module";
import { NotificacionesModule } from "./notificaciones/notificaciones.module";
import { envValidationSchema } from "./config/env.validation";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Dev: el .env vive en la raiz del monorepo, pero `nest start` corre con
      // cwd en apps/api. Cargamos ambos candidatos (apps/api/.env tiene prioridad
      // si existe; si no, el .env de la raiz). En prod estos archivos no existen
      // y las vars vienen del entorno del contenedor -> sin efecto.
      envFilePath: [".env", join(process.cwd(), "..", "..", ".env")],
      validationSchema: envValidationSchema,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    ScheduleModule.forRoot(),
    // Rate limiting: config + almacenamiento (in-memory, 1 instancia en Easypanel).
    // El guard NO es global; solo se aplica al login (ver auth.controller).
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 5, blockDuration: 300000 }]),
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
    UsuariosModule,
    TarifasModule,
    CanchasAdminModule,
    AgendaModule,
    MetodosCobroModule,
    ConteoModule,
    NotificacionesModule,
  ],
})
export class AppModule {}
