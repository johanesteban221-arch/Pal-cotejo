import { IsEmail, IsISO8601, IsOptional, IsString } from "class-validator";

export class ActualizarClienteDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() equipo?: string;
  @IsOptional() @IsString() canchaFavorita?: string;
  @IsOptional() @IsString() horarioHabitual?: string;
  @IsOptional() @IsISO8601() cumpleanos?: string;
  @IsOptional() @IsString() notas?: string;
}

export class CampanaDto {
  @IsString() segmento!: string;
  @IsString() mensaje!: string;
}
