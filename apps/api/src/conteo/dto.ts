import { IsInt, Min } from "class-validator";

export class GuardarLineaDto {
  @IsInt() @Min(0) stockContado!: number;
}
