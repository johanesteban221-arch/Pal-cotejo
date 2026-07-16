"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfigAlerta, ModoAlerta, getConfigAlertas, actualizarAlerta } from "../../../../lib/api";
import { NoAutorizado, logout } from "../../../../lib/auth";

// Solo las alertas de Fase 1 (las que YA disparan). STOCK_BAJO y VENTA_ANULADA
// se ocultan hasta que sus enganches existan (para no mostrar switches inertes).
const ALERTAS: { tipo: string; label: string; desc: string }[] = [
  { tipo: "CAJA_CERRADA", label: "Cierre de caja", desc: "Te avisa cuando se cierra la caja." },
  { tipo: "CONTEO_DIFERENCIAS", label: "Diferencias de inventario", desc: "Te avisa cuando un conteo tiene diferencias de stock." },
  { tipo: "RESERVA_NUEVA", label: "Reserva nueva", desc: "Te avisa cuando se registra una reserva en caja." },
];

const MODOS: [ModoAlerta, string][] = [
  ["SOLO_DESCUADRE", "Solo cuando hay descuadre"],
  ["SIEMPRE", "En cada cierre"],
];

export default function AlertasAdmin() {
  const router = useRouter();
  const [config, setConfig] = useState<Record<string, ConfigAlerta>>({});
  const [cargando, setCargando] = useState(true);
  const [msg, setMsg] = useState("");
  const [guardando, setGuardando] = useState<string | null>(null);

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
    setTimeout(() => setMsg(""), 3000);
  };

  function cargar() {
    setCargando(true);
    getConfigAlertas()
      .then((rows) => {
        const m: Record<string, ConfigAlerta> = {};
        rows.forEach((r) => {
          m[r.tipo] = r;
        });
        setConfig(m);
      })
      .catch(onErr)
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    cargar(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function guardar(tipo: string, data: { activo?: boolean; modo?: ModoAlerta }) {
    setGuardando(tipo);
    actualizarAlerta(tipo, data)
      .then((row) => {
        setConfig((c) => ({ ...c, [tipo]: row }));
        aviso("✓ Guardado.");
      })
      .catch(onErr)
      .finally(() => setGuardando(null));
  }

  return (
    <>
      <div className="admin-header">
        <div className="admin-title">Alertas al dueño</div>
      </div>

      {msg && (
        <div className="admin-table-wrap" style={{ padding: "12px 20px", marginBottom: 16, color: msg.startsWith("✓") ? "#4CAF50" : "var(--red-lt)" }}>
          {msg}
        </div>
      )}

      <div className="admin-table-wrap" style={{ padding: "14px 20px", marginBottom: 16, fontSize: 13 }}>
        🔔 Las alertas activas se envían al <b style={{ color: "var(--cream)" }}>canal configurado</b> (WhatsApp/Telegram, según lo que tenga el negocio). Activa solo las que quieras recibir.
      </div>

      {cargando ? (
        <div className="admin-table-wrap">
          <div className="muted" style={{ padding: 40, textAlign: "center" }}>Cargando…</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {ALERTAS.map((a) => {
            const cfg = config[a.tipo];
            if (!cfg) return null;
            const busy = guardando === a.tipo;
            return (
              <div key={a.tipo} className="admin-table-wrap" style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ color: "var(--cream)", fontFamily: "var(--font-d)", fontSize: 16 }}>{a.label}</div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{a.desc}</div>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <span className={`status-pill ${cfg.activo ? "pill-green" : "pill-gray"}`}>{cfg.activo ? "Activa" : "Inactiva"}</span>
                    <input
                      type="checkbox"
                      checked={cfg.activo}
                      disabled={busy}
                      onChange={(e) => guardar(a.tipo, { activo: e.target.checked })}
                      style={{ width: 20, height: 20, accentColor: "var(--gold)", cursor: "pointer" }}
                    />
                  </label>
                </div>

                {/* Modo: solo CAJA_CERRADA, y solo si está activa */}
                {a.tipo === "CAJA_CERRADA" && cfg.activo && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                    <div className="form-label" style={{ marginBottom: 8 }}>¿Cuándo avisar?</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {MODOS.map(([val, lbl]) => (
                        <button
                          key={val}
                          className={cfg.modo === val ? "btn-gold" : "btn-outline"}
                          style={{ fontSize: 13, padding: "8px 14px" }}
                          disabled={busy}
                          onClick={() => guardar(a.tipo, { modo: val })}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
