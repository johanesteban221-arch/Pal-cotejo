import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from "class-validator";
import { TipoTarifa } from "@prisma/client";

export class ActualizarPrecioDto {
  @IsInt()
  @Min(0)
  precio!: number;
}

// FASE B: solo declara activa + confirmar. El whitelist descarta precio/horarios/día.
export class CambiarEstadoDto {
  @IsBoolean()
  activa!: boolean;

  @IsOptional()
  @IsBoolean()
  confirmar?: boolean;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CrearTarifaDto {
  @IsString()
  canchaId!: string;

  // null = todos los días; si viene número, debe ser 0..6.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  diaSemana?: number | null;

  @IsString()
  @Matches(HHMM, { message: "horaInicio debe tener formato HH:mm" })
  horaInicio!: string;

  @IsString()
  @Matches(HHMM, { message: "horaFin debe tener formato HH:mm" })
  horaFin!: string;

  @IsInt()
  @Min(0)
  precio!: number;

  @IsEnum(TipoTarifa)
  tipo!: TipoTarifa;
}
