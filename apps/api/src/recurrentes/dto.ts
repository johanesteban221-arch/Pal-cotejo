import { IsEnum, IsInt, IsOptional, IsString, Matches, Min, Max } from "class-validator";
import { FrecuenciaRecurrencia } from "@prisma/client";

export class CrearRecurrenteDto {
  @IsString()
  canchaId!: string;

  @IsString()
  nombre!: string; // cliente fijo

  @IsString()
  telefono!: string;

  @IsEnum(FrecuenciaRecurrencia)
  frecuencia!: FrecuenciaRecurrencia;

  @IsInt()
  @Min(0)
  @Max(6)
  diaSemana!: number; // 0=Dom ... 6=Sab

  @Matches(/^\d{2}:\d{2}$/)
  horaInicio!: string;

  @Matches(/^\d{2}:\d{2}$/)
  horaFin!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fechaInicio!: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fechaFin?: string;
}
