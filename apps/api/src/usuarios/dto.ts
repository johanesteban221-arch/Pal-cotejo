import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { RolStaff } from "@prisma/client";

export class CrearUsuarioDto {
  @IsString()
  @MinLength(2)
  nombre!: string;

  @IsEmail()
  email!: string;

  // La regla por rol (min 6 / PIN de 4 digitos para CAJA) se valida en el service,
  // porque depende del rol; aqui solo exigimos que sea texto no vacio.
  @IsString()
  @MinLength(1)
  password!: string;

  @IsEnum(RolStaff)
  rol!: RolStaff;
}

export class ActualizarUsuarioDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;

  @IsOptional()
  @IsEnum(RolStaff)
  rol?: RolStaff;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class CambiarPasswordDto {
  @IsString()
  @MinLength(1)
  password!: string;
}
