import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MinLength } from "class-validator";
import { TipoVerificacion } from "@prisma/client";

export class CrearMetodoCobroDto {
  @IsString()
  @MinLength(1)
  nombre!: string;

  // Slug de referencia. Se normaliza a MAYÚSCULAS con "_" en el service.
  @IsString()
  @MinLength(1)
  codigo!: string;

  @IsEnum(TipoVerificacion)
  verificacion!: TipoVerificacion;

  @IsOptional()
  @IsInt()
  orden?: number;
}

// NO incluye `codigo`: es inmutable. Con el ValidationPipe (whitelist:true),
// cualquier `codigo` en el body se descarta antes de llegar al service.
export class ActualizarMetodoCobroDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  nombre?: string;

  @IsOptional()
  @IsEnum(TipoVerificacion)
  verificacion?: TipoVerificacion;

  @IsOptional()
  @IsInt()
  orden?: number;
}

export class CambiarEstadoMetodoCobroDto {
  @IsBoolean()
  activo!: boolean;
}
