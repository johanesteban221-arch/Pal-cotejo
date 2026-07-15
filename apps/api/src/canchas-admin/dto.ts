import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CrearCanchaDto {
  @IsString()
  @MinLength(1)
  nombre!: string;

  @IsOptional()
  @IsString()
  tipo?: string; // texto libre: mesa, tejo, bolirana, cancha…

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacidad?: number;

  @IsOptional()
  @IsInt()
  orden?: number;
}

export class ActualizarCanchaDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  nombre?: string;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacidad?: number;

  @IsOptional()
  @IsInt()
  orden?: number;
}

export class CambiarEstadoCanchaDto {
  @IsBoolean()
  activa!: boolean;

  @IsOptional()
  @IsBoolean()
  confirmar?: boolean;
}
