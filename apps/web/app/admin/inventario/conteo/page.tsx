"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ConteoCajero,
  getConteoActual,
  abrirConteo,
  guardarLineaConteo,
  enviarConteo,
} from "../../../../lib/api";
import { NoAutorizado, logout } from "../../../../lib/auth";

export default function ConteoCajeroPage() {
  const router = useRouter();
  const [conteo, setConteo] = useState<ConteoCajero | null>(null);
  const [cargando, setCargando] = useState(true);
  const [msg, setMsg] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [valores, setValores] = useState<Record<string, string>>({});

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
    setTimeout(() => setMsg(""), 4000);
  };

  function mapValores(c: ConteoCajero): Record<string, string> {
    const m: Record<string, string> = {};
    c.lineas.forEach((l) => {
      m[l.id] = l.stockContado != null ? String(l.stockContado) : "";
    });
    return m;
  }

  function cargar() {
    setCargando(true);
    getConteoActual()
      .then((c) => {
        setConteo(c);
        setValores(c ? mapValores(c) : {});
      })
      .catch(onErr)
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    cargar(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function iniciar() {
    if (procesando) return;
    setProcesando(true);
    abrirConteo()
      .then((c) => {
        setConteo(c);
        setValores(mapValores(c));
        aviso("✓ Conteo iniciado.");
      })
      .catch(onErr)
      .finally(() => setProcesando(false));
  }

  // Guarda una línea al salir del campo (blur). No re-envía si no cambió o si está vacío.
  function guardar(lineaId: string) {
    const raw = valores[lineaId];
    if (raw == null || raw.trim() === "") return;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0) {
      aviso("⚠️ La cantidad debe ser un entero ≥ 0.");
      return;
    }
    const linea = conteo?.lineas.find((l) => l.id === lineaId);
    if (linea && linea.stockContado === n) return;
    guardarLineaConteo(lineaId, n)
      .then((r) => {
        setConteo((prev) =>
          prev
            ? { ...prev, lineas: prev.lineas.map((l) => (l.id === lineaId ? { ...l, stockContado: r.stockContado } : l)) }
            : prev,
        );
      })
      .catch(onErr);
  }

  function enviar() {
    if (procesando) return;
    setProcesando(true);
    enviarConteo()
      .then(() => {
        setConteo(null);
        setValores({});
        aviso("✓ Conteo enviado a revisión.");
      })
      .catch(onErr) // 400 "Faltan N por contar" → onErr muestra el mensaje del backend
      .finally(() => setProcesando(false));
  }

  const contados = conteo ? conteo.lineas.filter((l) => l.stockContado != null).length : 0;
  const total = conteo ? conteo.lineas.length : 0;

  return (
    <>
      <div className="admin-header">
        <div className="admin-title">Conteo de inventario</div>
        {conteo && <span className="status-pill pill-gold">{contados} de {total} contados</span>}
      </div>

      {msg && (
        <div className="admin-table-wrap" style={{ padding: "12px 20px", marginBottom: 16, color: msg.startsWith("✓") ? "#4CAF50" : "var(--red-lt)" }}>
          {msg}
        </div>
      )}

      <div className="admin-table-wrap" style={{ padding: "14px 20px", marginBottom: 16, fontSize: 13 }}>
        <b style={{ color: "var(--cream)" }}>Conteo físico a ciegas.</b> Cuenta cuántas unidades hay <b>físicamente</b> de cada producto y escríbelas. <b>No verás el stock del sistema</b>. Al terminar, envía a revisión: el administrador comparará y decidirá los ajustes.
      </div>

      {cargando ? (
        <div className="admin-table-wrap">
          <div className="muted" style={{ padding: 40, textAlign: "center" }}>Cargando…</div>
        </div>
      ) : !conteo ? (
        <div className="admin-table-wrap" style={{ padding: 40, textAlign: "center" }}>
          <div className="muted" style={{ marginBottom: 16 }}>No hay un conteo en curso.</div>
          <button className="btn-gold" disabled={procesando} onClick={iniciar}>
            {procesando ? "Iniciando…" : "Iniciar conteo"}
          </button>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <div className="admin-table-header">
              <span className="admin-table-title">¿Cuántas unidades hay de cada producto?</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th style={{ width: 170 }}>Cantidad física</th>
                </tr>
              </thead>
              <tbody>
                {conteo.lineas.map((l) => (
                  <tr key={l.id}>
                    <td style={{ color: "var(--cream)", fontFamily: "var(--font-d)" }}>{l.producto.nombre}</td>
                    <td><span className="status-pill pill-gray">{l.producto.categoria}</span></td>
                    <td>
                      <input
                        className="form-input"
                        type="number"
                        min={0}
                        step={1}
                        style={{ width: 120, padding: "6px 10px" }}
                        placeholder="—"
                        value={valores[l.id] ?? ""}
                        onChange={(e) => setValores((v) => ({ ...v, [l.id]: e.target.value }))}
                        onBlur={() => guardar(l.id)}
                      />
                      {l.stockContado != null && (
                        <span style={{ marginLeft: 8, fontSize: 12, color: "#4CAF50" }}>✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn-gold" disabled={procesando} onClick={enviar}>
              {procesando ? "Enviando…" : "Enviar a revisión"}
            </button>
            <span className="muted" style={{ fontSize: 13 }}>
              {contados} de {total} productos contados{contados < total ? " — cuenta todos para poder enviar" : " — listo para enviar"}
            </span>
          </div>
        </>
      )}
    </>
  );
}
