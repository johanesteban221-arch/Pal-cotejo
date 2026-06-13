"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DashboardData,
  HoraRentable,
  getDashboard,
  getHorasRentables,
  formatoCorto,
  formatoCOP,
} from "../../lib/api";
import { NoAutorizado, logout } from "../../lib/auth";

const DIA_LETRA = ["D", "L", "M", "M", "J", "V", "S"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const ESTADO_PILL: Record<string, { cls: string; label: string }> = {
  CONFIRMADA: { cls: "pill-green", label: "Confirmada" },
  COMPLETADA: { cls: "pill-green", label: "Completada" },
  PENDIENTE: { cls: "pill-gray", label: "Pendiente" },
  CANCELADA: { cls: "pill-red", label: "Cancelada" },
  NO_SHOW: { cls: "pill-red", label: "No show" },
};

export default function Dashboard() {
  const router = useRouter();
  const [d, setD] = useState<DashboardData | null>(null);
  const [horas, setHoras] = useState<HoraRentable[]>([]);

  useEffect(() => {
    const onErr = (e: unknown) => {
      if (e instanceof NoAutorizado) {
        logout();
        router.replace("/admin/login");
      }
    };
    getDashboard().then(setD).catch(onErr);
    getHorasRentables().then(setHoras).catch(onErr);
  }, [router]);

  const maxDia = Math.max(1, ...(d?.ingresosUltimos7.map((x) => x.ingresos) ?? [1]));
  const maxHora = Math.max(1, ...horas.map((h) => h.reservas));
  const fechaTxt = d
    ? (() => {
        const dt = new Date(d.fecha + "T00:00:00");
        return `${["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][dt.getDay()]} ${dt.getDate()} de ${MESES[dt.getMonth()]}, ${dt.getFullYear()}`;
      })()
    : "";

  return (
    <>
      <div className="admin-header">
        <div className="admin-title">Dashboard</div>
        <div className="admin-date">{fechaTxt}</div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Ingresos hoy</div>
          <div className="kpi-val">{d ? formatoCorto(d.ingresosHoy) : "—"}</div>
          <div className="kpi-delta">del día</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Reservas activas</div>
          <div className="kpi-val">{d?.reservasActivas ?? "—"}</div>
          <div className="kpi-delta up">confirmadas próximas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ticket promedio</div>
          <div className="kpi-val">{d ? formatoCorto(d.ticketPromedio) : "—"}</div>
          <div className="kpi-delta">por reserva (mes)</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-label">Cancelaciones</div>
          <div className="kpi-val">{d?.cancelaciones ?? "—"}</div>
          <div className="kpi-delta">hoy</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ocupación</div>
          <div className="kpi-val">{d ? `${d.ocupacion}%` : "—"}</div>
          <div className="kpi-delta">de hoy</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Ingresos semana</div>
          <div className="kpi-val">{d ? formatoCorto(d.ingresosSemana) : "—"}</div>
          <div className="kpi-delta up">últimos 7 días</div>
        </div>
      </div>

      <div className="two-col">
        {/* Bar chart semana */}
        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <span className="admin-table-title">Ingresos · últimos 7 días</span>
            <span className="status-pill pill-gold">{d ? formatoCorto(d.ingresosSemana) : "—"}</span>
          </div>
          <div style={{ padding: "16px 20px" }}>
            <div className="chart-bars">
              {d?.ingresosUltimos7.map((x) => (
                <div className="bar-wrap" key={x.fecha} title={`${x.fecha}: ${formatoCOP(x.ingresos)}`}>
                  <div
                    className="bar"
                    style={{ height: `${Math.max(4, (x.ingresos / maxDia) * 100)}px`, opacity: x.ingresos === maxDia ? 1 : 0.7 }}
                  />
                  <div className="bar-lbl">{DIA_LETRA[new Date(x.fecha + "T00:00:00").getDay()]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Heatmap horas */}
        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <span className="admin-table-title">Horas más rentables</span>
          </div>
          <div style={{ padding: "16px 20px" }}>
            <div className="muted" style={{ fontSize: 11, fontFamily: "var(--font-d)", letterSpacing: 1, marginBottom: 8 }}>
              06:00 — 22:00
            </div>
            <div className="heatmap">
              {horas.map((h) => {
                const lvl = Math.round((h.reservas / maxHora) * 4);
                return (
                  <div key={h.hora} className={`heat-cell heat-${lvl}`} title={`${h.hora}: ${formatoCOP(h.ingresos)}`}>
                    {h.hora.slice(0, 2)}h
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Reservas de hoy */}
      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <span className="admin-table-title">Reservas de hoy</span>
          <span className="badge-dot">
            <span className="dot dot-green" />
            <span className="muted" style={{ fontSize: 12 }}>{d?.reservasHoy.length ?? 0} en total</span>
          </span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Cancha</th>
              <th>Hora</th>
              <th>Valor</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {d?.reservasHoy.map((r) => {
              const p = ESTADO_PILL[r.estado] ?? { cls: "pill-gray", label: r.estado };
              return (
                <tr key={r.codigo}>
                  <td style={{ color: "var(--gold)", fontFamily: "var(--font-d)" }}>#{r.codigo}</td>
                  <td>{r.cliente}</td>
                  <td>{r.cancha}</td>
                  <td>{r.horaInicio} – {r.horaFin}</td>
                  <td>{formatoCOP(r.monto)}</td>
                  <td><span className={`status-pill ${p.cls}`}>{p.label}</span></td>
                </tr>
              );
            })}
            {d && d.reservasHoy.length === 0 && (
              <tr>
                <td colSpan={6} className="muted" style={{ textAlign: "center" }}>
                  Sin reservas para hoy.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
