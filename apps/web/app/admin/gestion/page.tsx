"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Cancha,
  Bloqueo,
  Recurrente,
  getCanchas,
  getBloqueos,
  crearBloqueo,
  eliminarBloqueo,
  crearReservaManual,
  getRecurrentes,
  crearRecurrente,
  eliminarRecurrente,
  generarRecurrente,
  formatoCOP,
} from "../../../lib/api";
import { getToken, logout, NoAutorizado } from "../../../lib/auth";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Gestion() {
  const router = useRouter();
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [recurrentes, setRecurrentes] = useState<Recurrente[]>([]);
  const [msg, setMsg] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);

  function salir() {
    logout();
    router.replace("/admin/login");
  }
  function manejarError(e: unknown) {
    if (e instanceof NoAutorizado) return salir();
    setMsg({ tipo: "err", texto: (e as Error).message });
  }
  function aviso(texto: string) {
    setMsg({ tipo: "ok", texto });
    setTimeout(() => setMsg(null), 4000);
  }

  function recargar() {
    getBloqueos().then(setBloqueos).catch(manejarError);
    getRecurrentes().then(setRecurrentes).catch(manejarError);
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/admin/login");
      return;
    }
    getCanchas().then((c) => setCanchas(c)).catch(manejarError);
    recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="wrap" style={{ maxWidth: 900 }}>
      <div className="section-title">
        <div>
          <div className="eyebrow">Panel de administración</div>
          <div className="h1" style={{ margin: 0 }}>Gestión operativa</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link className="btn ghost" style={{ width: "auto", padding: "8px 14px" }} href="/admin">
            ← Dashboard
          </Link>
          <button className="btn ghost" style={{ width: "auto", padding: "8px 14px" }} onClick={salir}>
            Salir
          </button>
        </div>
      </div>

      {msg && (
        <div
          className="card"
          style={{
            marginBottom: 14,
            borderColor: msg.tipo === "ok" ? "var(--green)" : "#ef4444",
            color: msg.tipo === "ok" ? "var(--green)" : "#f87171",
          }}
        >
          {msg.tipo === "ok" ? "✓ " : "⚠️ "}{msg.texto}
        </div>
      )}

      <div className="grid-2b">
        <ReservaManual canchas={canchas} onOk={(t) => { aviso(t); recargar(); }} onErr={manejarError} />
        <BloqueoForm canchas={canchas} onOk={(t) => { aviso(t); recargar(); }} onErr={manejarError} />
      </div>

      {/* Lista de bloqueos */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="h2" style={{ marginBottom: 8 }}>🚧 Bloqueos activos</div>
        {bloqueos.length === 0 && <div className="sub">No hay bloqueos programados.</div>}
        <div className="row-list">
          {bloqueos.map((b) => (
            <div className="r" key={b.id}>
              <div>
                <div style={{ fontWeight: 700 }}>{b.cancha?.nombre} · {b.motivo}</div>
                <div className="sub">
                  {new Date(b.inicio).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
                  {" → "}
                  {new Date(b.fin).toLocaleTimeString("es-CO", { timeStyle: "short" })}
                  {b.nota ? ` · ${b.nota}` : ""}
                </div>
              </div>
              <button
                className="btn ghost"
                style={{ width: "auto", padding: "6px 12px", color: "#f87171" }}
                onClick={() => eliminarBloqueo(b.id).then(() => { aviso("Bloqueo eliminado"); recargar(); }).catch(manejarError)}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recurrentes */}
      <div className="grid-2b" style={{ marginTop: 14 }}>
        <RecurrenteForm canchas={canchas} onOk={(t) => { aviso(t); recargar(); }} onErr={manejarError} />
        <div className="card">
          <div className="h2" style={{ marginBottom: 8 }}>🔁 Clientes fijos (recurrentes)</div>
          {recurrentes.length === 0 && <div className="sub">No hay reservas recurrentes.</div>}
          <div className="row-list">
            {recurrentes.map((r) => (
              <div className="r" key={r.id} style={{ flexWrap: "wrap", gap: 6 }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 700 }}>{r.cliente?.nombre}</div>
                  <div className="sub">
                    {DIAS[r.diaSemana]} {r.horaInicio} · {r.frecuencia.toLowerCase()} · {r._count?.reservas ?? 0} generadas
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn"
                    style={{ width: "auto", padding: "6px 12px", fontSize: 12 }}
                    onClick={() =>
                      generarRecurrente(r.id, 4)
                        .then((res) => { aviso(`Generadas ${res.creadas} reservas (${res.omitidas} omitidas)`); recargar(); })
                        .catch(manejarError)
                    }
                  >
                    Generar 4
                  </button>
                  <button
                    className="btn ghost"
                    style={{ width: "auto", padding: "6px 10px", color: "#f87171", fontSize: 12 }}
                    onClick={() => eliminarRecurrente(r.id).then(() => { aviso("Recurrente desactivada"); recargar(); }).catch(manejarError)}
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

const input: React.CSSProperties = {
  width: "100%", padding: 11, borderRadius: 10, border: "1px solid var(--border-2)",
  background: "var(--bg-2)", color: "var(--text)", fontSize: 14, marginBottom: 10, outline: "none",
};
const label: React.CSSProperties = { fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 };

// ── Reserva manual ──
function ReservaManual({ canchas, onOk, onErr }: { canchas: Cancha[]; onOk: (t: string) => void; onErr: (e: unknown) => void }) {
  const [f, setF] = useState({ canchaId: "", fecha: hoyISO(), horaInicio: "18:00", horaFin: "19:00", nombre: "", telefono: "", pagado: false });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));
  useEffect(() => { if (canchas[0]) set("canchaId", canchas[0].id); }, [canchas]);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    crearReservaManual(f)
      .then(() => onOk("Reserva manual creada"))
      .catch(onErr);
  }
  return (
    <form className="card" onSubmit={enviar}>
      <div className="h2" style={{ marginBottom: 10 }}>📞 Reserva manual (caja)</div>
      <label style={label}>Cancha</label>
      <select style={input} value={f.canchaId} onChange={(e) => set("canchaId", e.target.value)}>
        {canchas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}><label style={label}>Fecha</label><input style={input} type="date" value={f.fecha} min={hoyISO()} onChange={(e) => set("fecha", e.target.value)} /></div>
        <div style={{ width: 90 }}><label style={label}>Inicio</label><input style={input} type="time" value={f.horaInicio} onChange={(e) => set("horaInicio", e.target.value)} /></div>
        <div style={{ width: 90 }}><label style={label}>Fin</label><input style={input} type="time" value={f.horaFin} onChange={(e) => set("horaFin", e.target.value)} /></div>
      </div>
      <input style={input} placeholder="Nombre del cliente" value={f.nombre} onChange={(e) => set("nombre", e.target.value)} required />
      <input style={input} placeholder="Teléfono" value={f.telefono} onChange={(e) => set("telefono", e.target.value)} required />
      <label className="toggle-row" style={{ marginBottom: 12 }}>
        <span className="sub">¿Pagó el total en caja?</span>
        <div className={`toggle ${f.pagado ? "on" : ""}`} onClick={() => set("pagado", !f.pagado)}><div className="knob" /></div>
      </label>
      <button className="btn" type="submit">Crear reserva</button>
    </form>
  );
}

// ── Bloqueo ──
function BloqueoForm({ canchas, onOk, onErr }: { canchas: Cancha[]; onOk: (t: string) => void; onErr: (e: unknown) => void }) {
  const [f, setF] = useState({ canchaId: "", fecha: hoyISO(), inicio: "14:00", fin: "16:00", motivo: "MANTENIMIENTO", nota: "" });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));
  useEffect(() => { if (canchas[0]) set("canchaId", canchas[0].id); }, [canchas]);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    crearBloqueo({
      canchaId: f.canchaId,
      inicio: `${f.fecha}T${f.inicio}:00`,
      fin: `${f.fecha}T${f.fin}:00`,
      motivo: f.motivo,
      nota: f.nota || undefined,
    }).then(() => onOk("Bloqueo creado")).catch(onErr);
  }
  return (
    <form className="card" onSubmit={enviar}>
      <div className="h2" style={{ marginBottom: 10 }}>🚧 Bloquear cancha</div>
      <label style={label}>Cancha</label>
      <select style={input} value={f.canchaId} onChange={(e) => set("canchaId", e.target.value)}>
        {canchas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}><label style={label}>Fecha</label><input style={input} type="date" value={f.fecha} min={hoyISO()} onChange={(e) => set("fecha", e.target.value)} /></div>
        <div style={{ width: 90 }}><label style={label}>Desde</label><input style={input} type="time" value={f.inicio} onChange={(e) => set("inicio", e.target.value)} /></div>
        <div style={{ width: 90 }}><label style={label}>Hasta</label><input style={input} type="time" value={f.fin} onChange={(e) => set("fin", e.target.value)} /></div>
      </div>
      <label style={label}>Motivo</label>
      <select style={input} value={f.motivo} onChange={(e) => set("motivo", e.target.value)}>
        <option value="MANTENIMIENTO">Mantenimiento</option>
        <option value="TORNEO">Torneo</option>
        <option value="EVENTO_PRIVADO">Evento privado</option>
        <option value="OTRO">Otro</option>
      </select>
      <input style={input} placeholder="Nota (opcional)" value={f.nota} onChange={(e) => set("nota", e.target.value)} />
      <button className="btn" type="submit">Bloquear</button>
    </form>
  );
}

