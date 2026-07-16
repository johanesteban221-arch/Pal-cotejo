import { Module } from "@nestjs/common";
import { MesasAdminController } from "./mesas-admin.controller";
import { MesasAdminService } from "./mesas-admin.service";

@Module({
  controllers: [MesasAdminController],
  providers: [MesasAdminService],
})
export class MesasAdminModule {}
