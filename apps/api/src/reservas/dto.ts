import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Matches } from "class-validator";

export class CrearReservaDto {
  @IsString()
  canchaId!: string;

  // Fecha YYYY-MM-DD
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha!: string;

  @Matches(/^\d{2}:\d{2}$/)
  horaInicio!: string;

  @Matches(/^\d{2}:\d{2}$/)
  horaFin!: string;

  // Datos del cliente
  @IsString()
  nombre!: string;

  @IsString()
  telefono!: string; // formato internacional +57...

  @IsOptional()
  @IsEmail()
  email?: string;

  // Modalidad de pago: true = abono (%), false = 100%
  @IsOptional()
  @IsBoolean()
  pagarAbono?: boolean;

  // Venta cruzada: reservar mesa en el bar
  @IsOptional()
  @IsBoolean()
  reservarMesa?: boolean;

  @IsOptional()
  @IsInt()
  personasMesa?: number;
}
