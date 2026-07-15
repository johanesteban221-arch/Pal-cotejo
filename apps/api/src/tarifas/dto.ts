import { IsInt, Min } from "class-validator";

export class ActualizarPrecioDto {
  @IsInt()
  @Min(0)
  precio!: number;
}
