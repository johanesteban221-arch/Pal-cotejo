"use client";

import { useEffect, useState } from "react";
import { ReservaAdmin, MetodoCobro, getMetodosCobroPos, cobrarReserva, formatoCOP } from "../../../lib/api";
import { NoAutorizado } from "../../../lib/auth";

export default function CobrarReservaModal({
  reserva,
  onClose,
  onCobrado,
  onErr,
}: {
  reserva: ReservaAdmin;
  onClose: () => void;
  onCobrado: () => void; // refresca la lista
  onErr: (e: unknown) => void;
}) {
  const [metodos, setMetodos] = useState<MetodoCobro[]>([]);
  const [metodo, setMetodo] = useState("");
  const [monto, setMonto] = useState(String(reserva.saldo));
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [recibo, setRecibo] = useState<null | { cobro: number; metodo: string; saldo: number; estado: string }>(null);

  useEffect(() => {
    getMetodosCobroPos()
      .then((m) => {
        setMetodos(m);
        if (m[0]) setMetodo(m[0].codigo);
      })
      .catch(onErr); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function confirmar() {
    setError("");
    if (!metodo) {
      setError("Elige un método de pago.");
      return;
    }
    const n = Number(monto);
    if (!Number.isInteger(n) || n <= 0) {
      setError("El monto debe ser un entero mayor a 0.");
      return;
    }
    if (n > reserva.saldo) {
      setError(`El monto supera el saldo (${formatoCOP(reserva.saldo)}).`);
      return;
    }
    setEnviando(true);
    cobrarReserva(reserva.id, metodo, n)
      .then((r) => setRecibo({ cobro: r.cobro, metodo: r.metodo, saldo: r.saldo, estado: r.estado }))
      .catch((e) => {
        // 409 sin caja → el backend manda "Abre la caja antes de cobrar"; se muestra tal cual.
        if (e instanceof NoAutorizado) onErr(e);
        else setError((e as Error).message);
      })
      .finally(() => setEnviando(false));
  }

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modal}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="admin-title" style={{ fontSize: 22 }}>{recibo ? "Cobro registrado" : "Cobrar reserva"}</div>
          <button className="btn-outline" style={{ padding: "6px 12px", fontSize: 13 }} onClick={onClose}>Cerrar ✕</button>
        </div>

        <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
          {reserva.cliente?.nombre} · {reserva.cancha?.nombre} · {reserva.horaInicio}–{reserva.horaFin}
        </div>

        {recibo ? (
          <>
            <div style={bannerOk}>✓ Cobrado {formatoCOP(recibo.cobro)} ({recibo.metodo})</div>
            <div style={{ display: "grid", gap: 6, fontSize: 14, marginBottom: 16 }}>
              <Fila k="Saldo restante" v={recibo.saldo > 0 ? formatoCOP(recibo.saldo) : "Saldada ✓"} />
              <Fila k="Estado de la reserva" v={recibo.estado} />
            </div>
            <button className="btn-gold" style={{ width: "100%" }} onClick={() => { onCobrado(); onClose(); }}>Listo</button>
          </>
        ) : (
          <>
            {error && <div style={bannerErr}>⚠️ {error}</div>}
            <div style={saldoBox}>Saldo pendiente <b style={{ color: "var(--gold)" }}>{formatoCOP(reserva.saldo)}</b></div>
            <div className="form-group" style={{ margin: 0, marginBottom: 14 }}>
              <label className="form-label">Método de pago</label>
              <select className="form-select" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                {metodos.length === 0 && <option value="">Sin métodos activos</option>}
                {metodos.map((m) => (
                  <option key={m.id} value={m.codigo}>{m.nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, marginBottom: 16 }}>
              <label className="form-label">Monto a cobrar</label>
              <input className="form-input" type="number" min={1} max={reserva.saldo} step={1} value={monto} onChange={(e) => setMonto(e.target.value)} />
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Por defecto el saldo completo. Edítalo para un abono parcial.</div>
            </div>
            <button className="btn-gold" style={{ width: "100%" }} disabled={enviando || metodos.length === 0} onClick={confirmar}>
              {enviando ? "Cobrando…" : `Cobrar ${formatoCOP(Number(monto) || 0)}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Fila({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span className="muted">{k}</span>
      <span style={{ color: "var(--cream)" }}>{v}</span>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", backdropFilter: "blur(3px)",
  display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 24, zIndex: 200, overflowY: "auto",
};
const modal: React.CSSProperties = {
  width: "100%", maxWidth: 440, background: "var(--bg2)", border: "1px solid var(--border-g)",
  borderRadius: 14, padding: 24, margin: "auto",
};
const bannerErr: React.CSSProperties = {
  marginBottom: 14, padding: "10px 14px", borderRadius: 8, background: "rgba(200,60,60,.12)", color: "var(--red-lt)", fontSize: 14,
};
const bannerOk: React.CSSProperties = {
  marginBottom: 14, padding: "12px 14px", borderRadius: 8, background: "rgba(76,175,80,.14)", color: "#4CAF50", fontSize: 15, fontFamily: "var(--font-d)",
};
const saldoBox: React.CSSProperties = {
  marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "var(--bg)", fontSize: 14, color: "var(--muted)",
};
