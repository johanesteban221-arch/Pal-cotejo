import { Global, Module } from "@nestjs/common";
import { NotificacionesService } from "./notificaciones.service";

// Global: cualquier servicio (pos, conteo, reservas…) inyecta NotificacionesService
// sin importar este módulo — como PrismaModule.
@Global()
@Module({
  providers: [NotificacionesService],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
