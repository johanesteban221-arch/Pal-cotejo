import { Module } from "@nestjs/common";
import { MetodosCobroController } from "./metodos-cobro.controller";
import { MetodosCobroService } from "./metodos-cobro.service";

@Module({
  controllers: [MetodosCobroController],
  providers: [MetodosCobroService],
})
export class MetodosCobroModule {}
