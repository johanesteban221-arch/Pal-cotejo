"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Producto,
  getProductos,
  crearProducto,
  actualizarProducto,
  desactivarProducto,
  entradaInventario,
  eliminarProducto,
  formatoCOP,
} from "../../../lib/api";
import { NoAutorizado, logout } from "../../../lib/auth";

export default function ProductosAdmin() {
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({ nombre: "", categoria: "BEBIDA", precio: "", stock: "", stockMinimo: "" });

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
    crearProducto({
      nombre: f.nombre, categoria: f.categoria, precio: Number(f.precio),
      stock: Number(f.stock || 0), stockMinimo: Number(f.stockMinimo || 0),
    })
      .then(() => { aviso("✓ Producto creado"); setF({ nombre: "", categoria: "BEBIDA", precio: "", stock: "", stockMinimo: "" }); cargar(); })
      .catch(onErr);
  }

  function entrada(p: Producto) {
    const cant = prompt(`Entrada de inventario para "${p.nombre}".\n¿Cuántas unidades ingresaron?`, "12");
    if (!cant) return;
    const n = Number(cant);
    if (!n || n < 1) return;
    entradaInventario(p.id, n).then(() => { aviso(`✓ +${n} a ${p.nombre} (stock actualizado)`); cargar(); }).catch(onErr);
  }

  const bajos = productos.filter((p) => p.activo && p.stock <= p.stockMinimo).length;

  return (
    <>
      <div className="admin-header">
        <div className="admin-title">Productos e inventario</div>
        {bajos > 0 && <span className="status-pill pill-red">⚠ {bajos} con stock bajo</span>}
      </div>
      {msg && <div className="admin-table-wrap" style={{ padding: "12px 20px", marginBottom: 16, color: msg.startsWith("✓") ? "#4CAF50" : "var(--red-lt)" }}>{msg}</div>}

      <form className="admin-table-wrap" style={{ marginBottom: 20 }} onSubmit={crear}>
        <div className="admin-table-header"><span className="admin-table-title">Nuevo producto</span></div>
        <div style={{ padding: 20, display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", gap: 14, alignItems: "end" }}>
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
            <label className="form-label">Precio</label>
            <input className="form-input" type="number" value={f.precio} onChange={(e) => setF({ ...f, precio: e.target.value })} placeholder="5000" required />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Stock inicial</label>
            <input className="form-input" type="number" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} placeholder="0" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Stock mín.</label>
            <input className="form-input" type="number" value={f.stockMinimo} onChange={(e) => setF({ ...f, stockMinimo: e.target.value })} placeholder="0" />
          </div>
          <button className="btn-gold" type="submit">Agregar</button>
        </div>
      </form>

      <div className="admin-table-wrap">
        <div className="admin-table-header"><span className="admin-table-title">Catálogo</span></div>
        <table>
          <thead><tr><th>Producto</th><th>Cat.</th><th>Precio</th><th>Stock</th><th>Mín.</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {productos.map((p) => {
              const esPresentacion = !!p.stockBaseId;
              const bajo = p.stock <= p.stockMinimo;
              return (
                <tr key={p.id} style={{ opacity: p.activo ? 1 : 0.5 }}>
                  <td>
                    {esPresentacion ? <span style={{ color: "var(--muted)" }}>↳ </span> : null}
                    {p.nombre}
                    {esPresentacion && <span className="status-pill pill-gray" style={{ marginLeft: 6, fontSize: 10 }}>×{p.unidades} u</span>}
                  </td>
                  <td><span className="status-pill pill-gray">{p.categoria}</span></td>
                  <td>
                    <input className="form-input" type="number" defaultValue={p.precio} style={{ width: 100, padding: "6px 10px" }}
                      onBlur={(e) => { const v = Number(e.target.value); if (v !== p.precio) actualizarProducto(p.id, { precio: v }).then(() => aviso("✓ Precio actualizado")).catch(onErr); }} />
                  </td>
                  <td>
                    {esPresentacion
                      ? <span className="muted" style={{ fontSize: 12 }}>usa stock de {p.stockBase?.nombre}</span>
                      : <span className={`status-pill ${bajo ? "pill-red" : "pill-green"}`}>{p.stock}</span>}
                  </td>
                  <td>
                    {esPresentacion ? <span className="muted">—</span> : (
                      <input className="form-input" type="number" defaultValue={p.stockMinimo} style={{ width: 70, padding: "6px 10px" }}
                        onBlur={(e) => { const v = Number(e.target.value); if (v !== p.stockMinimo) actualizarProducto(p.id, { stockMinimo: v }).then(() => aviso("✓ Mínimo actualizado")).catch(onErr); }} />
                    )}
                  </td>
                  <td>{p.activo ? <span className="status-pill pill-green">Activo</span> : <span className="status-pill pill-red">Inactivo</span>}</td>
                  <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {!esPresentacion && <button className="btn-gold" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => entrada(p)}>+ Entrada</button>}
                    {p.activo
                      ? <button className="btn-outline" style={{ fontSize: 12, padding: "4px 10px", color: "var(--red-lt)", borderColor: "rgba(192,57,43,.4)" }} onClick={() => desactivarProducto(p.id).then(() => { aviso("Desactivado"); cargar(); }).catch(onErr)}>Off</button>
                      : <button className="btn-outline" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => actualizarProducto(p.id, { activo: true }).then(() => { aviso("✓ Reactivado"); cargar(); }).catch(onErr)}>On</button>}
                    <button className="btn-outline" style={{ fontSize: 12, padding: "4px 10px", color: "var(--red-lt)", borderColor: "rgba(192,57,43,.4)" }}
                      onClick={() => { if (confirm(`¿Eliminar "${p.nombre}" del todo? (solo si no tiene ventas)`)) eliminarProducto(p.id).then(() => { aviso("✓ Eliminado"); cargar(); }).catch(onErr); }}>
                      🗑
                    </button>
                  </td>
                </tr>
              );
            })}
            {productos.length === 0 && <tr><td colSpan={7} className="muted" style={{ textAlign: "center" }}>Sin productos. Crea el primero arriba.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
        <b>+ Entrada</b> = registrar mercancía que llega (suma al stock). El stock <b>baja solo</b> al cobrar una venta en el POS.
        El precio y el mínimo se guardan al salir del campo.
      </p>
    </>
  );
}
