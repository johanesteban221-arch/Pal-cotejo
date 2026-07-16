import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { CategoriaProducto } from "@prisma/client";

export class CrearProductoDto {
  @IsString() nombre!: string;
  @IsEnum(CategoriaProducto) categoria!: CategoriaProducto;
  @IsInt() @Min(0) precio!: number;
  @IsOptional() @IsInt() @Min(0) stock?: number;
  @IsOptional() @IsInt() @Min(0) stockMinimo?: number;
  @IsOptional() @IsInt() @Min(1) unidades?: number;
  @IsOptional() @IsString() stockBaseId?: string;
}

export class ActualizarProductoDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsEnum(CategoriaProducto) categoria?: CategoriaProducto;
  @IsOptional() @IsInt() @Min(0) precio?: number;
  @IsOptional() @IsInt() @Min(0) stockMinimo?: number;
  @IsOptional() @IsBoolean() permitirSinStock?: boolean;
  @IsOptional() activo?: boolean;
}

export class EntradaInventarioDto {
  @IsInt() @Min(1) cantidad!: number;
  @IsOptional() @IsString() motivo?: string;
}

export class AbrirCuentaDto {
  @IsOptional() @IsString() mesa?: string;
  @IsOptional() @IsString() mesaId?: string;
  @IsOptional() @IsString() reservaId?: string;
  @IsOptional() @IsString() clienteId?: string;
}

export class AgregarItemDto {
  @IsString() productoId!: string;
  @IsOptional() @IsInt() @Min(1) cantidad?: number;
}

export class CobrarDto {
  @IsString() metodoPago!: string; // EFECTIVO, TARJETA, OTRO
}

export class AbrirCajaDto {
  @IsInt() @Min(0) montoInicial!: number;
}

export class CerrarCajaDto {
  @IsInt() @Min(0) montoContado!: number;
  @IsOptional() @IsString() nota?: string;
}
