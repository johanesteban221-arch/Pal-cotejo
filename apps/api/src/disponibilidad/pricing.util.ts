import { TipoTarifa } from "@prisma/client";

// Duración de cada slot en minutos (1 hora). Fuente única compartida por la
// grilla de disponibilidad y el chequeo de cobertura de tarifas.
export const SLOT_MIN = 60;

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

/**
 * Franjas del rango operativo de un día que NO quedan cubiertas por ninguna de
 * las tarifas dadas (huecos internos). Usa el mismo SLOT_MIN y resolverTarifa que
 * la grilla real. Si no hay tarifas aplicables al día, devuelve [] (ese caso —
 * "el día pierde todo"— lo maneja el llamador).
 */
export function franjasSinCobertura(
  tarifas: TarifaLike[],
  diaSemana: number,
): { horaInicio: string; horaFin: string }[] {
  const tarifasDia = tarifas.filter((t) => t.diaSemana === null || t.diaSemana === diaSemana);
  if (tarifasDia.length === 0) return [];
  const apertura = Math.min(...tarifasDia.map((t) => aMinutos(t.horaInicio)));
  const cierre = Math.max(...tarifasDia.map((t) => aMinutos(t.horaFin)));
  const huecos: { horaInicio: string; horaFin: string }[] = [];
  for (let m = apertura; m + SLOT_MIN <= cierre; m += SLOT_MIN) {
    const ini = m;
    const fin = m + SLOT_MIN;
    if (!resolverTarifa(tarifasDia, diaSemana, ini, fin)) {
      huecos.push({ horaInicio: aHHMM(ini), horaFin: aHHMM(fin) });
    }
  }
  return huecos;
}

// ── Validación de solapamiento (Fase C) ──────────────────────────────
// Franja mínima para evaluar conflictos entre tarifas.
export interface FranjaTarifa {
  diaSemana: number | null;
  horaInicio: string;
  horaFin: string;
}

/** ¿[A.ini,A.fin) y [B.ini,B.fin) se solapan? Desigualdad ESTRICTA:
 *  franjas contiguas (A.fin == B.ini) NO se consideran solapadas. */
export function solapaEnTiempo(a: FranjaTarifa, b: FranjaTarifa): boolean {
  return aMinutos(a.horaInicio) < aMinutos(b.horaFin) && aMinutos(b.horaInicio) < aMinutos(a.horaFin);
}

/** ¿Misma prioridad de resolución? Ambas null, o ambas el mismo día específico.
 *  null vs día-específico NO es mismo tier (el específico hace override determinista). */
export function mismoTier(a: FranjaTarifa, b: FranjaTarifa): boolean {
  return (
    (a.diaSemana === null && b.diaSemana === null) ||
    (a.diaSemana !== null && b.diaSemana !== null && a.diaSemana === b.diaSemana)
  );
}

/** Conflicto = solape temporal Y mismo tier. Un solape null↔específico NO es
 *  conflicto (override permitido); solo el mismo-tier solapado es ambiguo. */
export function hayConflicto(x: FranjaTarifa, otras: FranjaTarifa[]): boolean {
  return otras.some((o) => solapaEnTiempo(x, o) && mismoTier(x, o));
}
