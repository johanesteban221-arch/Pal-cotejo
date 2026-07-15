import { Module } from "@nestjs/common";
import { CanchasAdminController } from "./canchas-admin.controller";
import { CanchasAdminService } from "./canchas-admin.service";

@Module({
  controllers: [CanchasAdminController],
  providers: [CanchasAdminService],
})
export class CanchasAdminModule {}
