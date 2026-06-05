"use client";

import { useEffect, useState } from "react";
import {
  Cancha,
  Slot,
  getCanchas,
  getDisponibilidad,
  crearReserva,
  formatoCOP,
} from "../lib/api";

const DIAS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function proximosDias(n: number) {
  const out: { iso: string; dia: string; num: number; mes: string }[] = [];
  const hoy = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    out.push({
      iso: d.toISOString().slice(0, 10),
      dia: DIAS[d.getDay()],
      num: d.getDate(),
      mes: MESES[d.getMonth()],
    });
  }
  return out;
}

export default function Home() {
  const [paso, setPaso] = useState(1);
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [cancha, setCancha] = useState<Cancha | null>(null);
  const dias = proximosDias(14);
  const [fecha, setFecha] = useState(dias[0].iso);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [cargando, setCargando] = useState(false);

  // Sport bar
  const [mesa, setMesa] = useState(false);
  const [personas, setPersonas] = useState(4);
  // Pago
  const [abono, setAbono] = useState(true);
  // Resultado
  const [reserva, setReserva] = useState<any>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    getCanchas().then((cs) => {
      setCanchas(cs);
      if (cs[0]) setCancha(cs[0]);
    });
  }, []);

  useEffect(() => {
    if (!cancha) return;
    setCargando(true);
    setSlot(null);
    getDisponibilidad(cancha.id, fecha)
      .then(setSlots)
      .finally(() => setCargando(false));
  }, [cancha, fecha]);

  const precioMesa = mesa ? 0 : 0; // la mesa no tiene costo, es reserva de cupo
  const total = slot?.precio ?? 0;
  const aPagar = abono ? Math.round(total / 2) : total;
  const saldo = total - aPagar;

  async function confirmar() {
    if (!cancha || !slot || !nombre || !telefono) return;
    setEnviando(true);
    try {
      const r = await crearReserva({
        canchaId: cancha.id,
        fecha,
        horaInicio: slot.horaInicio,
        horaFin: slot.horaFin,
        nombre,
        telefono,
        pagarAbono: abono,
        reservarMesa: mesa,
        personasMesa: personas,
      });
      setReserva(r);
      setPaso(5);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  const diaSel = dias.find((d) => d.iso === fecha);

  return (
    <main className="phone-wrap">
      {/* Stepper */}
      {paso < 5 && (
        <>
          <div className="eyebrow">Reserva tu cancha</div>
          <div className="h1">
            {paso === 1 && "Elige la cancha"}
            {paso === 2 && "¿Qué día juegas?"}
            {paso === 3 && "Elige tu horario"}
            {paso === 4 && "Antes del pitazo final"}
          </div>
          <div className="steps">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className={`step ${paso >= s ? "on" : ""}`} />
            ))}
          </div>
        </>
      )}

      {/* PASO 1 — Cancha */}
      {paso === 1 && (
        <>
          {canchas.map((c) => (
            <div
              key={c.id}
              className={`cancha-card ${cancha?.id === c.id ? "sel" : ""}`}
              onClick={() => setCancha(c)}
            >
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <span className="field-emoji">🥅</span>
                <div style={{ flex: 1 }}>
                  <div className="h2">{c.nombre}</div>
                  <div className="tipo">{c.tipo} · Césped sintético · Iluminada</div>
                </div>
                {cancha?.id === c.id && <span className="pill green">✓ Elegida</span>}
              </div>
            </div>
          ))}
          <div className="sticky-cta">
            <button className="btn" disabled={!cancha} onClick={() => setPaso(2)}>
              Continuar →
            </button>
          </div>
        </>
      )}

      {/* PASO 2 — Fecha */}
      {paso === 2 && (
        <>
          <div className="fechas">
            {dias.map((d) => (
              <div
                key={d.iso}
                className={`fecha-chip ${fecha === d.iso ? "sel" : ""}`}
                onClick={() => setFecha(d.iso)}
              >
                <div className="dia">{d.dia}</div>
                <div className="num">{d.num}</div>
                <div className="dia">{d.mes}</div>
              </div>
            ))}
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <div className="sub">Cancha seleccionada</div>
            <div className="h2" style={{ marginTop: 4 }}>
              {cancha?.nombre}
            </div>
          </div>
          <div className="sticky-cta" style={{ display: "flex", gap: 10 }}>
            <button className="btn ghost" style={{ width: "40%" }} onClick={() => setPaso(1)}>
              ← Atrás
            </button>
            <button className="btn" onClick={() => setPaso(3)}>
              Ver horarios →
            </button>
          </div>
        </>
      )}

      {/* PASO 3 — Horario */}
      {paso === 3 && (
        <>
          <div className="sub" style={{ marginBottom: 12 }}>
            {cancha?.nombre} · {diaSel?.dia} {diaSel?.num} {diaSel?.mes}
            <span style={{ marginLeft: 10 }}>
              <span className="pill amber" style={{ marginRight: 6 }}>● Pico</span>
              <span className="pill green">● Valle</span>
            </span>
          </div>
          {cargando ? (
            <div className="sub">Cargando disponibilidad…</div>
          ) : (
            <div className="grid-slots">
              {slots.map((s) => (
                <button
                  key={s.horaInicio}
                  className={`slot ${!s.disponible ? "off" : ""} ${
                    slot?.horaInicio === s.horaInicio ? "sel" : ""
                  }`}
                  disabled={!s.disponible}
                  onClick={() => setSlot(s)}
                >
                  <span className={`dot ${s.tipo === "PICO" ? "pico" : "valle"}`} />
                  <div className="hr">{s.horaInicio}</div>
                  <div className="pr">
                    {s.disponible ? formatoCOP(s.precio || 0) : s.motivo}
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="sticky-cta" style={{ display: "flex", gap: 10 }}>
            <button className="btn ghost" style={{ width: "40%" }} onClick={() => setPaso(2)}>
              ← Atrás
            </button>
            <button className="btn" disabled={!slot} onClick={() => setPaso(4)}>
              {slot ? `Continuar · ${formatoCOP(slot.precio || 0)}` : "Elige una hora"}
            </button>
          </div>
        </>
      )}

      {/* PASO 4 — Sport bar + pago + datos */}
      {paso === 4 && slot && (
        <>
          {/* Sport bar cross-sell */}
          <div className="card" style={{ marginBottom: 12, background: "linear-gradient(180deg, rgba(245,158,11,.08), var(--card))" }}>
            <div className="toggle-row">
              <div>
                <div className="h2">🍻 ¿Mesa en el Sport Bar?</div>
                <div className="sub">Asegura tu mesa para el post-partido. Sin costo extra.</div>
              </div>
              <div className={`toggle ${mesa ? "on" : ""}`} onClick={() => setMesa(!mesa)}>
                <div className="knob" />
              </div>
            </div>
            {mesa && (
              <div className="toggle-row" style={{ marginTop: 14 }}>
                <div className="sub">¿Cuántas personas?</div>
                <div className="stepper">
                  <button onClick={() => setPersonas(Math.max(1, personas - 1))}>−</button>
                  <span className="val">{personas}</span>
                  <button onClick={() => setPersonas(personas + 1)}>+</button>
                </div>
              </div>
            )}
          </div>

          {/* Modalidad de pago */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="h2" style={{ marginBottom: 10 }}>💳 ¿Cómo quieres pagar?</div>
            <div style={{ display: "flex", gap: 10 }}>
              <div
                className={`cancha-card ${abono ? "sel" : ""}`}
                style={{ flex: 1, margin: 0, padding: 12, textAlign: "center" }}
                onClick={() => setAbono(true)}
              >
                <div style={{ fontWeight: 800 }}>Abono 50%</div>
                <div className="sub">{formatoCOP(Math.round(total / 2))} ahora</div>
              </div>
              <div
                className={`cancha-card ${!abono ? "sel" : ""}`}
                style={{ flex: 1, margin: 0, padding: 12, textAlign: "center" }}
                onClick={() => setAbono(false)}
              >
                <div style={{ fontWeight: 800 }}>Pago total</div>
                <div className="sub">{formatoCOP(total)} ahora</div>
              </div>
            </div>
          </div>

          {/* Datos del cliente */}
          <div className="card" style={{ marginBottom: 12 }}>
            <input
              className="campo"
              placeholder="Tu nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              style={inputStyle}
            />
            <input
              className="campo"
              placeholder="WhatsApp (ej. +57 300 123 4567)"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              style={{ ...inputStyle, marginBottom: 0 }}
            />
          </div>

          {/* Resumen */}
          <div className="card">
            <div className="line">
              <span className="muted">{cancha?.nombre}</span>
              <span>{slot.horaInicio}–{slot.horaFin}</span>
            </div>
            <div className="line">
              <span className="muted">{diaSel?.dia} {diaSel?.num} {diaSel?.mes} · {slot.tipo === "PICO" ? "Hora pico" : "Hora valle"}</span>
              <span>{formatoCOP(total)}</span>
            </div>
            {mesa && (
              <div className="line">
                <span className="muted">🍻 Mesa Sport Bar ({personas} pers.)</span>
                <span className="pill amber">Incluida</span>
              </div>
            )}
            <div className="line">
              <span className="muted">Pagas ahora ({abono ? "abono" : "total"})</span>
              <span style={{ color: "var(--green)", fontWeight: 800 }}>{formatoCOP(aPagar)}</span>
            </div>
            {saldo > 0 && (
              <div className="line">
                <span className="muted">Saldo en caja del bar</span>
                <span>{formatoCOP(saldo)}</span>
              </div>
            )}
          </div>

          <div className="sticky-cta" style={{ display: "flex", gap: 10 }}>
            <button className="btn ghost" style={{ width: "35%" }} onClick={() => setPaso(3)}>
              ← Atrás
            </button>
            <button className="btn" disabled={!nombre || !telefono || enviando} onClick={confirmar}>
              {enviando ? "Procesando…" : `Pagar ${formatoCOP(aPagar)} 🔒`}
            </button>
          </div>
          <div className="sub" style={{ textAlign: "center", marginTop: 10 }}>
            Pago seguro con <b>Wompi</b> · Tarjeta · PSE · Nequi
          </div>
        </>
      )}

      {/* PASO 5 — Confirmación + WhatsApp */}
      {paso === 5 && reserva && (
        <>
          <div className="success-ring">
            <div className="check">✓</div>
          </div>
          <div className="h1" style={{ textAlign: "center" }}>¡Reserva confirmada!</div>
          <div className="sub" style={{ textAlign: "center", marginBottom: 18 }}>
            Tu cancha está apartada. Te esperamos, {nombre.split(" ")[0]} ⚽
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="line"><span className="muted">Cancha</span><span>{cancha?.nombre}</span></div>
            <div className="line"><span className="muted">Día y hora</span><span>{diaSel?.dia} {diaSel?.num} {diaSel?.mes} · {slot?.horaInicio}</span></div>
            <div className="line"><span className="muted">Pagado</span><span style={{ color: "var(--green)" }}>{formatoCOP(reserva.montoAPagar)}</span></div>
            {reserva.saldoEnCaja > 0 && (
              <div className="line"><span className="muted">Saldo en caja</span><span>{formatoCOP(reserva.saldoEnCaja)}</span></div>
            )}
            {mesa && <div className="line"><span className="muted">🍻 Mesa Sport Bar</span><span className="pill amber">Reservada</span></div>}
            <div className="line total"><span>Código</span><span style={{ fontFamily: "monospace", color: "var(--green)" }}>#{reserva.reservaId.slice(-6).toUpperCase()}</span></div>
          </div>

          {/* Simulación WhatsApp */}
          <div className="sub" style={{ marginBottom: 8 }}>📲 Esto le llega automáticamente al cliente:</div>
          <div className="wa-phone" style={{ marginBottom: 16 }}>
            <div className="wa-head">
              <div className="av">⚽</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>PAL COTEJO Sport Bar</div>
                <div style={{ fontSize: 11, color: "#9fe0c0" }}>en línea</div>
              </div>
            </div>
            <div className="wa-body">
              <div className="wa-msg">
                ¡Hola {nombre.split(" ")[0]}! 🎉 Tu reserva quedó <b>confirmada</b>.<br /><br />
                🥅 <b>{cancha?.nombre}</b><br />
                📅 {diaSel?.dia} {diaSel?.num} {diaSel?.mes} · {slot?.horaInicio}–{slot?.horaFin}<br />
                {mesa ? `🍻 Mesa reservada para ${personas}\n` : ""}
                💵 Abono pagado: {formatoCOP(reserva.montoAPagar)}<br />
                {reserva.saldoEnCaja > 0 ? `Saldo en caja: ${formatoCOP(reserva.saldoEnCaja)}` : "Pago completo ✅"}
                <span className="time">9:41 ✓✓</span>
              </div>
              <div className="wa-msg">
                ⏰ Te recordaremos 3 horas antes del partido. ¡Nos vemos en la cancha! 🔥
                <span className="time">9:41 ✓✓</span>
              </div>
            </div>
          </div>

          <button className="btn" onClick={() => { setPaso(1); setReserva(null); setSlot(null); setMesa(false); setNombre(""); setTelefono(""); }}>
            Hacer otra reserva
          </button>
        </>
      )}
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 13,
  borderRadius: 12,
  border: "1px solid var(--border-2)",
  background: "var(--bg-2)",
  color: "var(--text)",
  fontSize: 15,
  marginBottom: 10,
  outline: "none",
};
