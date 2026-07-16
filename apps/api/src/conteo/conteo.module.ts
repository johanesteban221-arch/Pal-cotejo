import { Module } from "@nestjs/common";
import { ConteoController } from "./conteo.controller";
import { ConteoService } from "./conteo.service";

@Module({
  controllers: [ConteoController],
  providers: [ConteoService],
})
export class ConteoModule {}
