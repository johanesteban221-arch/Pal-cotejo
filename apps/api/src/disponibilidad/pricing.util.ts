import { TipoTarifa } from "@prisma/client";

export interface TarifaLike {
  diaSemana: number | null;
  horaInicio: string; // "HH:mm"
  horaFin: string; // "HH:mm"
  precio: number;
  tipo: TipoTarifa;
}

/** Convierte "HH:mm" a minutos desde medianoche. */
export function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Convierte minutos desde medianoche a "HH:mm". */
export function aHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Resuelve la tarifa aplicable a una franja [inicioMin, finMin) en un dia
 * de la semana. Prioriza reglas con diaSemana especifico sobre las generales
 * (diaSemana = null). Devuelve null si ninguna tarifa cubre la franja.
 */
export function resolverTarifa(
  tarifas: TarifaLike[],
  diaSemana: number,
  inicioMin: number,
  finMin: number,
): { precio: number; tipo: TipoTarifa } | null {
  const candidatas = tarifas
    .filter((t) => t.diaSemana === null || t.diaSemana === diaSemana)
    .filter((t) => aMinutos(t.horaInicio) <= inicioMin && aMinutos(t.horaFin) >= finMin)
    // especificas (diaSemana != null) primero
    .sort((a, b) => (a.diaSemana === null ? 1 : 0) - (b.diaSemana === null ? 1 : 0));

  if (candidatas.length === 0) return null;
  const t = candidatas[0];
  return { precio: t.precio, tipo: t.tipo };
}
