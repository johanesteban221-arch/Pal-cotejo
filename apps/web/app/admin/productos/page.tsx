"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Producto,
  getProductos,
  crearProducto,
  actualizarProducto,
  desactivarProducto,
  formatoCOP,
} from "../../../lib/api";
import { NoAutorizado, logout } from "../../../lib/auth";

export default function ProductosAdmin() {
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({ nombre: "", categoria: "BEBIDA", precio: "" });

  const onErr = (e: unknown) => {
    if (e instanceof NoAutorizado) {
      logout();
      router.replace("/admin/login");
    } else setMsg("⚠️ " + (e as Error).message);
  };
  const aviso = (t: string) => { setMsg(t); setTimeout(() => setMsg(""), 3500); };
  const cargar = () => getProductos(true).then(setProductos).catch(onErr);
  useEffect(() => { cargar(); }, []);

  function crear(e: React.FormEvent) {
    e.preventDefault();
    crearProducto({ nombre: f.nombre, categoria: f.categoria, precio: Number(f.precio) })
      .then(() => { aviso("✓ Producto creado"); setF({ nombre: "", categoria: "BEBIDA", precio: "" }); cargar(); })
      .catch(onErr);
  }

  return (
    <>
      <div className="admin-header">
        <div className="admin-title">Productos del bar (catálogo)</div>
      </div>
      {msg && <div className="admin-table-wrap" style={{ padding: "12px 20px", marginBottom: 16, color: msg.startsWith("✓") ? "#4CAF50" : "var(--red-lt)" }}>{msg}</div>}

      <form className="admin-table-wrap" style={{ marginBottom: 20 }} onSubmit={crear}>
        <div className="admin-table-header"><span className="admin-table-title">Nuevo producto</span></div>
        <div style={{ padding: 20, display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 16, alignItems: "end" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Nombre</label>
            <input className="form-input" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Cerveza nacional" required />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Categoría</label>
            <select className="form-select" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
              <option value="BEBIDA">Bebida</option><option value="COMIDA">Comida</option><option value="OTRO">Otro</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Precio (COP)</label>
            <input className="form-input" type="number" value={f.precio} onChange={(e) => setF({ ...f, precio: e.target.value })} placeholder="5000" required />
          </div>
          <button className="btn-gold" type="submit">Agregar</button>
        </div>
      </form>

      <div className="admin-table-wrap">
        <div className="admin-table-header"><span className="admin-table-title">Catálogo</span></div>
        <table>
          <thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} style={{ opacity: p.activo ? 1 : 0.5 }}>
                <td>{p.nombre}</td>
                <td><span className="status-pill pill-gray">{p.categoria}</span></td>
                <td>
                  <input className="form-input" type="number" defaultValue={p.precio} style={{ width: 110, padding: "6px 10px" }}
                    onBlur={(e) => { const v = Number(e.target.value); if (v !== p.precio) actualizarProducto(p.id, { precio: v }).then(() => aviso("✓ Precio actualizado")).catch(onErr); }} />
                </td>
                <td>{p.activo ? <span className="status-pill pill-green">Activo</span> : <span className="status-pill pill-red">Inactivo</span>}</td>
                <td>
                  {p.activo
                    ? <button className="btn-outline" style={{ fontSize: 12, padding: "4px 10px", color: "var(--red-lt)", borderColor: "rgba(192,57,43,.4)" }} onClick={() => desactivarProducto(p.id).then(() => { aviso("Producto desactivado"); cargar(); }).catch(onErr)}>Desactivar</button>
                    : <button className="btn-outline" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => actualizarProducto(p.id, { activo: true }).then(() => { aviso("✓ Reactivado"); cargar(); }).catch(onErr)}>Reactivar</button>}
                </td>
              </tr>
            ))}
            {productos.length === 0 && <tr><td colSpan={5} className="muted" style={{ textAlign: "center" }}>Sin productos. Crea el primero arriba.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>El precio se guarda al salir del campo (clic afuera). Para vender, usa <b>Sport bar → Punto de venta</b>.</p>
    </>
  );
}
