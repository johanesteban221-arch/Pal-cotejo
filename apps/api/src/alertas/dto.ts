import { IsBoolean, IsIn, IsOptional } from "class-validator";

export class ActualizarAlertaDto {
  @IsOptional() @IsBoolean() activo?: boolean;
  // modo solo aplica a CAJA_CERRADA; el valor se valida aquí y su aplicabilidad en el service.
  @IsOptional() @IsIn(["SIEMPRE", "SOLO_DESCUADRE"]) modo?: "SIEMPRE" | "SOLO_DESCUADRE";
}
