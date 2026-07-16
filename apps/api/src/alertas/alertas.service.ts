import { BadRequestException, Injectable } from "@nestjs/common";
import { TipoAlerta } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ActualizarAlertaDto } from "./dto";

const TIPOS_VALIDOS = Object.values(TipoAlerta) as TipoAlerta[];

@Injectable()
export class AlertasService {
  constructor(private prisma: PrismaService) {}

  // Las 5 filas de config (tipo, activo, modo, actualizadoEn). NO expone nada del webhook.
  listar() {
    return this.prisma.configuracionAlerta.findMany({ orderBy: { tipo: "asc" } });
  }

  async actualizar(tipoRaw: string, dto: ActualizarAlertaDto) {
    if (!TIPOS_VALIDOS.includes(tipoRaw as TipoAlerta)) {
      throw new BadRequestException("Tipo de alerta no válido");
    }
    const tipo = tipoRaw as TipoAlerta;

    const data: { activo?: boolean; modo?: string } = {};
    if (dto.activo !== undefined) data.activo = dto.activo;

    if (dto.modo !== undefined) {
      // El modo SOLO tiene sentido en CAJA_CERRADA (siempre vs solo-descuadre).
      if (tipo !== "CAJA_CERRADA") {
        throw new BadRequestException("El modo solo aplica a CAJA_CERRADA");
      }
      data.modo = dto.modo; // el valor ya está validado por el DTO (@IsIn)
    }

    // Upsert por PK (tipo). La fila existe por el seed; upsert cubre el caso de que falte.
    return this.prisma.configuracionAlerta.upsert({
      where: { tipo },
      update: data,
      create: {
        tipo,
        activo: data.activo ?? false,
        modo: data.modo ?? (tipo === "CAJA_CERRADA" ? "SOLO_DESCUADRE" : null),
      },
    });
  }
}
