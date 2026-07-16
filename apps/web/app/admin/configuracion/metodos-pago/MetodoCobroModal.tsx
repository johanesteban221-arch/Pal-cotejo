"use client";

import { useState } from "react";
import { MetodoCobro, TipoVerificacion, actualizarMetodoCobro, crearMetodoCobro } from "../../../../lib/api";
import { NoAutorizado } from "../../../../lib/auth";

const VERIFS: { value: TipoVerificacion; label: string; hint: string }[] = [
  { value: "CAJON", label: "Efectivo / va al cajón físico", hint: "El dinero entra al cajón y se cuenta en el arqueo del cierre." },
  { value: "COMPROBANTE", label: "Digital / se verifica con comprobante", hint: "Nequi, tarjeta, transferencia… no está en el cajón." },
];

// Espejo del backend: MAYÚSCULAS, espacios/guiones → "_", solo [A-Z0-9_].
function normalizarCodigo(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function MetodoCobroModal({
  metodo,
  onClose,
  onSaved,
  onErr,
}: {
  metodo: MetodoCobro | null; // null = crear
  onClose: () => void;
  onSaved: () => void;
  onErr: (e: unknown) => void;
}) {
  const editando = metodo != null;
  const [nombre, setNombre] = useState(metodo?.nombre ?? "");
  const [codigo, setCodigo] = useState(metodo?.codigo ?? "");
  const [verificacion, setVerificacion] = useState<TipoVerificacion>(metodo?.verificacion ?? "CAJON");
  const [orden, setOrden] = useState(metodo?.orden != null ? String(metodo.orden) : "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const codigoPreview = normalizarCodigo(codigo);

  function guardar() {
    setError("");
    if (nombre.trim().length < 1) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!editando && !codigoPreview) {
      setError("El código es obligatorio.");
      return;
    }
    const ordenNum = orden.trim() === "" ? undefined : Number(orden);
    if (ordenNum !== undefined && (!Number.isInteger(ordenNum) || ordenNum < 0)) {
      setError("El orden debe ser un entero ≥ 0.");
      return;
    }

    setGuardando(true);
    const req = editando
      ? actualizarMetodoCobro(metodo!.id, { nombre: nombre.trim(), verificacion, orden: ordenNum })
      : crearMetodoCobro({ nombre: nombre.trim(), codigo: codigo.trim(), verificacion, orden: ordenNum });

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
          <div className="admin-title" style={{ fontSize: 22 }}>{editando ? "Editar método" : "Nuevo método"}</div>
          <button className="btn-outline" style={{ padding: "6px 12px", fontSize: 13 }} onClick={onClose}>Cerrar ✕</button>
        </div>

        {error && <div style={bannerErr}>⚠️ {error}</div>}

        <div style={{ display: "grid", gap: 14 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Nombre</label>
            <input className="form-input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Nequi, Datáfono" autoFocus />
          </div>

          {/* Código: editable solo al crear, con preview de normalización */}
          {editando ? (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Código (no editable)</label>
              <input className="form-input" value={metodo!.codigo} readOnly style={{ opacity: 0.6 }} />
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                El código no se puede cambiar: es la referencia estable de los cobros históricos.
              </div>
            </div>
          ) : (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Código</label>
              <input className="form-input" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ej: nequi empresa" />
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                Se guardará como <b style={{ color: "var(--gold)" }}>{codigoPreview || "—"}</b> (mayúsculas, sin espacios).
              </div>
            </div>
          )}

          {/* Verificación explicada */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">¿Cómo se cuadra en la caja?</label>
            <div style={{ display: "grid", gap: 8 }}>
              {VERIFS.map((o) => (
                <label
                  key={o.value}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    padding: "10px 12px",
                    border: "1px solid var(--border-g)",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: verificacion === o.value ? "rgba(212,160,23,.08)" : "transparent",
                  }}
                >
                  <input type="radio" name="verif" checked={verificacion === o.value} onChange={() => setVerificacion(o.value)} style={{ marginTop: 3 }} />
                  <span>
                    <span style={{ color: "var(--cream)", fontSize: 14 }}>{o.label}</span>
                    <span className="muted" style={{ display: "block", fontSize: 12 }}>{o.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Orden (opcional)</label>
            <input className="form-input" type="number" min={0} step={1} value={orden} onChange={(e) => setOrden(e.target.value)} placeholder="Posición en los botones de cobro" />
          </div>
        </div>

        <button className="btn-gold" style={{ width: "100%", marginTop: 20 }} disabled={guardando} onClick={guardar}>
          {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear método"}
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
const bannerErr: React.CSSProperties = {
  marginBottom: 16,
  padding: "10px 14px",
  borderRadius: 8,
  background: "rgba(200,60,60,.12)",
  color: "var(--red-lt)",
  fontSize: 14,
};