// ── Recurrente ──
function RecurrenteForm({ canchas, onOk, onErr }: { canchas: Cancha[]; onOk: (t: string) => void; onErr: (e: unknown) => void }) {
  const [f, setF] = useState({ canchaId: "", nombre: "", telefono: "", frecuencia: "SEMANAL", diaSemana: 3, horaInicio: "20:00", horaFin: "21:00", fechaInicio: hoyISO() });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));
  useEffect(() => { if (canchas[0]) set("canchaId", canchas[0].id); }, [canchas]);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    crearRecurrente({ ...f, diaSemana: Number(f.diaSemana) }).then(() => onOk("Cliente fijo creado")).catch(onErr);
  }
  return (
    <form className="card" onSubmit={enviar}>
      <div className="h2" style={{ marginBottom: 10 }}>🔁 Cliente fijo (recurrente)</div>
      <label style={label}>Cancha</label>
      <select style={input} value={f.canchaId} onChange={(e) => set("canchaId", e.target.value)}>
        {canchas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select>
      <input style={input} placeholder="Nombre (ej. Equipo Los Tigres)" value={f.nombre} onChange={(e) => set("nombre", e.target.value)} required />
      <input style={input} placeholder="Teléfono" value={f.telefono} onChange={(e) => set("telefono", e.target.value)} required />
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={label}>Frecuencia</label>
          <select style={input} value={f.frecuencia} onChange={(e) => set("frecuencia", e.target.value)}>
            <option value="SEMANAL">Semanal</option>
            <option value="MENSUAL">Mensual</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={label}>Día</label>
          <select style={input} value={f.diaSemana} onChange={(e) => set("diaSemana", e.target.value)}>
            {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ width: 100 }}><label style={label}>Inicio</label><input style={input} type="time" value={f.horaInicio} onChange={(e) => set("horaInicio", e.target.value)} /></div>
        <div style={{ width: 100 }}><label style={label}>Fin</label><input style={input} type="time" value={f.horaFin} onChange={(e) => set("horaFin", e.target.value)} /></div>
        <div style={{ flex: 1 }}><label style={label}>Desde</label><input style={input} type="date" value={f.fechaInicio} onChange={(e) => set("fechaInicio", e.target.value)} /></div>
      </div>
      <button className="btn" type="submit">Crear cliente fijo</button>
    </form>
  );
}
