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

export interface DashboardData {
  fecha: string;
  ingresosHoy: number;
  reservasActivas: number;
  ticketPromedio: number;
  cancelaciones: number;
  ocupacion: number;
  ingresosSemana: number;
  ingresosUltimos7: { fecha: string; ingresos: number }[];
  reservasHoy: {
    codigo: string;
    cliente: string;
    cancha: string;
    horaInicio: string;
    horaFin: string;
    monto: number;
    estado: string;
  }[];
}
export const getDashboard = () => getJSON<DashboardData>("/api/reportes/dashboard");

export interface ReservaAdmin {
  id: string;
  horaInicio: string;
  horaFin: string;
  estado: string;
  origen: string;
  montoTotal: number;
  montoAbonado: number;
  saldo: number;
  cancha: { nombre: string };
  cliente: { nombre: string; telefono: string };
}
export const getReservasPorFecha = (fecha: string) =>
  getJSON<ReservaAdmin[]>(`/api/reservas?fecha=${fecha}`);

export interface Tarifa {
  id: string;
  diaSemana: number | null;
  horaInicio: string;
  horaFin: string;
  precio: number;
  tipo: "PICO" | "VALLE";
}
export const getCanchaDetalle = (id: string) =>
  getJSON<Cancha & { tarifas: Tarifa[] }>(`/api/canchas/${id}`);

// ── CRM Clientes ──
export type Segmento = "NUEVO" | "REGULAR" | "FRECUENTE" | "VIP" | "DORMIDO" | "RECURRENTE";
export interface ClienteRow {
  id: string;
  nombre: string;
  telefono: string;
  email: string | null;
  equipo: string | null;
  segmento: Segmento;
  totalReservas: number;
  totalGastado: number;
  ultimaVisita: string | null;
}
export interface ClientesPage {
  items: ClienteRow[];
  total: number;
  page: number;
  limit: number;
}
export interface ResumenSegmentos {
  total: number;
  porSegmento: Partial<Record<Segmento, number>>;
}
export interface ClientePerfil {
  id: string;
  nombre: string;
  telefono: string;
  email: string | null;
  equipo: string | null;
  canchaFavorita: string | null;
  horarioHabitual: string | null;
  notas: string | null;
  segmento: Segmento;
  reservas: {
    id: string;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    estado: string;
    montoTotal: number;
    cancha: { nombre: string };
  }[];
}
export interface ClienteStats {
  totalGastado: number;
  totalReservas: number;
  ultimaVisita: string | null;
  diasInactivo: number | null;
}

export const getClientes = (segmento?: string, buscar?: string, page = 1) => {
  const q = new URLSearchParams();
  if (segmento) q.set("segmento", segmento);
  if (buscar) q.set("buscar", buscar);
  q.set("page", String(page));
  return getJSON<ClientesPage>(`/api/admin/clientes?${q.toString()}`);
};
export const getClientesResumen = () => getJSON<ResumenSegmentos>("/api/admin/clientes/resumen");
export const getClientePerfil = (id: string) => getJSON<ClientePerfil>(`/api/admin/clientes/${id}`);
export const getClienteStats = (id: string) => getJSON<ClienteStats>(`/api/admin/clientes/${id}/stats`);

async function sendJSON<T>(path: string, method: string, body: any): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new NoAutorizado();
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `Error en ${path}`);
  return res.json();
}
export const actualizarCliente = (id: string, data: Record<string, unknown>) =>
  sendJSON<ClientePerfil>(`/api/admin/clientes/${id}`, "PATCH", data);
export const recalcularSegmentos = () =>
  sendJSON<{ total: number; actualizados: number }>("/api/admin/clientes/recalcular-segmentos", "POST", {});
export const lanzarCampana = (segmento: string, mensaje: string) =>
  sendJSON<{ ok: boolean; destinatarios: number; motivo?: string }>("/api/admin/clientes/campana", "POST", { segmento, mensaje });

// ── POS Sport Bar ──
export type CategoriaProducto = "BEBIDA" | "COMIDA" | "OTRO";
export interface Producto {
  id: string;
  nombre: string;
  categoria: CategoriaProducto;
  precio: number;
  unidades: number;
  stock: number;
  stockMinimo: number;
  stockBaseId: string | null;
  stockBase?: { nombre: string } | null;
  activo: boolean;
}
export interface ItemCuenta {
  id: string;
  productoId: string;
  cantidad: number;
  precioUnit: number;
  subtotal: number;
  producto?: { nombre: string };
}
export interface Cuenta {
  id: string;
  mesa: string | null;
  reservaId: string | null;
  clienteId: string | null;
  estado: "ABIERTA" | "PAGADA" | "ANULADA";
  total: number;
  metodoPago: string | null;
  abiertaEn: string;
  items?: ItemCuenta[];
  cliente?: { nombre: string } | null;
}
export interface ReporteBar {
  ventasHoy: number;
  ventasSemana: number;
  cuentasAbiertas: number;
  cuentasHoy: number;
  topProductos: { nombre: string; cantidad: number; ingresos: number }[];
}

