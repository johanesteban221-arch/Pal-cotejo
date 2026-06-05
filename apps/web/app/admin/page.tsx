"use client";

import { useEffect, useState } from "react";
import {
  Resumen,
  PuntoDiario,
  HoraRentable,
  Ocupacion,
  TopCliente,
  getResumen,
  getIngresosDiarios,
  getHorasRentables,
  getOcupacion,
  getTopClientes,
  formatoCOP,
  formatoCorto,
} from "../../lib/api";

const DIAS = ["D", "L", "M", "M", "J", "V", "S"];

export default function Admin() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [diarios, setDiarios] = useState<PuntoDiario[]>([]);
  const [horas, setHoras] = useState<HoraRentable[]>([]);
  const [ocup, setOcup] = useState<Ocupacion[]>([]);
  const [top, setTop] = useState<TopCliente[]>([]);

  useEffect(() => {
    getResumen().then(setResumen);
    getIngresosDiarios(30).then((d) => setDiarios(d.slice(-14)));
    getHorasRentables().then(setHoras);
    getOcupacion().then(setOcup);
    getTopClientes().then(setTop);
  }, []);

  const maxDia = Math.max(1, ...diarios.map((d) => d.ingresos));
  const maxHora = Math.max(1, ...horas.map((h) => h.ingresos));
  const horaTop = horas.reduce((a, b) => (b.ingresos > a.ingresos ? b : a), horas[0] || { ingresos: 0 });
  const totalOcup = Math.max(1, ocup.reduce((s, o) => s + o.ingresos, 0));

  // Donut con conic-gradient
  const colores = ["var(--green)", "var(--blue)", "var(--purple)", "var(--amber)"];
  let acc = 0;
  const segmentos = ocup.map((o, i) => {
    const pct = (o.ingresos / totalOcup) * 100;
    const seg = `${colores[i]} ${acc}% ${acc + pct}%`;
    acc += pct;
    return seg;
  });

  return (
    <main className="wrap">
      <div className="eyebrow">Panel de administración</div>
      <div className="section-title">
        <div className="h1" style={{ margin: 0 }}>Dashboard de operación</div>
        <span className="pill green">● En vivo</span>
      </div>
      <div className="sub" style={{ marginBottom: 18 }}>
        Toma de decisiones con datos reales · Compatible con tablet y móvil
      </div>

      {/* KPIs */}
      <div className="kpis" style={{ marginBottom: 14 }}>
        <div className="card kpi">
          <div className="ico" style={{ background: "rgba(34,197,94,.14)" }}>💰</div>
          <div className="label">Ingresos del mes</div>
          <div className="value">{resumen ? formatoCorto(resumen.ingresosMes) : "—"}</div>
          <div className="delta up">▲ Mes en curso</div>
        </div>
        <div className="card kpi">
          <div className="ico" style={{ background: "rgba(56,189,248,.14)" }}>📅</div>
          <div className="label">Reservas del mes</div>
          <div className="value">{resumen?.reservasMes ?? "—"}</div>
          <div className="delta up">▲ {resumen?.totalReservasHistoricas ?? 0} históricas</div>
        </div>
        <div className="card kpi">
          <div className="ico" style={{ background: "rgba(167,139,250,.14)" }}>🎟️</div>
          <div className="label">Ticket promedio</div>
          <div className="value">{resumen ? formatoCorto(resumen.ticketPromedio) : "—"}</div>
          <div className="delta up">por reserva</div>
        </div>
        <div className="card kpi">
          <div className="ico" style={{ background: "rgba(245,158,11,.14)" }}>🍻</div>
          <div className="label">Mesas Sport Bar</div>
          <div className="value">{resumen?.reservasMesaBar ?? "—"}</div>
          <div className="delta up">venta cruzada</div>
        </div>
      </div>

      {/* Ingresos diarios + Ocupación */}
      <div className="grid-2" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="section-title">
            <div className="h2">Ingresos · últimos 14 días</div>
            <span className="pill blue">{formatoCorto(diarios.reduce((s, d) => s + d.ingresos, 0))}</span>
          </div>
          <div className="bars">
            {diarios.map((d) => {
              const dt = new Date(d.fecha + "T00:00:00");
              return (
                <div className="bar-col" key={d.fecha} title={`${d.fecha}: ${formatoCOP(d.ingresos)}`}>
                  <div className="bar" style={{ height: `${(d.ingresos / maxDia) * 100}%` }} />
                  <div className="bar-lbl">{dt.getDate()}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="h2" style={{ marginBottom: 12 }}>Ingresos por cancha</div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 120, height: 120, borderRadius: "50%",
                background: `conic-gradient(${segmentos.join(", ")})`,
                display: "grid", placeItems: "center", flexShrink: 0,
              }}
            >
              <div style={{ width: 74, height: 74, borderRadius: "50%", background: "var(--card)", display: "grid", placeItems: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Total</div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{formatoCorto(totalOcup)}</div>
                </div>
              </div>
            </div>
            <div className="legend">
              {ocup.map((o, i) => (
                <div className="it" key={o.cancha}>
                  <span className="sw" style={{ background: colores[i] }} />
                  <div>
                    <div style={{ fontWeight: 700 }}>{o.cancha.replace("Cancha ", "C")}</div>
                    <div className="sub">{o.reservas} reservas · {formatoCorto(o.ingresos)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Horas rentables + Top clientes */}
      <div className="grid-2" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="section-title">
            <div className="h2">Horas más rentables</div>
            {horaTop && <span className="pill amber">🔥 {horaTop.hora} es tu hora pico</span>}
          </div>
          <div className="bars">
            {horas.map((h) => (
              <div className="bar-col" key={h.hora} title={`${h.hora}: ${formatoCOP(h.ingresos)} · ${h.reservas} reservas`}>
                <div
                  className={`bar ${h.hora === horaTop?.hora ? "amber" : h.ingresos < maxHora * 0.4 ? "dim" : ""}`}
                  style={{ height: `${(h.ingresos / maxHora) * 100}%` }}
                />
                <div className="bar-lbl">{h.hora.slice(0, 2)}</div>
              </div>
            ))}
          </div>
          <div className="sub" style={{ marginTop: 10 }}>
            💡 Decisión: refuerza personal y bar entre 18:00 y 21:00; promociona las horas valle de la mañana.
          </div>
        </div>

        <div className="card">
          <div className="h2" style={{ marginBottom: 6 }}>Top clientes</div>
          <div className="row-list">
            {top.map((c, i) => (
              <div className="r" key={c.telefono}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="avatar">{c.nombre.split(" ").map((n) => n[0]).slice(0, 2).join("")}</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{c.nombre}</div>
                    <div className="sub">{c.telefono}</div>
                  </div>
                </div>
                <span className="pill muted">{c.reservas} reservas</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Acciones admin (módulos) */}
      <div className="grid-2b">
        <div className="card hover">
          <div className="h2">🛠️ Gestión de canchas</div>
          <div className="sub" style={{ marginTop: 6 }}>
            Bloquea por mantenimiento, torneos o eventos privados. Ingresa reservas manuales
            de clientes que llaman o llegan al local.
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="pill green">Reservas manuales</span>
            <span className="pill amber">Bloqueos</span>
            <span className="pill blue">Recurrentes</span>
          </div>
        </div>
        <div className="card hover">
          <div className="h2">📊 Reportes exportables</div>
          <div className="sub" style={{ marginTop: 6 }}>
            Descarga ingresos diarios, semanales y mensuales, y la base de datos de clientes
            registrados en Excel para tu contabilidad.
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="pill muted">Exportar Excel</span>
            <span className="pill muted">Cierre diario</span>
            <span className="pill muted">Saldo en caja: {resumen ? formatoCorto(resumen.saldoPendienteCaja) : "—"}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
