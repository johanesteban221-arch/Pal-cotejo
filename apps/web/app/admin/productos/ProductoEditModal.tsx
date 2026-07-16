"use client";

import { useState } from "react";
import { Producto, actualizarProducto } from "../../../lib/api";
import { NoAutorizado } from "../../../lib/auth";

const CATS: { value: Producto["categoria"]; label: string }[] = [
  { value: "BEBIDA", label: "Bebida" },
  { value: "COMIDA", label: "Comida" },
  { value: "OTRO", label: "Otro" },
];

export default function ProductoEditModal({
  producto,
  onClose,
  onSaved,
  onErr,
}: {
  producto: Producto;
  onClose: () => void;
  onSaved: () => void;
  onErr: (e: unknown) => void;
}) {
  const esPresentacion = !!producto.stockBaseId;
  const [nombre, setNombre] = useState(producto.nombre);
  const [categoria, setCategoria] = useState<Producto["categoria"]>(producto.categoria);
  const [precio, setPrecio] = useState(String(producto.precio));
  const [stockMinimo, setStockMinimo] = useState(String(producto.stockMinimo));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function guardar() {
    setError("");
    if (nombre.trim().length < 1) {
      setError("El nombre es obligatorio.");
      return;
    }
    const p = Number(precio);
    if (!Number.isInteger(p) || p < 0) {
      setError("El precio debe ser un entero ≥ 0.");
      return;
    }
    const data: Record<string, unknown> = { nombre: nombre.trim(), categoria, precio: p };
    // Presentación: NO se toca stock/mínimo (usa el stock de su base).
    if (!esPresentacion) {
      const sm = Number(stockMinimo);
      if (!Number.isInteger(sm) || sm < 0) {
        setError("El stock mínimo debe ser un entero ≥ 0.");
        return;
      }
      data.stockMinimo = sm;
    }

    setGuardando(true);
    actualizarProducto(producto.id, data)
      .then(() => onSaved())
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
          <div className="admin-title" style={{ fontSize: 22 }}>Editar producto</div>
          <button className="btn-outline" style={{ padding: "6px 12px", fontSize: 13 }} onClick={onClose}>Cerrar ✕</button>
        </div>

        {error && <div style={bannerErr}>⚠️ {error}</div>}

        {esPresentacion && (
          <div className="muted" style={{ fontSize: 12, marginBottom: 14, padding: "8px 12px", background: "var(--bg)", borderRadius: 8 }}>
            Presentación de <b>{producto.stockBase?.nombre ?? "producto base"}</b> — usa su stock. Solo se editan nombre, categoría y precio.
          </div>
        )}

        <div style={{ display: "grid", gap: 14 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Nombre</label>
            <input className="form-input" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Categoría</label>
            <select className="form-select" value={categoria} onChange={(e) => setCategoria(e.target.value as Producto["categoria"])}>
              {CATS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Precio (COP)</label>
            <input className="form-input" type="number" min={0} step={1} value={precio} onChange={(e) => setPrecio(e.target.value)} />
          </div>

          {!esPresentacion && (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Stock mínimo (alerta)</label>
              <input className="form-input" type="number" min={0} step={1} value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} />
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>El stock se ajusta con “+ Entrada”, no aquí.</div>
            </div>
          )}
        </div>

        <button className="btn-gold" style={{ width: "100%", marginTop: 20 }} disabled={guardando} onClick={guardar}>
          {guardando ? "Guardando…" : "Guardar cambios"}
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
  maxWidth: 460,
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
