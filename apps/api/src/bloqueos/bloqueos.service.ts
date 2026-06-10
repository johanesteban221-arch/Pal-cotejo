import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CrearBloqueoDto } from "./dto";

@Injectable()
export class BloqueosService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CrearBloqueoDto) {
    const inicio = new Date(dto.inicio);
    const fin = new Date(dto.fin);
    if (fin <= inicio) throw new BadRequestException("La hora de fin debe ser posterior al inicio");

    return this.prisma.bloqueo.create({
      data: {
        canchaId: dto.canchaId,
        inicio,
        fin,
        motivo: dto.motivo,
        nota: dto.nota,
      },
    });
  }

  /** Lista los bloqueos futuros (o de hoy en adelante). */
  listar() {
    const desde = new Date();
    desde.setHours(0, 0, 0, 0);
    return this.prisma.bloqueo.findMany({
      where: { fin: { gte: desde } },
      include: { cancha: { select: { nombre: true } } },
      orderBy: { inicio: "asc" },
    });
  }

  eliminar(id: string) {
    return this.prisma.bloqueo.delete({ where: { id } });
  }
}
