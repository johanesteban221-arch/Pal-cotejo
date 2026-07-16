"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MetodoCobro, TipoVerificacion, getMetodosCobro, cambiarEstadoMetodoCobro } from "../../../../lib/api";
import { NoAutorizado, logout } from "../../../../lib/auth";
import MetodoCobroModal from "./MetodoCobroModal";

// Traduce el tipo de verificación a lenguaje del dueño (no "CAJON"/"COMPROBANTE" crudo).
function verifInfo(v: TipoVerificacion) {
  return v === "CAJON"
    ? { corto: "Cajón", cls: "pill-gold", label: "Efectivo — va al cajón físico" }
    : { corto: "Comprobante", cls: "pill-gray", label: "Digital — se verifica con comprobante" };
}

export default function MetodosPagoAdmin() {
  const router = useRouter();
  const [metodos, setMetodos] = useState<MetodoCobro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [msg, setMsg] = useState("");
  const [modal, setModal] = useState<{ metodo: MetodoCobro | null } | null>(null);
  const [procesando, setProcesando] = useState(false);

  const onErr = (e: unknown) => {
    if (e instanceof NoAutorizado) {
      logout();
      router.replace("/admin/login");
    } else {
      setMsg("⚠️ " + (e as Error).message);
    }
  };

  function cargar() {
    setCargando(true);
    getMetodosCobro().then(setMetodos).catch(onErr).finally(() => setCargando(false));
  }

  useEffect(() => {
    cargar(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function aviso(t: string) {
    setMsg(t);
    setTimeout(() => setMsg(""), 3500);
  }

  function toggle(m: MetodoCobro) {
    if (procesando) return;
    setProcesando(true);
    cambiarEstadoMetodoCobro(m.id, !m.activo)
      .then(() => {
        cargar();
        aviso(m.activo ? "✓ Método archivado." : "✓ Método reactivado.");
      })
      .catch(onErr) // el 409 del último activo llega como mensaje claro del backend
      .finally(() => setProcesando(false));
  }

  return (
    <>
      <div className="admin-header">
        <div className="admin-title">Métodos de pago</div>
        <button
          className="btn-gold"
          style={{ fontSize: 13, padding: "10px 16px" }}
          onClick={() => setModal({ metodo: null })}
        >
          ＋ Nuevo método
        </button>
      </div>

      {msg && (
        <div
          className="admin-table-wrap"
          style={{ padding: "12px 20px", marginBottom: 16, color: msg.startsWith("✓") ? "#4CAF50" : "var(--red-lt)" }}
        >
          {msg}
        </div>
      )}

      {/* Explicación de la verificación (el dueño no sabe qué es "CAJON") */}
      <div className="admin-table-wrap" style={{ padding: "14px 20px", marginBottom: 16, fontSize: 13 }}>
        <b style={{ color: "var(--cream)" }}>¿Qué es la verificación?</b> Define cómo se cuadra el método al cerrar la caja:
        <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
          <span>
            <span className="status-pill pill-gold">Cajón</span> El dinero entra al <b>cajón físico</b> y se cuenta en el arqueo (efectivo).
          </span>
          <span>
            <span className="status-pill pill-gray">Comprobante</span> Es <b>digital</b> (Nequi, tarjeta, transferencia…): no está en el cajón, se verifica con su comprobante.
          </span>
        </div>
      </div>

      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <span className="admin-table-title">Catálogo de métodos</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Código</th>
              <th>Verificación</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {metodos.map((m) => {
              const v = verifInfo(m.verificacion);
              return (
                <tr key={m.id} style={{ opacity: m.activo ? 1 : 0.5 }}>
                  <td style={{ color: "var(--cream)", fontFamily: "var(--font-d)" }}>{m.nombre}</td>
                  <td>
                    <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--muted)" }}>{m.codigo}</span>
                  </td>
                  <td>
                    <span className={`status-pill ${v.cls}`}>{v.corto}</span>
                    <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>{v.label}</span>
                  </td>
                  <td>
                    <span className={`status-pill ${m.activo ? "pill-green" : "pill-gray"}`}>
                      {m.activo ? "Activo" : "Archivado"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button
                        className="btn-outline"
                        style={{ fontSize: 12, padding: "6px 12px" }}
                        onClick={() => setModal({ metodo: m })}
                      >
                        Editar
                      </button>
                      <button
                        className={m.activo ? "btn-outline" : "btn-gold"}
                        style={{ fontSize: 12, padding: "6px 12px" }}
                        disabled={procesando}
                        onClick={() => toggle(m)}
                      >
                        {m.activo ? "Archivar" : "Reactivar"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {cargando && (
              <tr>
                <td colSpan={5} className="muted" style={{ textAlign: "center" }}>Cargando…</td>
              </tr>
            )}
            {!cargando && metodos.length === 0 && (
              <tr>
                <td colSpan={5} className="muted" style={{ textAlign: "center" }}>Aún no hay métodos.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <MetodoCobroModal
          metodo={modal.metodo}
          onClose={() => setModal(null)}
          onSaved={() => {
            cargar();
            aviso(modal.metodo ? "✓ Método actualizado." : "✓ Método creado.");
          }}
          onErr={onErr}
        />
      )}
    </>
  );
}
