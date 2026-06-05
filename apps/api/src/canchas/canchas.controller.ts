import { Controller, Get, Param } from "@nestjs/common";
import { CanchasService } from "./canchas.service";

@Controller("canchas")
export class CanchasController {
  constructor(private readonly canchas: CanchasService) {}

  @Get()
  listar() {
    return this.canchas.listar();
  }

  @Get(":id")
  obtener(@Param("id") id: string) {
    return this.canchas.obtener(id);
  }
}
