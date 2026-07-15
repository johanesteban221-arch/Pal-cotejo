"use client";

import { useState } from "react";
import { TarifaAdmin, editarFranjaTarifa } from "../../../lib/api";
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

export default function EditarFranjaModal({
  tarifa,
  onClose,
  onSaved,
  onErr,
}: {
  tarifa: TarifaAdmin;
  onClose: () => void;
  onSaved: () => void;
  onErr: (e: unknown) => void;
}) {
  const [dia, setDia] = useState(tarifa.diaSemana === null ? "" : String(tarifa.diaSemana));
  const [horaInicio, setHoraInicio] = useState(tarifa.horaInicio);
  const [horaFin, setHoraFin] = useState(tarifa.horaFin);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function guardar() {
    setError("");
    if (!HHMM.test(horaInicio) || !HHMM.test(horaFin)) return setError("Horario inválido (formato HH:mm).");
    if (toMin(horaInicio) >= toMin(horaFin)) return setError("La hora de inicio debe ser anterior a la de fin.");

    const data = { horaInicio, horaFin, diaSemana: dia === "" ? null : Number(dia) };
    setGuardando(true);
    editarFranjaTarifa(tarifa.id, data)
      .then((r) => {
        if (r.requiereConfirmacion) {
          if (window.confirm(`${r.mensaje}\n\n¿Guardar de todos modos?`)) {
            return editarFranjaTarifa(tarifa.id, data, true).then(() => {
              onSaved();
              onClose();
            });
          }
          return;
        }
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
          <div className="admin-title" style={{ fontSize: 22 }}>Editar franja / día</div>
          <button className="btn-outline" style={{ padding: "6px 12px", fontSize: 13 }} onClick={onClose}>
            Cerrar ✕
          </button>
        </div>

        <div className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
          {tarifa.cancha.nombre} · {tarifa.tipo === "PICO" ? "Pico" : "Valle"} · precio {tarifa.precio.toLocaleString("es-CO")} (el precio se edita aparte)
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
        </div>

        <button className="btn-gold" style={{ width: "100%", marginTop: 20 }} disabled={guardando} onClick={guardar}>
          {guardando ? "Guardando…" : "Guardar franja"}
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
  maxWidth: 440,
  background: "var(--bg2)",
  border: "1px solid var(--border-g)",
  borderRadius: 14,
  padding: 24,
  margin: "auto",
};
