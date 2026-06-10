import { Module } from "@nestjs/common";
import { BloqueosController } from "./bloqueos.controller";
import { BloqueosService } from "./bloqueos.service";

@Module({
  controllers: [BloqueosController],
  providers: [BloqueosService],
})
export class BloqueosModule {}
