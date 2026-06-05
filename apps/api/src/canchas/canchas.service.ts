import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CanchasService {
  constructor(private prisma: PrismaService) {}

  listar() {
    return this.prisma.cancha.findMany({
      where: { activa: true },
      orderBy: { nombre: "asc" },
    });
  }

  obtener(id: string) {
    return this.prisma.cancha.findUnique({
      where: { id },
      include: { tarifas: { where: { activa: true } } },
    });
  }
}
