"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Producto,
  Cuenta,
  Mesa,
  CajaActual,
  CajaCierre,
  ReporteBar,
  getProductos,
  getMesas,
  getCuentasAbiertas,
  getCuenta,
  abrirCuenta,
  agregarItem,
  quitarItem,
  cobrarCuenta,
  anularCuenta,
  getReporteBar,
  getCajaActual,
  abrirCaja,
  cerrarCaja,
  formatoCOP,
} from "../../../lib/api";
import { NoAutorizado, logout } from "../../../lib/auth";

const CATS: { key: "" | "BEBIDA" | "COMIDA" | "OTRO"; label: string }[] = [
  { key: "", label: "Todos" },
  { key: "BEBIDA", label: "Bebidas" },
  { key: "COMIDA", label: "Comidas" },
  { key: "OTRO", label: "Otros" },
];

export default function BarPOS() {
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [caja, setCaja] = useState<CajaActual | null>(null);
  const [cajaCargada, setCajaCargada] = useState(false);
  const [modalAbrir, setModalAbrir] = useState(false);
  const [modalCerrar, setModalCerrar] = useState(false);
  const [resumen, setResumen] = useState<CajaCierre | null>(null);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [reporte, setReporte] = useState<ReporteBar | null>(null);
  const [sel, setSel] = useState<Cuenta | null>(null);
  const [nuevaMesa, setNuevaMesa] = useState("");
  const [msg, setMsg] = useState("");
  const [cat, setCat] = useState<"" | "BEBIDA" | "COMIDA" | "OTRO">("");
  const [flash, setFlash] = useState<string | null>(null);
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
    getCajaActual().then((c) => { setCaja(c); setCajaCargada(true); }).catch(onErr);
  }
  useEffect(() => {
    getProductos().then(setProductos).catch(onErr);
    getMesas().then(setMesas).catch(onErr);
    recargar(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrir() {
    abrirCuenta({ mesa: nuevaMesa || "Barra" })
      .then((c) => {
        setNuevaMesa("");
        recargar();
        getCuenta(c.id).then(setSel);
      })
      .catch(onErr);
  }
  function abrirEnMesa(m: Mesa) {
    abrirCuenta({ mesaId: m.id })
      .then((c) => { recargar(); getCuenta(c.id).then(setSel); })
      // Carrera: si otra caja abrió primero (409), muestra el aviso y refresca.
      .catch((e) => { onErr(e); recargar(); });
  }
  function seleccionar(id: string) {
    getCuenta(id).then(setSel).catch(onErr);
  }
  function add(productoId: string) {
    if (!sel) return;
    setFlash(productoId);
    setTimeout(() => setFlash(null), 180);
    agregarItem(sel.id, productoId).then((c) => { setSel(c); recargar(); }).catch(onErr);
  }
  function quitar(itemId: string) {
    if (!sel) return;
    quitarItem(itemId).then((c) => { setSel(c); recargar(); }).catch(onErr);
  }
  function cobrar(metodo: string) {
    if (!sel) return;
    if (!caja) { aviso("Abre la caja para cobrar."); return; }
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
  function abrirCajaAction(montoInicial: number) {
    abrirCaja(montoInicial)
      .then(() => { setModalAbrir(false); recargar(); aviso("✓ Caja abierta."); })
      .catch(onErr);
  }
  function cerrarCajaAction(montoContado: number, nota?: string) {
    cerrarCaja(montoContado, nota)
      .then((r) => { setModalCerrar(false); setResumen(r); recargar(); })
      .catch(onErr);
  }
  function anular() {
    if (!sel) return;
    anularCuenta(sel.id).then(() => { aviso("Cuenta anulada"); setSel(null); recargar(); }).catch(onErr);
  }

  const catalogo = productos.filter((p) => (cat ? p.categoria === cat : true));

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

      {/* Estado de caja */}
      {cajaCargada &&
        (caja ? (
          <div className="admin-table-wrap" style={{ marginBottom: 16, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <span className="status-pill pill-green">● Caja abierta</span>
              <span className="muted" style={{ fontSize: 13 }}>Fondo <b style={{ color: "var(--cream)" }}>{formatoCOP(caja.montoInicial)}</b></span>
              <span className="muted" style={{ fontSize: 13 }}>Efectivo <b style={{ color: "#4CAF50" }}>{formatoCOP(caja.ventas.efectivo)}</b></span>
              <span className="muted" style={{ fontSize: 13 }}>Tarjeta <b style={{ color: "var(--cream)" }}>{formatoCOP(caja.ventas.tarjeta)}</b></span>
              <span className="muted" style={{ fontSize: 13 }}>Otro <b style={{ color: "var(--cream)" }}>{formatoCOP(caja.ventas.otro)}</b></span>
              <span style={{ fontSize: 13, color: "var(--gold)" }}>Efectivo esperado <b>{formatoCOP(caja.efectivoEsperado)}</b></span>
            </div>
            <button className="btn-outline" onClick={() => setModalCerrar(true)}>Cerrar caja</button>
          </div>
        ) : (
          <div className="admin-table-wrap" style={{ marginBottom: 16, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span className="status-pill pill-red">● Caja cerrada</span>
              <span className="muted" style={{ fontSize: 13 }}>Abre la caja para poder cobrar.</span>
            </span>
            <button className="btn-gold" onClick={() => setModalAbrir(true)}>Abrir caja</button>
          </div>
        ))}

      <div className="grid-2" style={{ alignItems: "start" }}>
        {/* Salón de mesas + Walk-in (columna izquierda) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="admin-table-wrap">
            <div className="admin-table-header">
              <span className="admin-table-title">Salón — mesas</span>
            </div>
            <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10 }}>
              {mesas.map((m) => {
                const cta = cuentas.find((c) => c.mesaId === m.id);
                const ocupada = !!cta;
                const activa = !!cta && sel?.id === cta.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => (cta ? seleccionar(cta.id) : abrirEnMesa(m))}
                    style={{
                      minHeight: 88,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 4,
                      padding: 12,
                      borderRadius: 10,
                      textAlign: "left",
                      cursor: "pointer",
                      border: `1px solid ${activa ? "var(--gold)" : ocupada ? "rgba(212,160,23,.5)" : "var(--border-g)"}`,
                      background: ocupada ? "rgba(212,160,23,.14)" : "var(--bg2)",
                      color: "var(--cream)",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-d)", fontSize: 14 }}>{m.nombre}</span>
                    <span className="muted" style={{ fontSize: 11 }}>Cap. {m.capacidad}</span>
                    {ocupada ? (
                      <span style={{ color: "var(--gold)", fontFamily: "var(--font-d)", fontSize: 13 }}>{formatoCOP(cta!.total)} · Ocupada</span>
                    ) : (
                      <span style={{ color: "#4CAF50", fontSize: 12 }}>● Libre</span>
                    )}
                  </button>
                );
              })}
              {mesas.length === 0 && <div className="muted">No hay mesas configuradas.</div>}
            </div>
          </div>

          <div className="admin-table-wrap">
            <div className="admin-table-header">
              <span className="admin-table-title">Walk-in / Barra</span>
            </div>
            <div style={{ padding: 16, display: "flex", gap: 8 }}>
              <input className="form-input" placeholder="Nombre (ej. Barra, Juan)" value={nuevaMesa} onChange={(e) => setNuevaMesa(e.target.value)} onKeyDown={(e) => e.key === "Enter" && abrir()} />
              <button className="btn-gold" style={{ whiteSpace: "nowrap" }} onClick={abrir}>+ Abrir</button>
            </div>
            <div style={{ padding: "0 16px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10 }}>
              {cuentas.filter((c) => !c.mesaId).map((c) => (
                <div key={c.id} onClick={() => seleccionar(c.id)}
                  style={{ border: `1px solid ${sel?.id === c.id ? "var(--gold)" : "var(--border)"}`, borderRadius: 10, padding: 12, cursor: "pointer", background: sel?.id === c.id ? "rgba(212,160,23,.08)" : "var(--bg)" }}>
                  <div style={{ fontFamily: "var(--font-d)", color: "var(--cream)" }}>{c.mesa || "Walk-in"}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{c.items?.length ?? 0} ítems</div>
                  <div style={{ color: "var(--gold)", fontFamily: "var(--font-d)", marginTop: 4 }}>{formatoCOP(c.total)}</div>
                </div>
              ))}
              {cuentas.filter((c) => !c.mesaId).length === 0 && <div className="muted" style={{ fontSize: 13 }}>Sin cuentas walk-in.</div>}
            </div>
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

              {/* Catálogo: pestañas por categoría + rejilla de tiles tocables */}
              <div className="form-label">Catálogo</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {CATS.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setCat(c.key)}
                    className="status-pill"
                    style={{
                      cursor: "pointer",
                      fontSize: 13,
                      padding: "6px 14px",
                      border: `1px solid ${cat === c.key ? "var(--gold)" : "var(--border)"}`,
                      background: cat === c.key ? "rgba(212,160,23,.14)" : "transparent",
                      color: cat === c.key ? "var(--gold)" : "var(--muted)",
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10, marginBottom: 16 }}>
                {catalogo.map((p) => {
                  // Sin stock solo para productos BASE (las presentaciones comparten el stock del base).
                  const sinStock = p.stockBaseId == null && p.stock <= 0;
                  const activo = flash === p.id;
                  return (
                    <button
                      key={p.id}
                      disabled={sinStock}
                      onClick={() => add(p.id)}
                      title={p.nombre}
                      style={{
                        minHeight: 92,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: 6,
                        padding: 12,
                        borderRadius: 10,
                        textAlign: "left",
                        border: `1px solid ${activo ? "var(--gold)" : "var(--border-g)"}`,
                        background: sinStock ? "var(--bg)" : activo ? "rgba(212,160,23,.22)" : "var(--bg2)",
                        opacity: sinStock ? 0.45 : 1,
                        cursor: sinStock ? "not-allowed" : "pointer",
                        transition: "background .12s, border-color .12s",
                        color: "var(--cream)",
                      }}
                    >
                      <span style={{ fontFamily: "var(--font-d)", fontSize: 13, lineHeight: 1.2 }}>{p.nombre}</span>
                      <span style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 6 }}>
                        <span style={{ color: "var(--gold)", fontFamily: "var(--font-d)", fontSize: 14 }}>{formatoCOP(p.precio)}</span>
                        {sinStock && <span className="muted" style={{ fontSize: 10 }}>Sin stock</span>}
                      </span>
                    </button>
                  );
                })}
                {catalogo.length === 0 && <div className="muted">Sin productos en esta categoría.</div>}
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

      {modalAbrir && <AbrirCajaModal onAbrir={abrirCajaAction} onClose={() => setModalAbrir(false)} />}
      {modalCerrar && caja && (
        <CerrarCajaModal caja={caja} cuentasAbiertas={cuentas.length} onCerrar={cerrarCajaAction} onClose={() => setModalCerrar(false)} />
      )}
      {resumen && <ResumenCierreModal r={resumen} onClose={() => setResumen(null)} />}
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


function Fila({ k, v, bold, muted }: { k: string; v: string; bold?: boolean; muted?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span className={muted ? "muted" : undefined}>{k}</span>
      <span style={{ color: bold ? "var(--gold)" : "var(--cream)", fontFamily: bold ? "var(--font-d)" : undefined }}>{v}</span>
    </div>
  );
}

function AbrirCajaModal({ onAbrir, onClose }: { onAbrir: (m: number) => void; onClose: () => void }) {
  const [monto, setMonto] = useState("");
  const [error, setError] = useState("");
  function confirmar() {
    const n = Number(monto);
    if (!Number.isInteger(n) || n < 0) { setError("El fondo debe ser un entero ≥ 0."); return; }
    onAbrir(n);
  }
  return (
    <div onClick={onClose} style={overlayCaja}>
      <div onClick={(e) => e.stopPropagation()} style={modalCaja}>
        <div className="admin-title" style={{ fontSize: 20, marginBottom: 16 }}>Abrir caja</div>
        {error && <div style={bannerError}>⚠️ {error}</div>}
        <div className="form-group" style={{ margin: 0, marginBottom: 16 }}>
          <label className="form-label">Fondo inicial (efectivo en el cajón)</label>
          <input className="form-input" type="number" min={0} step={1} value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0" autoFocus />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-gold" style={{ flex: 1 }} onClick={confirmar}>Abrir caja</button>
          <button className="btn-outline" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function CerrarCajaModal({ caja, cuentasAbiertas, onCerrar, onClose }: {
  caja: CajaActual; cuentasAbiertas: number; onCerrar: (contado: number, nota?: string) => void; onClose: () => void;
}) {
  const [contado, setContado] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const n = contado.trim() === "" ? null : Number(contado);
  const diferencia = n != null && Number.isFinite(n) ? n - caja.efectivoEsperado : null;
  const descuadre = diferencia != null && diferencia !== 0;
  function confirmar() {
    setError("");
    if (n == null || !Number.isInteger(n) || n < 0) { setError("Ingresa el efectivo contado (entero ≥ 0)."); return; }
    if (n - caja.efectivoEsperado !== 0 && !nota.trim()) { setError("Hay una diferencia. Indica el motivo del descuadre."); return; }
    onCerrar(n, nota.trim() || undefined);
  }
  const difColor = diferencia == null ? "var(--muted)" : diferencia === 0 ? "#4CAF50" : "var(--red-lt)";
  const difTxt = diferencia == null ? "—" : diferencia === 0 ? "Cuadra ✓" : `${diferencia > 0 ? "Sobrante" : "Faltante"} ${formatoCOP(Math.abs(diferencia))}`;
  return (
    <div onClick={onClose} style={overlayCaja}>
      <div onClick={(e) => e.stopPropagation()} style={modalCaja}>
        <div className="admin-title" style={{ fontSize: 20, marginBottom: 16 }}>Cierre de caja — arqueo</div>
        {cuentasAbiertas > 0 && <div style={{ ...bannerError, background: "rgba(212,160,23,.12)", color: "var(--gold)" }}>⚠️ Hay {cuentasAbiertas} cuenta(s) abierta(s) sin cobrar. Puedes cerrar igual.</div>}
        {error && <div style={bannerError}>⚠️ {error}</div>}
        <div style={{ display: "grid", gap: 6, marginBottom: 14, fontSize: 14 }}>
          <Fila k="Fondo inicial" v={formatoCOP(caja.montoInicial)} />
          <Fila k="Ventas efectivo" v={formatoCOP(caja.ventas.efectivo)} />
          <Fila k="Ventas tarjeta" v={formatoCOP(caja.ventas.tarjeta)} muted />
          <Fila k="Ventas otro" v={formatoCOP(caja.ventas.otro)} muted />
          <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />
          <Fila k="Efectivo esperado" v={formatoCOP(caja.efectivoEsperado)} bold />
        </div>
        <div className="form-group" style={{ margin: 0, marginBottom: 12 }}>
          <label className="form-label">Efectivo contado (físico)</label>
          <input className="form-input" type="number" min={0} step={1} value={contado} onChange={(e) => setContado(e.target.value)} placeholder="0" autoFocus />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 8, background: "var(--bg)", marginBottom: 12 }}>
          <span className="muted">Diferencia</span>
          <b style={{ color: difColor }}>{difTxt}</b>
        </div>
        {descuadre && (
          <div className="form-group" style={{ margin: 0, marginBottom: 14 }}>
            <label className="form-label">Motivo del descuadre (obligatorio)</label>
            <input className="form-input" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: faltó vuelto, propina…" />
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-gold" style={{ flex: 1 }} onClick={confirmar}>Cerrar caja</button>
          <button className="btn-outline" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function ResumenCierreModal({ r, onClose }: { r: CajaCierre; onClose: () => void }) {
  const dif = r.diferencia;
  const difColor = dif === 0 ? "#4CAF50" : "var(--red-lt)";
  return (
    <div onClick={onClose} style={overlayCaja}>
      <div onClick={(e) => e.stopPropagation()} style={modalCaja}>
        <div className="admin-title" style={{ fontSize: 20, marginBottom: 4 }}>Arqueo de cierre</div>
        <div className="muted" style={{ fontSize: 12, marginBottom: 16 }}>Caja cerrada.</div>
        <div style={{ display: "grid", gap: 6, fontSize: 14, marginBottom: 12 }}>
          <Fila k="Fondo inicial" v={formatoCOP(r.montoInicial)} />
          <Fila k="Efectivo (ventas)" v={formatoCOP(r.desglose.efectivo.total)} />
          <Fila k="Tarjeta" v={formatoCOP(r.desglose.tarjeta.total)} muted />
          <Fila k="Otro" v={formatoCOP(r.desglose.otro.total)} muted />
          <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />
          <Fila k="Esperado (efectivo)" v={formatoCOP(r.montoEsperado)} bold />
          <Fila k="Contado" v={formatoCOP(r.montoContado)} bold />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 8, background: "var(--bg)", marginBottom: 12 }}>
          <span className="muted">Diferencia</span>
          <b style={{ color: difColor }}>{dif === 0 ? "Cuadra ✓" : `${dif > 0 ? "Sobrante" : "Faltante"} ${formatoCOP(Math.abs(dif))}`}</b>
        </div>
        {r.nota && <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Nota: {r.nota}</div>}
        {r.aviso && <div style={{ ...bannerError, background: "rgba(212,160,23,.12)", color: "var(--gold)" }}>⚠️ {r.aviso}</div>}
        <button className="btn-gold" style={{ width: "100%" }} onClick={onClose}>Listo</button>
      </div>
    </div>
  );
}

const overlayCaja: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 24, zIndex: 300, overflowY: "auto" };
const modalCaja: React.CSSProperties = { width: "100%", maxWidth: 420, background: "var(--bg2)", border: "1px solid var(--border-g)", borderRadius: 14, padding: 24, margin: "auto" };
const bannerError: React.CSSProperties = { marginBottom: 14, padding: "10px 14px", borderRadius: 8, background: "rgba(200,60,60,.12)", color: "var(--red-lt)", fontSize: 14 };
