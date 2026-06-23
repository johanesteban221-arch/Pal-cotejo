"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Producto,
  Cuenta,
  ReporteBar,
  getProductos,
  getCuentasAbiertas,
  getCuenta,
  abrirCuenta,
  agregarItem,
  quitarItem,
  cobrarCuenta,
  anularCuenta,
  getReporteBar,
  formatoCOP,
} from "../../../lib/api";
import { NoAutorizado, logout } from "../../../lib/auth";

export default function BarPOS() {
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [reporte, setReporte] = useState<ReporteBar | null>(null);
  const [sel, setSel] = useState<Cuenta | null>(null);
  const [nuevaMesa, setNuevaMesa] = useState("");
  const [msg, setMsg] = useState("");
  const [recibo, setRecibo] = useState<{
    mesa: string | null; total: number; metodo: string; codigo: string; fecha: string;
    items: { nombre: string; cantidad: number; subtotal: number }[];
  } | null>(null);

  const onErr = (e: unknown) => {
    if (e instanceof NoAutorizado) {
      logout();
      router.replace("/admin/login");
    } else setMsg("⚠️ " + (e as Error).message);
  };
  const aviso = (t: string) => {
    setMsg(t);
    setTimeout(() => setMsg(""), 3500);
  };

  function recargar() {
    getCuentasAbiertas().then(setCuentas).catch(onErr);
    getReporteBar().then(setReporte).catch(onErr);
  }
  useEffect(() => {
    getProductos().then(setProductos).catch(onErr);
    recargar(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrir() {
    abrirCuenta({ mesa: nuevaMesa || "Mesa" })
      .then((c) => {
        setNuevaMesa("");
        recargar();
        getCuenta(c.id).then(setSel);
      })
      .catch(onErr);
  }
  function seleccionar(id: string) {
    getCuenta(id).then(setSel).catch(onErr);
  }
  function add(productoId: string) {
    if (!sel) return;
    agregarItem(sel.id, productoId).then((c) => { setSel(c); recargar(); }).catch(onErr);
  }
  function quitar(itemId: string) {
    if (!sel) return;
    quitarItem(itemId).then((c) => { setSel(c); recargar(); }).catch(onErr);
  }
  function cobrar(metodo: string) {
    if (!sel) return;
    const datos = {
      mesa: sel.mesa,
      total: sel.total,
      metodo,
      codigo: sel.id.slice(-6).toUpperCase(),
      fecha: new Date().toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }),
      items: (sel.items || []).map((i) => ({ nombre: i.producto?.nombre || "Producto", cantidad: i.cantidad, subtotal: i.subtotal })),
    };
    cobrarCuenta(sel.id, metodo)
      .then(() => { setRecibo(datos); aviso(`✓ Cobrado ${formatoCOP(datos.total)} (${metodo})`); setSel(null); recargar(); })
      .catch(onErr);
  }
  function anular() {
    if (!sel) return;
    anularCuenta(sel.id).then(() => { aviso("Cuenta anulada"); setSel(null); recargar(); }).catch(onErr);
  }

  const bebidas = productos.filter((p) => p.categoria === "BEBIDA");
  const comidas = productos.filter((p) => p.categoria !== "BEBIDA");

  return (
    <>
      <div className="admin-header">
        <div className="admin-title">Sport Bar — Punto de venta</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="status-pill pill-green">Hoy: {reporte ? formatoCOP(reporte.ventasHoy) : "—"}</span>
          <span className="status-pill pill-gold">Semana: {reporte ? formatoCOP(reporte.ventasSemana) : "—"}</span>
          <span className="status-pill pill-gray">Cuentas abiertas: {reporte?.cuentasAbiertas ?? 0}</span>
        </div>
      </div>

      {msg && (
        <div className="admin-table-wrap" style={{ padding: "12px 20px", marginBottom: 16, color: msg.startsWith("✓") ? "#4CAF50" : "var(--red-lt)" }}>{msg}</div>
      )}

      <div className="grid-2" style={{ alignItems: "start" }}>
        {/* Cuentas abiertas */}
        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <span className="admin-table-title">Cuentas abiertas</span>
          </div>
          <div style={{ padding: 16, display: "flex", gap: 8 }}>
            <input className="form-input" placeholder="Mesa / nombre (ej. Mesa 3)" value={nuevaMesa} onChange={(e) => setNuevaMesa(e.target.value)} onKeyDown={(e) => e.key === "Enter" && abrir()} />
            <button className="btn-gold" style={{ whiteSpace: "nowrap" }} onClick={abrir}>+ Abrir</button>
          </div>
          <div style={{ padding: "0 16px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
            {cuentas.map((c) => (
              <div key={c.id} onClick={() => seleccionar(c.id)}
                style={{ border: `1px solid ${sel?.id === c.id ? "var(--gold)" : "var(--border)"}`, borderRadius: 10, padding: 12, cursor: "pointer", background: sel?.id === c.id ? "rgba(212,160,23,.08)" : "var(--bg)" }}>
                <div style={{ fontFamily: "var(--font-d)", color: "var(--cream)" }}>{c.mesa || "Mesa"}</div>
                <div className="muted" style={{ fontSize: 12 }}>{c.items?.length ?? 0} ítems</div>
                <div style={{ color: "var(--gold)", fontFamily: "var(--font-d)", marginTop: 4 }}>{formatoCOP(c.total)}</div>
              </div>
            ))}
            {cuentas.length === 0 && <div className="muted">No hay cuentas abiertas. Abre una arriba.</div>}
          </div>
        </div>

        {/* Cuenta seleccionada + catálogo */}
        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <span className="admin-table-title">{sel ? sel.mesa || "Cuenta" : "Selecciona una cuenta"}</span>
            {sel && <span className="status-pill pill-gold">{formatoCOP(sel.total)}</span>}
          </div>

          {!sel ? (
            <div style={{ padding: 24 }} className="muted">Abre o selecciona una cuenta para agregar productos.</div>
          ) : (
            <div style={{ padding: 16 }}>
              {/* Ítems de la cuenta */}
              {sel.items && sel.items.length > 0 ? (
                <div style={{ marginBottom: 14 }}>
                  {sel.items.map((it) => (
                    <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                      <span>{it.cantidad}× {it.producto?.nombre}</span>
                      <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <b style={{ color: "var(--cream)" }}>{formatoCOP(it.subtotal)}</b>
                        <button onClick={() => quitar(it.id)} style={{ background: "none", border: "none", color: "var(--red-lt)", cursor: "pointer", fontSize: 14 }}>✕</button>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted" style={{ marginBottom: 14 }}>Cuenta vacía. Agrega productos abajo.</div>
              )}

              {/* Catálogo */}
              <div className="form-label">Bebidas</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {bebidas.map((p) => (
                  <button key={p.id} className="btn-outline" style={{ padding: "8px 12px", fontSize: 13 }} onClick={() => add(p.id)}>
                    {p.nombre} · {formatoCOP(p.precio)}
                  </button>
                ))}
              </div>
              <div className="form-label">Comidas / otros</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {comidas.map((p) => (
                  <button key={p.id} className="btn-outline" style={{ padding: "8px 12px", fontSize: 13 }} onClick={() => add(p.id)}>
                    {p.nombre} · {formatoCOP(p.precio)}
                  </button>
                ))}
              </div>

              {/* Cobrar */}
              <div className="form-label">Cobrar ({formatoCOP(sel.total)})</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn-gold" disabled={!sel.items?.length} onClick={() => cobrar("EFECTIVO")}>💵 Efectivo</button>
                <button className="btn-gold" disabled={!sel.items?.length} onClick={() => cobrar("TARJETA")}>💳 Tarjeta</button>
                <button className="btn-outline" disabled={!sel.items?.length} onClick={() => cobrar("OTRO")}>Otro</button>
                <button className="btn-outline" style={{ color: "var(--red-lt)", borderColor: "rgba(192,57,43,.4)" }} onClick={anular}>Anular</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top productos */}
      {reporte && reporte.topProductos.length > 0 && (
        <div className="admin-table-wrap" style={{ marginTop: 16 }}>
          <div className="admin-table-header"><span className="admin-table-title">Productos más vendidos</span></div>
          <table>
            <thead><tr><th>Producto</th><th>Cantidad</th><th>Ingresos</th></tr></thead>
            <tbody>
              {reporte.topProductos.map((p) => (
                <tr key={p.nombre}><td>{p.nombre}</td><td>{p.cantidad}</td><td style={{ color: "var(--gold)" }}>{formatoCOP(p.ingresos)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {recibo && <ReciboModal r={recibo} onClose={() => setRecibo(null)} />}
    </>
  );
}

function ReciboModal({
  r, onClose,
}: {
  r: { mesa: string | null; total: number; metodo: string; codigo: string; fecha: string; items: { nombre: string; cantidad: number; subtotal: number }[] };
  onClose: () => void;
}) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div id="recibo-print" className="recibo">
          <h3>PAL COTEJO</h3>
          <div className="rsub">Sport Bar · Recibo de venta</div>
          <div className="rrow"><span>Recibo</span><span>#{r.codigo}</span></div>
          <div className="rrow"><span>Fecha</span><span>{r.fecha}</span></div>
          {r.mesa && <div className="rrow"><span>Mesa</span><span>{r.mesa}</span></div>}
          <div className="rline" />
          {r.items.map((i, idx) => (
            <div className="rrow" key={idx}>
              <span>{i.cantidad}× {i.nombre}</span>
              <span>{formatoCOP(i.subtotal)}</span>
            </div>
          ))}
          <div className="rline" />
          <div className="rrow rtotal"><span>TOTAL</span><span>{formatoCOP(r.total)}</span></div>
          <div className="rrow"><span>Pago</span><span>{r.metodo}</span></div>
          <div className="rfoot">¡Gracias por su visita! ⚽</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-gold" onClick={() => window.print()}>🖨️ Imprimir</button>
          <button className="btn-outline" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