export const getProductos = (todos = false) =>
  getJSON<Producto[]>(`/api/pos/productos${todos ? "?todos=1" : ""}`);
export const crearProducto = (data: Record<string, unknown>) =>
  sendJSON<Producto>("/api/pos/productos", "POST", data);
export const actualizarProducto = (id: string, data: Record<string, unknown>) =>
  sendJSON<Producto>(`/api/pos/productos/${id}`, "PATCH", data);
export const desactivarProducto = (id: string) =>
  sendJSON<Producto>(`/api/pos/productos/${id}`, "DELETE", {});
export const entradaInventario = (id: string, cantidad: number, motivo?: string) =>
  sendJSON<Producto>(`/api/pos/productos/${id}/entrada`, "POST", { cantidad, motivo });
export const eliminarProducto = (id: string) =>
  sendJSON<{ ok: boolean }>(`/api/pos/productos/${id}/permanente`, "DELETE", {});
export const getStockBajo = () => getJSON<Producto[]>("/api/pos/stock-bajo");

export const getCuentasAbiertas = () => getJSON<Cuenta[]>("/api/pos/cuentas/abiertas");
export const getCuenta = (id: string) => getJSON<Cuenta>(`/api/pos/cuentas/${id}`);
export const abrirCuenta = (data: Record<string, unknown>) =>
  sendJSON<Cuenta>("/api/pos/cuentas", "POST", data);
export const agregarItem = (cuentaId: string, productoId: string, cantidad = 1) =>
  sendJSON<Cuenta>(`/api/pos/cuentas/${cuentaId}/items`, "POST", { productoId, cantidad });
export const quitarItem = (itemId: string) =>
  sendJSON<Cuenta>(`/api/pos/items/${itemId}`, "DELETE", {});
export const cobrarCuenta = (id: string, metodoPago: string) =>
  sendJSON<Cuenta>(`/api/pos/cuentas/${id}/cobrar`, "POST", { metodoPago });
export const anularCuenta = (id: string) =>
  sendJSON<Cuenta>(`/api/pos/cuentas/${id}/anular`, "POST", {});
export const getReporteBar = () => getJSON<ReporteBar>("/api/pos/reporte");

/** Descarga el CSV de clientes (con auth) disparando el guardado en el navegador. */
export async function descargarClientesCsv(segmento?: string) {
  const q = segmento ? `?segmento=${segmento}` : "";
  const res = await fetch(`${API}/api/admin/clientes/exportar${q}`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error("No se pudo exportar");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = segmento ? `clientes-${segmento.toLowerCase()}.csv` : "clientes-pal-cotejo.csv";
  a.click();
  URL.revokeObjectURL(url);
}
export const getResumen = () => getJSON<Resumen>("/api/reportes/resumen");
export const getIngresosDiarios = (dias = 30) => getJSON<PuntoDiario[]>(`/api/reportes/ingresos-diarios?dias=${dias}`);
export const getHorasRentables = () => getJSON<HoraRentable[]>("/api/reportes/horas-rentables");
export const getOcupacion = () => getJSON<Ocupacion[]>("/api/reportes/ocupacion-canchas");
export const getTopClientes = () => getJSON<TopCliente[]>("/api/reportes/top-clientes");

// ── Gestión admin (bloqueos, reserva manual, recurrentes) ──
async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) throw new NoAutorizado();
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Error en ${path}`);
  }
  return res.status === 200 || res.status === 201 ? res.json() : ({} as T);
}

export interface Bloqueo {
  id: string;
  canchaId: string;
  inicio: string;
  fin: string;
  motivo: string;
  nota?: string;
  cancha?: { nombre: string };
}
export interface Recurrente {
  id: string;
  frecuencia: "SEMANAL" | "MENSUAL";
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  cancha?: { nombre: string };
  cliente?: { nombre: string; telefono: string };
  _count?: { reservas: number };
}

export const getBloqueos = () => getJSON<Bloqueo[]>("/api/bloqueos");
export const crearBloqueo = (b: Record<string, unknown>) => send("POST", "/api/bloqueos", b);
export const eliminarBloqueo = (id: string) => send("DELETE", `/api/bloqueos/${id}`);

export const crearReservaManual = (r: Record<string, unknown>) => send("POST", "/api/reservas/manual", r);

export const getRecurrentes = () => getJSON<Recurrente[]>("/api/recurrentes");
export const crearRecurrente = (r: Record<string, unknown>) => send("POST", "/api/recurrentes", r);
export const eliminarRecurrente = (id: string) => send("DELETE", `/api/recurrentes/${id}`);
export const generarRecurrente = (id: string, cantidad = 4) =>
  send<{ creadas: number; omitidas: number; total: number }>("POST", `/api/recurrentes/${id}/generar?cantidad=${cantidad}`);

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
