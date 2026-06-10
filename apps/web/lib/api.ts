import { authHeaders, NoAutorizado } from "./auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface Cancha {
  id: string;
  nombre: string;
  tipo?: string | null;
}

export interface Slot {
  horaInicio: string;
  horaFin: string;
  disponible: boolean;
  precio: number | null;
  tipo: "PICO" | "VALLE" | null;
  motivo?: string;
}

export async function getCanchas(): Promise<Cancha[]> {
  const res = await fetch(`${API}/api/canchas`, { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudieron cargar las canchas");
  return res.json();
}

export async function getDisponibilidad(canchaId: string, fecha: string): Promise<Slot[]> {
  const res = await fetch(`${API}/api/disponibilidad/${canchaId}?fecha=${fecha}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("No se pudo cargar la disponibilidad");
  return res.json();
}

export async function crearReserva(payload: Record<string, unknown>) {
  const res = await fetch(`${API}/api/reservas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json()).message || "Error al crear la reserva");
  return res.json();
}

// ── Reportes (panel admin) ──
export interface Resumen {
  ingresosMes: number;
  reservasMes: number;
  ticketPromedio: number;
  saldoPendienteCaja: number;
  totalReservasHistoricas: number;
  reservasMesaBar: number;
}
export interface PuntoDiario { fecha: string; ingresos: number; }
export interface HoraRentable { hora: string; ingresos: number; reservas: number; }
export interface Ocupacion { cancha: string; reservas: number; ingresos: number; }
export interface TopCliente { nombre: string; telefono: string; reservas: number; }

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    cache: "no-store",
    headers: { ...authHeaders() },
  });
  if (res.status === 401) throw new NoAutorizado();
  if (!res.ok) throw new Error(`Error cargando ${path}`);
  return res.json();
}

export const getResumen = () => getJSON<Resumen>("/api/reportes/resumen");
export const getIngresosDiarios = (dias = 30) => getJSON<PuntoDiario[]>(`/api/reportes/ingresos-diarios?dias=${dias}`);
export const getHorasRentables = () => getJSON<HoraRentable[]>("/api/reportes/horas-rentables");
export const getOcupacion = () => getJSON<Ocupacion[]>("/api/reportes/ocupacion-canchas");
export const getTopClientes = () => getJSON<TopCliente[]>("/api/reportes/top-clientes");

export function formatoCOP(valor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}

/** Formato corto para gráficas: $3,6M / $850k */
export function formatoCorto(valor: number): string {
  if (valor >= 1_000_000) return `$${(valor / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (valor >= 1_000) return `$${Math.round(valor / 1_000)}k`;
  return `$${valor}`;
}
