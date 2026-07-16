import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CrearMesaDto {
  @IsString()
  @MinLength(1)
  nombre!: string;

  // Si no se manda, aplica el default 4 del schema.
  @IsOptional()
  @IsInt()
  @Min(1)
  capacidad?: number;
}

export class ActualizarMesaDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  nombre?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacidad?: number;
}

export class CambiarEstadoMesaDto {
  @IsBoolean()
  activa!: boolean;
}
