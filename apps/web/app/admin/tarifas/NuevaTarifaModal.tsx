"use client";

import { useState } from "react";
import { Cancha, crearTarifa } from "../../../lib/api";
import { NoAutorizado } from "../../../lib/auth";

const DIAS_OPT: { value: string; label: string }[] = [
  { value: "", label: "Todos los días" },
  { value: "1", label: "Lunes" },
  { value: "2", label: "Martes" },
  { value: "3", label: "Miércoles" },
  { value: "4", label: "Jueves" },
  { value: "5", label: "Viernes" },
  { value: "6", label: "Sábado" },
  { value: "0", label: "Domingo" },
];

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMin = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

export default function NuevaTarifaModal({
  canchas,
  onClose,
  onSaved,
  onErr,
}: {
  canchas: Cancha[];
  onClose: () => void;
  onSaved: () => void;
  onErr: (e: unknown) => void;
}) {
  const [canchaId, setCanchaId] = useState(canchas[0]?.id ?? "");
  const [dia, setDia] = useState(""); // "" = todos los días
  const [horaInicio, setHoraInicio] = useState("06:00");
  const [horaFin, setHoraFin] = useState("07:00");
  const [precio, setPrecio] = useState("");
  const [tipo, setTipo] = useState<"PICO" | "VALLE">("VALLE");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function crear() {
    setError("");
    if (!canchaId) return setError("Selecciona una cancha.");
    if (!HHMM.test(horaInicio) || !HHMM.test(horaFin)) return setError("Horario inválido (formato HH:mm).");
    if (toMin(horaInicio) >= toMin(horaFin)) return setError("La hora de inicio debe ser anterior a la de fin.");
    const p = Number(precio);
    if (!Number.isInteger(p) || p < 0) return setError("El precio debe ser un entero ≥ 0.");

    setGuardando(true);
    crearTarifa({ canchaId, diaSemana: dia === "" ? null : Number(dia), horaInicio, horaFin, precio: p, tipo })
      .then(() => {
        onSaved();
        onClose();
      })
      .catch((e) => {
        if (e instanceof NoAutorizado) onErr(e);
        else setError((e as Error).message);
      })
      .finally(() => setGuardando(false));
  }

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modal}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div className="admin-title" style={{ fontSize: 22 }}>Nueva tarifa</div>
          <button className="btn-outline" style={{ padding: "6px 12px", fontSize: 13 }} onClick={onClose}>
            Cerrar ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(200,60,60,.12)",
              color: "var(--red-lt)",
              fontSize: 14,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: "grid", gap: 14 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Cancha</label>
            <select className="form-select" value={canchaId} onChange={(e) => setCanchaId(e.target.value)}>
              {canchas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Día</label>
            <select className="form-select" value={dia} onChange={(e) => setDia(e.target.value)}>
              {DIAS_OPT.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Hora inicio</label>
              <input className="form-input" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Hora fin</label>
              <input className="form-input" type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Precio/hora (COP)</label>
              <input className="form-input" type="number" min={0} step={1} value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="70000" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Tipo</label>
              <select className="form-select" value={tipo} onChange={(e) => setTipo(e.target.value as "PICO" | "VALLE")}>
                <option value="VALLE">Valle</option>
                <option value="PICO">Pico</option>
              </select>
            </div>
          </div>
        </div>

        <button className="btn-gold" style={{ width: "100%", marginTop: 20 }} disabled={guardando} onClick={crear}>
          {guardando ? "Creando…" : "Crear tarifa"}
        </button>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.6)",
  backdropFilter: "blur(3px)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: 24,
  zIndex: 200,
  overflowY: "auto",
};
const modal: React.CSSProperties = {
  width: "100%",
  maxWidth: 480,
  background: "var(--bg2)",
  border: "1px solid var(--border-g)",
  borderRadius: 14,
  padding: 24,
  margin: "auto",
};
