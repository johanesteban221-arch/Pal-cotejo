"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Cancha,
  ReservaAdmin,
  getCanchas,
  getReservasPorFecha,
  crearReservaManual,
  formatoCOP,
} from "../../../lib/api";
import { NoAutorizado, logout } from "../../../lib/auth";

const PILL: Record<string, { cls: string; label: string }> = {
  CONFIRMADA: { cls: "pill-green", label: "Confirmada" },
  COMPLETADA: { cls: "pill-green", label: "Completada" },
  PENDIENTE: { cls: "pill-gray", label: "Pendiente" },
  CANCELADA: { cls: "pill-red", label: "Cancelada" },
  NO_SHOW: { cls: "pill-red", label: "No show" },
};

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReservasAdmin() {
  const router = useRouter();
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [fecha, setFecha] = useState(hoyISO());
  const [reservas, setReservas] = useState<ReservaAdmin[]>([]);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({
    canchaId: "",
    fecha: hoyISO(),
    horaInicio: "18:00",
    horaFin: "19:00",
    nombre: "",
    telefono: "",
    pagado: false,
  });

  const onErr = (e: unknown) => {
    if (e instanceof NoAutorizado) {
      logout();
      router.replace("/admin/login");
    } else setMsg("⚠️ " + (e as Error).message);
  };

  function cargar() {
    getReservasPorFecha(fecha).then(setReservas).catch(onErr);
  }

  useEffect(() => {
    getCanchas().then((c) => {
      setCanchas(c);
      if (c[0]) setF((p) => ({ ...p, canchaId: c[0].id }));
    });
  }, []);
  useEffect(() => {
    cargar(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha]);

  function crear(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    crearReservaManual(f)
      .then(() => {
        setMsg("✓ Reserva manual creada");
        setFecha(f.fecha);
        cargar();
        setTimeout(() => setMsg(""), 4000);
      })
      .catch(onErr);
  }
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  return (
    <>
      <div className="admin-header">
        <div className="admin-title">Reservas</div>
      </div>

      {msg && (
        <div className="admin-table-wrap" style={{ padding: "12px 20px", marginBottom: 16, color: msg.startsWith("✓") ? "#4CAF50" : "var(--red-lt)" }}>
          {msg}
        </div>
      )}

      {/* Nueva reserva manual */}
      <form className="admin-table-wrap" style={{ marginBottom: 20 }} onSubmit={crear}>
        <div className="admin-table-header">
          <span className="admin-table-title">Nueva reserva manual (caja)</span>
        </div>
        <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Cliente</label>
            <input className="form-input" placeholder="Nombre" value={f.nombre} onChange={(e) => set("nombre", e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">WhatsApp</label>
            <input className="form-input" placeholder="+57 300 000 0000" value={f.telefono} onChange={(e) => set("telefono", e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Cancha</label>
            <select className="form-select" value={f.canchaId} onChange={(e) => set("canchaId", e.target.value)}>
              {canchas.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Fecha</label>
            <input className="form-input" type="date" value={f.fecha} min={hoyISO()} onChange={(e) => set("fecha", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Hora inicio</label>
            <input className="form-input" type="time" value={f.horaInicio} onChange={(e) => set("horaInicio", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Hora fin</label>
            <input className="form-input" type="time" value={f.horaFin} onChange={(e) => set("horaFin", e.target.value)} />
          </div>
          <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 14 }}>
              <input type="checkbox" checked={f.pagado} onChange={(e) => set("pagado", e.target.checked)} style={{ accentColor: "var(--gold)" }} />
              ¿Pagó el total en caja?
            </label>
            <button className="btn-gold" type="submit">Crear reserva manual</button>
          </div>
        </div>
      </form>

      {/* Tabla */}
      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <span className="admin-table-title">Reservas del día</span>
          <input className="form-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={{ width: "auto" }} />
        </div>
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Cancha</th>
              <th>Hora</th>
              <th>Origen</th>
              <th>Valor</th>
              <th>Saldo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {reservas.map((r) => {
              const p = PILL[r.estado] ?? { cls: "pill-gray", label: r.estado };
              return (
                <tr key={r.id}>
                  <td>{r.cliente?.nombre}</td>
                  <td>{r.cancha?.nombre}</td>
                  <td>{r.horaInicio} – {r.horaFin}</td>
                  <td><span className="status-pill pill-gray">{r.origen}</span></td>
                  <td>{formatoCOP(r.montoTotal)}</td>
                  <td>{r.saldo > 0 ? formatoCOP(r.saldo) : "—"}</td>
                  <td><span className={`status-pill ${p.cls}`}>{p.label}</span></td>
                </tr>
              );
            })}
            {reservas.length === 0 && (
              <tr>
                <td colSpan={7} className="muted" style={{ textAlign: "center" }}>Sin reservas para esta fecha.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
