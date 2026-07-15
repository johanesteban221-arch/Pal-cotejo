"use client";

import { useState } from "react";
import { Cancha, actualizarCancha, crearCancha } from "../../../lib/api";
import { NoAutorizado } from "../../../lib/auth";

const TIPOS = ["Mesa", "Bolirana", "Futbol-tenis", "Tejo", "Cancha"];

export default function RecursoModal({
  recurso,
  onClose,
  onSaved,
  onErr,
}: {
  recurso: Cancha | null; // null = crear
  onClose: () => void;
  onSaved: () => void;
  onErr: (e: unknown) => void;
}) {
  const editando = recurso != null;
  const [nombre, setNombre] = useState(recurso?.nombre ?? "");
  const [tipo, setTipo] = useState(recurso?.tipo ?? "");
  const [descripcion, setDescripcion] = useState(recurso?.descripcion ?? "");
  const [capacidad, setCapacidad] = useState(recurso?.capacidad != null ? String(recurso.capacidad) : "");
  const [orden, setOrden] = useState(recurso?.orden != null ? String(recurso.orden) : "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function guardar() {
    setError("");
    if (nombre.trim().length < 1) return setError("El nombre es obligatorio.");

    const data: Record<string, unknown> = { nombre: nombre.trim() };
    if (tipo.trim()) data.tipo = tipo.trim();
    if (descripcion.trim()) data.descripcion = descripcion.trim();
    if (capacidad.trim() !== "") {
      const n = Number(capacidad);
      if (!Number.isInteger(n) || n < 0) return setError("La capacidad debe ser un entero ≥ 0.");
      data.capacidad = n;
    }
    if (orden.trim() !== "") {
      const n = Number(orden);
      if (!Number.isInteger(n)) return setError("El orden debe ser un número entero.");
      data.orden = n;
    }

    setGuardando(true);
    const req = editando ? actualizarCancha(recurso!.id, data) : crearCancha(data);
    req
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
          <div className="admin-title" style={{ fontSize: 22 }}>{editando ? "Editar recurso" : "Nuevo recurso"}</div>
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
            <input className="form-input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Mesa 1, Tejo 2, Cancha Principal" />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Tipo</label>
            <input className="form-input" list="tipos-recurso" value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Mesa, Bolirana, Tejo…" />
            <datalist id="tipos-recurso">
              {TIPOS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Descripción</label>
            <input className="form-input" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Opcional" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Capacidad</label>
              <input className="form-input" type="number" min={0} step={1} value={capacidad} onChange={(e) => setCapacidad(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Orden</label>
              <input className="form-input" type="number" step={1} value={orden} onChange={(e) => setOrden(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
        </div>

        <button className="btn-gold" style={{ width: "100%", marginTop: 20 }} disabled={guardando} onClick={guardar}>
          {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear recurso"}
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
