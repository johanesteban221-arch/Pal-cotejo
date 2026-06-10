import { IsEnum, IsISO8601, IsOptional, IsString } from "class-validator";
import { MotivoBloqueo } from "@prisma/client";

export class CrearBloqueoDto {
  @IsString()
  canchaId!: string;

  // Fecha-hora ISO (ej. 2026-06-12T14:00:00)
  @IsISO8601()
  inicio!: string;

  @IsISO8601()
  fin!: string;

  @IsEnum(MotivoBloqueo)
  motivo!: MotivoBloqueo;

  @IsOptional()
  @IsString()
  nota?: string;
}
