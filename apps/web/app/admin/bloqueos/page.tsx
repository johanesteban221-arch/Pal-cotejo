"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Cancha,
  Bloqueo,
  Recurrente,
  getCanchas,
  getBloqueos,
  crearBloqueo,
  eliminarBloqueo,
  getRecurrentes,
  crearRecurrente,
  eliminarRecurrente,
  generarRecurrente,
} from "../../../lib/api";
import { NoAutorizado, logout } from "../../../lib/auth";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const hoyISO = () => new Date().toISOString().slice(0, 10);

export default function BloqueosAdmin() {
  const router = useRouter();
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [recurrentes, setRecurrentes] = useState<Recurrente[]>([]);
  const [msg, setMsg] = useState("");

  const onErr = (e: unknown) => {
    if (e instanceof NoAutorizado) {
      logout();
      router.replace("/admin/login");
    } else setMsg("⚠️ " + (e as Error).message);
  };
  const aviso = (t: string) => {
    setMsg(t);
    setTimeout(() => setMsg(""), 4000);
  };
  function recargar() {
    getBloqueos().then(setBloqueos).catch(onErr);
    getRecurrentes().then(setRecurrentes).catch(onErr);
  }

  const [b, setB] = useState({ canchaId: "", fecha: hoyISO(), inicio: "14:00", fin: "16:00", motivo: "MANTENIMIENTO", nota: "" });
  const [r, setR] = useState({ canchaId: "", nombre: "", telefono: "", frecuencia: "SEMANAL", diaSemana: 3, horaInicio: "20:00", horaFin: "21:00", fechaInicio: hoyISO() });

  useEffect(() => {
    getCanchas().then((c) => {
      setCanchas(c);
      if (c[0]) {
        setB((p) => ({ ...p, canchaId: c[0].id }));
        setR((p) => ({ ...p, canchaId: c[0].id }));
      }
    });
    recargar(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function crearB(e: React.FormEvent) {
    e.preventDefault();
    crearBloqueo({ canchaId: b.canchaId, inicio: `${b.fecha}T${b.inicio}:00`, fin: `${b.fecha}T${b.fin}:00`, motivo: b.motivo, nota: b.nota || undefined })
      .then(() => { aviso("✓ Bloqueo creado"); recargar(); })
      .catch(onErr);
  }
  function crearR(e: React.FormEvent) {
    e.preventDefault();
    crearRecurrente({ ...r, diaSemana: Number(r.diaSemana) }).then(() => { aviso("✓ Cliente fijo creado"); recargar(); }).catch(onErr);
  }

  return (
    <>
      <div className="admin-header">
        <div className="admin-title">Bloqueos y recurrentes</div>
      </div>
      {msg && (
        <div className="admin-table-wrap" style={{ padding: "12px 20px", marginBottom: 16, color: msg.startsWith("✓") ? "#4CAF50" : "var(--red-lt)" }}>{msg}</div>
      )}

      {/* Crear bloqueo */}
      <form className="admin-table-wrap" style={{ marginBottom: 20 }} onSubmit={crearB}>
        <div className="admin-table-header"><span className="admin-table-title">Crear bloqueo</span></div>
        <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
          <div className="form-group"><label className="form-label">Cancha</label>
            <select className="form-select" value={b.canchaId} onChange={(e) => setB({ ...b, canchaId: e.target.value })}>{canchas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Fecha</label><input className="form-input" type="date" value={b.fecha} min={hoyISO()} onChange={(e) => setB({ ...b, fecha: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Desde</label><input className="form-input" type="time" value={b.inicio} onChange={(e) => setB({ ...b, inicio: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Hasta</label><input className="form-input" type="time" value={b.fin} onChange={(e) => setB({ ...b, fin: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Motivo</label>
            <select className="form-select" value={b.motivo} onChange={(e) => setB({ ...b, motivo: e.target.value })}>
              <option value="MANTENIMIENTO">Mantenimiento</option><option value="TORNEO">Torneo</option><option value="EVENTO_PRIVADO">Evento privado</option><option value="OTRO">Otro</option>
            </select></div>
          <div className="form-group" style={{ gridColumn: "2/4" }}><label className="form-label">Nota</label><input className="form-input" value={b.nota} onChange={(e) => setB({ ...b, nota: e.target.value })} placeholder="Opcional" /></div>
          <div style={{ display: "flex", alignItems: "flex-end" }}><button className="btn-gold" type="submit">Crear bloqueo</button></div>
        </div>
      </form>

      {/* Lista bloqueos */}
      <div className="admin-table-wrap" style={{ marginBottom: 20 }}>
        <div className="admin-table-header"><span className="admin-table-title">Bloqueos activos</span></div>
        <table>
          <thead><tr><th>Cancha</th><th>Desde</th><th>Hasta</th><th>Motivo</th><th></th></tr></thead>
          <tbody>
            {bloqueos.map((x) => (
              <tr key={x.id}>
                <td>{x.cancha?.nombre}</td>
                <td>{new Date(x.inicio).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}</td>
                <td>{new Date(x.fin).toLocaleTimeString("es-CO", { timeStyle: "short" })}</td>
                <td>{x.motivo}{x.nota ? ` · ${x.nota}` : ""}</td>
                <td><button className="btn-outline" style={{ fontSize: 12, padding: "4px 10px", color: "var(--red-lt)", borderColor: "rgba(192,57,43,.4)" }} onClick={() => eliminarBloqueo(x.id).then(() => { aviso("✓ Bloqueo eliminado"); recargar(); }).catch(onErr)}>Eliminar</button></td>
              </tr>
            ))}
            {bloqueos.length === 0 && <tr><td colSpan={5} className="muted" style={{ textAlign: "center" }}>Sin bloqueos.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Crear recurrente */}
      <form className="admin-table-wrap" style={{ marginBottom: 20 }} onSubmit={crearR}>
        <div className="admin-table-header"><span className="admin-table-title">Cliente fijo (reserva recurrente)</span></div>
        <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
          <div className="form-group"><label className="form-label">Cancha</label>
            <select className="form-select" value={r.canchaId} onChange={(e) => setR({ ...r, canchaId: e.target.value })}>{canchas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Equipo / cliente</label><input className="form-input" value={r.nombre} onChange={(e) => setR({ ...r, nombre: e.target.value })} placeholder="Los Tigres" required /></div>
          <div className="form-group"><label className="form-label">WhatsApp</label><input className="form-input" value={r.telefono} onChange={(e) => setR({ ...r, telefono: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Frecuencia</label>
            <select className="form-select" value={r.frecuencia} onChange={(e) => setR({ ...r, frecuencia: e.target.value })}><option value="SEMANAL">Semanal</option><option value="MENSUAL">Mensual</option></select></div>
          <div className="form-group"><label className="form-label">Día</label>
            <select className="form-select" value={r.diaSemana} onChange={(e) => setR({ ...r, diaSemana: Number(e.target.value) })}>{DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Inicio</label><input className="form-input" type="time" value={r.horaInicio} onChange={(e) => setR({ ...r, horaInicio: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Fin</label><input className="form-input" type="time" value={r.horaFin} onChange={(e) => setR({ ...r, horaFin: e.target.value })} /></div>
          <div style={{ display: "flex", alignItems: "flex-end" }}><button className="btn-gold" type="submit">Crear cliente fijo</button></div>
        </div>
      </form>

      {/* Lista recurrentes */}
      <div className="admin-table-wrap">
        <div className="admin-table-header"><span className="admin-table-title">Clientes fijos</span></div>
        <table>
          <thead><tr><th>Cliente</th><th>Día / hora</th><th>Frecuencia</th><th>Generadas</th><th></th></tr></thead>
          <tbody>
            {recurrentes.map((x) => (
              <tr key={x.id}>
                <td>{x.cliente?.nombre}</td>
                <td>{DIAS[x.diaSemana]} {x.horaInicio}</td>
                <td><span className="status-pill pill-gold">{x.frecuencia.toLowerCase()}</span></td>
                <td>{x._count?.reservas ?? 0}</td>
                <td style={{ display: "flex", gap: 8 }}>
                  <button className="btn-gold" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => generarRecurrente(x.id, 4).then((res) => { aviso(`✓ Generadas ${res.creadas} (${res.omitidas} omitidas)`); recargar(); }).catch(onErr)}>Generar 4</button>
                  <button className="btn-outline" style={{ fontSize: 12, padding: "4px 10px", color: "var(--red-lt)", borderColor: "rgba(192,57,43,.4)" }} onClick={() => eliminarRecurrente(x.id).then(() => { aviso("✓ Recurrente quitada"); recargar(); }).catch(onErr)}>Quitar</button>
                </td>
              </tr>
            ))}
            {recurrentes.length === 0 && <tr><td colSpan={5} className="muted" style={{ textAlign: "center" }}>Sin clientes fijos.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
