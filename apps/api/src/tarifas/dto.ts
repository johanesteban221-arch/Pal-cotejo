import { IsBoolean, IsInt, IsOptional, Min } from "class-validator";

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
