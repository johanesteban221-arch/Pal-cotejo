"use client";

import { useState } from "react";
import { MesaAdmin, actualizarMesa, crearMesa } from "../../../lib/api";
import { NoAutorizado } from "../../../lib/auth";

export default function MesaModal({
  mesa,
  onClose,
  onSaved,
  onErr,
}: {
  mesa: MesaAdmin | null; // null = crear
  onClose: () => void;
  onSaved: () => void;
  onErr: (e: unknown) => void;
}) {
  const editando = mesa != null;
  const [nombre, setNombre] = useState(mesa?.nombre ?? "");
  const [capacidad, setCapacidad] = useState(mesa?.capacidad != null ? String(mesa.capacidad) : "4");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function guardar() {
    setError("");
    if (nombre.trim().length < 1) return setError("El nombre es obligatorio.");

    const data: Record<string, unknown> = { nombre: nombre.trim() };
    if (capacidad.trim() !== "") {
      const n = Number(capacidad);
      if (!Number.isInteger(n) || n < 1) return setError("La capacidad debe ser un entero mayor a 0.");
      data.capacidad = n;
    }

    setGuardando(true);
    const req = editando ? actualizarMesa(mesa!.id, data) : crearMesa(data);
    req
      .then(() => {
        onSaved();
        onClose();
      })
      .catch((e) => {
        if (e instanceof NoAutorizado) onErr(e);
        else setError((e as Error).message); // incluye el 409 de nombre duplicado
      })
      .finally(() => setGuardando(false));
  }

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modal}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div className="admin-title" style={{ fontSize: 22 }}>{editando ? "Editar mesa" : "Nueva mesa"}</div>
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
            <label className="form-label">Nombre</label>
            <input className="form-input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Mesa 5, Barra 2" autoFocus />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Capacidad (personas)</label>
            <input className="form-input" type="number" min={1} step={1} value={capacidad} onChange={(e) => setCapacidad(e.target.value)} />
          </div>
        </div>

        <button className="btn-gold" style={{ width: "100%", marginTop: 20 }} disabled={guardando} onClick={guardar}>
          {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear mesa"}
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
