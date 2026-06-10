import { Module } from "@nestjs/common";
import { RecurrentesController } from "./recurrentes.controller";
import { RecurrentesService } from "./recurrentes.service";

@Module({
  controllers: [RecurrentesController],
  providers: [RecurrentesService],
})
export class RecurrentesModule {}
