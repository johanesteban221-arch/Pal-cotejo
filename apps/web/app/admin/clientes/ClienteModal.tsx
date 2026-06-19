"use client";

import { useEffect, useState } from "react";
import {
  ClientePerfil,
  ClienteStats,
  getClientePerfil,
  getClienteStats,
  actualizarCliente,
  formatoCOP,
} from "../../../lib/api";

const PILL_EST: Record<string, string> = {
  CONFIRMADA: "pill-green", COMPLETADA: "pill-green", PENDIENTE: "pill-gray", CANCELADA: "pill-red", NO_SHOW: "pill-red",
};

export default function ClienteModal({
  id, onClose, onSaved, onErr,
}: {
  id: string;
  onClose: () => void;
  onSaved: () => void;
  onErr: (e: unknown) => void;
}) {
  const [p, setP] = useState<ClientePerfil | null>(null);
  const [stats, setStats] = useState<ClienteStats | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getClientePerfil(id).then((c) => {
      setP(c);
      setForm({
        nombre: c.nombre ?? "",
        email: c.email ?? "",
        equipo: c.equipo ?? "",
        canchaFavorita: c.canchaFavorita ?? "",
        horarioHabitual: c.horarioHabitual ?? "",
        notas: c.notas ?? "",
      });
    }).catch(onErr);
    getClienteStats(id).then(setStats).catch(onErr);
  }, [id]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function guardar() {
    setGuardando(true);
    actualizarCliente(id, form)
      .then(() => { onSaved(); onClose(); })
      .catch(onErr)
      .finally(() => setGuardando(false));
  }

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modal}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="admin-title" style={{ fontSize: 22 }}>{p?.nombre ?? "Cliente"}</div>
          <button className="btn-outline" style={{ padding: "6px 12px", fontSize: 13 }} onClick={onClose}>Cerrar ✕</button>
        </div>

        {/* Stats */}
        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 20 }}>
          <div className="kpi-card"><div className="kpi-label">Total gastado</div><div className="kpi-val" style={{ fontSize: 22 }}>{stats ? formatoCOP(stats.totalGastado) : "—"}</div></div>
          <div className="kpi-card green"><div className="kpi-label">Reservas</div><div className="kpi-val" style={{ fontSize: 22 }}>{stats?.totalReservas ?? "—"}</div></div>
          <div className="kpi-card"><div className="kpi-label">Última visita</div><div className="kpi-val" style={{ fontSize: 18 }}>{stats?.ultimaVisita ?? "—"}</div></div>
          <div className="kpi-card red"><div className="kpi-label">Días inactivo</div><div className="kpi-val" style={{ fontSize: 22 }}>{stats?.diasInactivo ?? "—"}</div></div>
        </div>

        {/* Datos editables */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <Field label="Nombre" v={form.nombre} on={(x) => set("nombre", x)} />
          <Field label="WhatsApp" v={p?.telefono ?? ""} readOnly />
          <Field label="Email" v={form.email} on={(x) => set("email", x)} />
          <Field label="Equipo" v={form.equipo} on={(x) => set("equipo", x)} />
          <Field label="Cancha favorita" v={form.canchaFavorita} on={(x) => set("canchaFavorita", x)} />
          <Field label="Horario habitual" v={form.horarioHabitual} on={(x) => set("horarioHabitual", x)} />
          <div className="form-group" style={{ gridColumn: "1/-1", margin: 0 }}>
            <label className="form-label">Notas</label>
            <input className="form-input" value={form.notas} onChange={(e) => set("notas", e.target.value)} />
          </div>
        </div>

        {/* Historial */}
        <div className="admin-table-wrap" style={{ marginBottom: 16 }}>
          <div className="admin-table-header"><span className="admin-table-title">Últimas reservas</span></div>
          <table>
            <thead><tr><th>Fecha</th><th>Cancha</th><th>Hora</th><th>Valor</th><th>Estado</th></tr></thead>
            <tbody>
              {p?.reservas.map((r) => (
                <tr key={r.id}>
                  <td>{r.fecha.slice(0, 10)}</td>
                  <td>{r.cancha?.nombre}</td>
                  <td>{r.horaInicio}–{r.horaFin}</td>
                  <td>{formatoCOP(r.montoTotal)}</td>
                  <td><span className={`status-pill ${PILL_EST[r.estado] ?? "pill-gray"}`}>{r.estado}</span></td>
                </tr>
              ))}
              {p && p.reservas.length === 0 && <tr><td colSpan={5} className="muted" style={{ textAlign: "center" }}>Sin reservas.</td></tr>}
            </tbody>
          </table>
        </div>

        <button className="btn-gold" style={{ width: "100%" }} disabled={guardando} onClick={guardar}>
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, v, on, readOnly }: { label: string; v: string; on?: (x: string) => void; readOnly?: boolean }) {
  return (
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label">{label}</label>
      <input className="form-input" value={v} readOnly={readOnly} onChange={(e) => on?.(e.target.value)} style={readOnly ? { opacity: 0.6 } : undefined} />
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", backdropFilter: "blur(3px)",
  display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 24, zIndex: 200, overflowY: "auto",
};
const modal: React.CSSProperties = {
  width: "100%", maxWidth: 720, background: "var(--bg2)", border: "1px solid var(--border-g)",
  borderRadius: 14, padding: 24, margin: "auto",
};
