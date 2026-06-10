import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Matches } from "class-validator";

/** Reserva ingresada por caja (cliente que llama o llega al local). */
export class CrearReservaManualDto {
  @IsString()
  canchaId!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha!: string;

  @Matches(/^\d{2}:\d{2}$/)
  horaInicio!: string;

  @Matches(/^\d{2}:\d{2}$/)
  horaFin!: string;

  @IsString()
  nombre!: string;

  @IsString()
  telefono!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  // ¿Ya pagó en caja el total? Si no, queda como saldo pendiente.
  @IsOptional()
  @IsBoolean()
  pagado?: boolean;
}

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
