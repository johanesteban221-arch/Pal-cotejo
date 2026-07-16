"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ConteoPendiente,
  ConteoRevision,
  getConteosPendientes,
  getConteoRevision,
  ajustarLineaConteo,
  cerrarConteo,
} from "../../../../../lib/api";
import { NoAutorizado, getUser, logout } from "../../../../../lib/auth";

export default function ConteoRevisionPage() {
  const router = useRouter();
  const [ok, setOk] = useState(false); // guard A·S (UX; la API además da 403)
  const [pendientes, setPendientes] = useState<ConteoPendiente[]>([]);
  const [sel, setSel] = useState<ConteoRevision | null>(null);
  const [cargando, setCargando] = useState(true);
  const [msg, setMsg] = useState("");
  const [procesando, setProcesando] = useState(false);

  const onErr = (e: unknown) => {
    if (e instanceof NoAutorizado) {
      logout();
      router.replace("/admin/login");
    } else {
      setMsg("⚠️ " + (e as Error).message);
    }
  };
  const aviso = (t: string) => {
    setMsg(t);
    setTimeout(() => setMsg(""), 5000);
  };

  function cargarPendientes() {
    setCargando(true);
    getConteosPendientes().then(setPendientes).catch(onErr).finally(() => setCargando(false));
  }

  // Guard suave: solo ADMIN/SUPERVISOR. Un CAJA jamás ve esta cara (esperado/diferencia).
  useEffect(() => {
    const rol = getUser()?.rol;
    if (rol === "ADMIN" || rol === "SUPERVISOR") {
      setOk(true);
      cargarPendientes();
    } else {
      router.replace("/admin");
    } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrir(id: string) {
    getConteoRevision(id).then(setSel).catch(onErr);
  }

  function ajustar(lineaId: string) {
    if (!sel || procesando) return;
    setProcesando(true);
    ajustarLineaConteo(sel.id, lineaId)
      .then((r) => {
        setSel((prev) =>
          prev ? { ...prev, lineas: prev.lineas.map((l) => (l.id === lineaId ? { ...l, ajustado: true } : l)) } : prev,
        );
        aviso(`✓ Stock actualizado: ${r.producto} → ${r.stockNuevo} (${r.aplicado > 0 ? "+" : ""}${r.aplicado}).`);
      })
      .catch(onErr)
      .finally(() => setProcesando(false));
  }

  function cerrar() {
    if (!sel || procesando) return;
    const sinAjustar = sel.lineas.filter((l) => (l.diferencia ?? 0) !== 0 && !l.ajustado).length;
    const txt =
      sinAjustar > 0
        ? `Hay ${sinAjustar} línea(s) con diferencia SIN ajustar. Al cerrar quedan como registro y su stock NO se toca.\n\n¿Cerrar el conteo?`
        : "¿Cerrar el conteo? Quedará sellado (inmutable).";
    if (!window.confirm(txt)) return;
    setProcesando(true);
    cerrarConteo(sel.id)
      .then(() => {
        aviso("✓ Conteo cerrado.");
        setSel(null);
        cargarPendientes();
      })
      .catch(onErr)
      .finally(() => setProcesando(false));
  }

  if (!ok) return null;

  const difColor = (d: number | null) => (d == null || d === 0 ? "var(--muted)" : d < 0 ? "var(--red-lt)" : "#4CAF50");
  const difTxt = (d: number | null) => (d == null ? "—" : d === 0 ? "0" : d > 0 ? `+${d}` : `${d}`);

  return (
    <>
      <div className="admin-header">
        <div className="admin-title">Revisión de conteo</div>
        {sel && (
          <button className="btn-outline" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => setSel(null)}>
            ← Volver a pendientes
          </button>
        )}
      </div>

      {msg && (
        <div className="admin-table-wrap" style={{ padding: "12px 20px", marginBottom: 16, color: msg.startsWith("✓") ? "#4CAF50" : "var(--red-lt)" }}>
          {msg}
        </div>
      )}

      {!sel ? (
        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <span className="admin-table-title">Conteos pendientes de revisión</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Abierto</th>
                <th>Contó (usuario)</th>
                <th>Productos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pendientes.map((c) => (
                <tr key={c.id}>
                  <td>{new Date(c.abiertoEn).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="muted" style={{ fontFamily: "monospace", fontSize: 12 }}>…{c.usuarioAperturaId.slice(-6)}</td>
                  <td>{c._count.lineas}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn-gold" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => abrir(c.id)}>
                      Revisar
                    </button>
                  </td>
                </tr>
              ))}
              {cargando && (
                <tr>
                  <td colSpan={4} className="muted" style={{ textAlign: "center" }}>Cargando…</td>
                </tr>
              )}
              {!cargando && pendientes.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted" style={{ textAlign: "center" }}>No hay conteos pendientes de revisión.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap" style={{ padding: "14px 20px", marginBottom: 16, fontSize: 13 }}>
            <b style={{ color: "var(--cream)" }}>Revisa las diferencias.</b> <b>Ajustar</b> mueve el stock real (deja un movimiento en el kardex). <b>Cerrar</b> sella el conteo; las líneas sin ajustar quedan como registro sin tocar su stock. Diferencia:{" "}
            <span style={{ color: "var(--red-lt)" }}>rojo = faltante</span>, <span style={{ color: "#4CAF50" }}>verde = sobrante</span>.
          </div>

          <div className="admin-table-wrap">
            <div className="admin-table-header">
              <span className="admin-table-title">Diferencias del conteo</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Esperado</th>
                  <th>Contado</th>
                  <th>Diferencia</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sel.lineas.map((l) => {
                  const ajustable = (l.diferencia ?? 0) !== 0 && !l.ajustado;
                  return (
                    <tr key={l.id}>
                      <td style={{ color: "var(--cream)", fontFamily: "var(--font-d)" }}>{l.producto.nombre}</td>
                      <td>{l.stockEsperado}</td>
                      <td>{l.stockContado ?? "—"}</td>
                      <td style={{ color: difColor(l.diferencia), fontFamily: "var(--font-d)" }}>{difTxt(l.diferencia)}</td>
                      <td>
                        {l.ajustado ? (
                          <span className="status-pill pill-green">Ajustado ✓</span>
                        ) : (l.diferencia ?? 0) === 0 ? (
                          <span className="status-pill pill-gray">Sin diferencia</span>
                        ) : (
                          <span className="status-pill pill-gold">Pendiente</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {ajustable && (
                          <button className="btn-outline" style={{ fontSize: 12, padding: "6px 12px" }} disabled={procesando} onClick={() => ajustar(l.id)}>
                            Ajustar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 16 }}>
            <button className="btn-gold" disabled={procesando} onClick={cerrar}>Cerrar conteo</button>
          </div>
        </>
      )}
    </>
  );
}
