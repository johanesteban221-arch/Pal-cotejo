"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatoCOP } from "../../../lib/api";

interface ReservaConf {
  reservaId: string;
  cancha: string;
  fechaTexto: string;
  horaInicio: string;
  horaFin: string;
  montoAPagar: number;
  saldoEnCaja: number;
  nombre: string;
  mesa: boolean;
  personas: number;
}

export default function Confirmacion() {
  const [r, setR] = useState<ReservaConf | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("pal_cotejo_reserva");
    if (raw) setR(JSON.parse(raw));
  }, []);

  if (!r) {
    return (
      <div className="page pt-nav">
        <div className="container" style={{ padding: "80px 24px", textAlign: "center" }}>
          <p className="muted" style={{ marginBottom: 16 }}>
            No encontramos una reserva reciente.
          </p>
          <Link className="btn-gold" href="/reservar">
            Hacer una reserva
          </Link>
        </div>
      </div>
    );
  }

  const codigo = `#PC-${r.reservaId.slice(-6).toUpperCase()}`;

  return (
    <div className="page pt-nav">
      <div className="container" style={{ padding: "60px 24px" }}>
        <div className="confirm-card">
          <div className="confirm-icon">✅</div>
          <div className="confirm-title">¡Reserva confirmada!</div>
          <div className="confirm-sub">
            Te enviaremos la confirmación por WhatsApp. Recuerda el recordatorio 3 horas antes.
          </div>
          <div className="confirm-details">
            <div className="confirm-row">
              <span className="confirm-key">Cancha</span>
              <span className="confirm-value">{r.cancha}</span>
            </div>
            <div className="confirm-row">
              <span className="confirm-key">Fecha</span>
              <span className="confirm-value">{r.fechaTexto}</span>
            </div>
            <div className="confirm-row">
              <span className="confirm-key">Hora</span>
              <span className="confirm-value">
                {r.horaInicio} – {r.horaFin}
              </span>
            </div>
            <div className="confirm-row">
              <span className="confirm-key">Código</span>
              <span className="confirm-value" style={{ color: "var(--gold)" }}>
                {codigo}
              </span>
            </div>
            {r.mesa && (
              <div className="confirm-row">
                <span className="confirm-key">Mesa sport bar</span>
                <span className="confirm-value" style={{ color: "var(--gold)" }}>
                  {r.personas} personas
                </span>
              </div>
            )}
            <div className="confirm-row">
              <span className="confirm-key">Abono pagado</span>
              <span className="confirm-value" style={{ color: "#4CAF50" }}>
                {formatoCOP(r.montoAPagar)}
              </span>
            </div>
            {r.saldoEnCaja > 0 && (
              <div className="confirm-row">
                <span className="confirm-key">Saldo en caja</span>
                <span className="confirm-value">{formatoCOP(r.saldoEnCaja)}</span>
              </div>
            )}
          </div>
          <a className="whatsapp-btn" href="#">
            💬 Abrir confirmación en WhatsApp
          </a>
          <Link className="btn-outline" style={{ width: "100%", marginTop: 10, fontSize: 14, display: "inline-block", textAlign: "center" }} href="/">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
