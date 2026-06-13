"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Cancha,
  Slot,
  getCanchas,
  getDisponibilidad,
  crearReserva,
  formatoCOP,
} from "../../../lib/api";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS_LARGOS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function isoLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default function Reservar() {
  const router = useRouter();
  const [paso, setPaso] = useState(1);

  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [cancha, setCancha] = useState<Cancha | null>(null);

  const hoy = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [view, setView] = useState(() => ({ y: hoy.getFullYear(), m: hoy.getMonth() }));
  const [fecha, setFecha] = useState<string | null>(null);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [cargandoSlots, setCargandoSlots] = useState(false);

  const [abono, setAbono] = useState(true);
  const [mesa, setMesa] = useState(false);
  const [personas, setPersonas] = useState(4);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getCanchas().then((cs) => {
      setCanchas(cs);
      if (cs[0]) setCancha(cs[0]);
    });
  }, []);

  useEffect(() => {
    if (!cancha || !fecha) return;
    setCargandoSlots(true);
    setSlot(null);
    getDisponibilidad(cancha.id, fecha)
      .then(setSlots)
      .finally(() => setCargandoSlots(false));
  }, [cancha, fecha]);

  // ── Calendario del mes en vista ──
  const celdas = useMemo(() => {
    const primero = new Date(view.y, view.m, 1);
    const offset = (primero.getDay() + 6) % 7; // lunes primero
    const diasMes = new Date(view.y, view.m + 1, 0).getDate();
    const arr: ({ dia: number; iso: string; past: boolean; today: boolean } | null)[] = [];
    for (let i = 0; i < offset; i++) arr.push(null);
    for (let d = 1; d <= diasMes; d++) {
      const date = new Date(view.y, view.m, d);
      arr.push({
        dia: d,
        iso: isoLocal(date),
        past: date < hoy,
        today: date.getTime() === hoy.getTime(),
      });
    }
    return arr;
  }, [view, hoy]);

  const puedeRetroceder = view.y > hoy.getFullYear() || view.m > hoy.getMonth();
  function cambiarMes(delta: number) {
    setView((v) => {
      const nm = v.m + delta;
      return { y: v.y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 };
    });
  }

  const total = slot?.precio ?? 0;
  const aPagar = abono ? Math.round(total / 2) : total;
  const saldo = total - aPagar;
  const fechaTexto = fecha
    ? `${DIAS_LARGOS[new Date(fecha + "T00:00:00").getDay()]} ${new Date(fecha + "T00:00:00").getDate()} de ${MESES[new Date(fecha + "T00:00:00").getMonth()].toLowerCase()}`
    : "";

  async function confirmar() {
    if (!cancha || !slot || !fecha || !nombre || !telefono) return;
    setEnviando(true);
    setError("");
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
      sessionStorage.setItem(
        "pal_cotejo_reserva",
        JSON.stringify({
          ...r,
          cancha: cancha.nombre,
          fechaTexto,
          horaInicio: slot.horaInicio,
          horaFin: slot.horaFin,
          tipo: slot.tipo,
          nombre,
          telefono,
          mesa,
          personas,
        }),
      );
      router.push("/confirmacion");
    } catch (e) {
      setError((e as Error).message);
      setEnviando(false);
    }
  }

  const Steps = (
    <div className="steps-bar">
      {["Cancha", "Fecha", "Hora", "Pago"].map((label, i) => {
        const n = i + 1;
        const cls = paso === n ? "active" : paso > n ? "done" : "";
        return (
          <div key={label} className={`step ${cls}`} onClick={() => n < paso && setPaso(n)}>
            <div className="step-num">0{n}</div>
            <div className="step-label">{label}</div>
            <div className="step-indicator" />
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="page pt-nav">
      <div className="reserva-bg">
        <div className="container" style={{ padding: "60px 24px" }}>
          <div className="section-eyebrow">Reservas online</div>
          <h2 className="section-title">
            Elige tu <em>cancha y horario</em>
          </h2>
          <p className="section-sub">
            Confirmas en menos de 2 minutos. Pago en línea seguro o abono del 50%.
          </p>

          {Steps}

          {/* PASO 1 — Canchas */}
          {paso === 1 && (
            <div>
              <div className="canchas-grid">
                {canchas.map((c) => (
                  <div
                    key={c.id}
                    className={`cancha-card ${cancha?.id === c.id ? "selected" : ""}`}
                    onClick={() => setCancha(c)}
                  >
                    <div className="cancha-img">⚽</div>
                    <div className="cancha-info">
                      <div className="cancha-name">{c.nombre}</div>
                      <div className="cancha-tags">
                        <span className="tag">{c.tipo || "Fútbol"}</span>
                        <span className="tag">Pasto sintético</span>
                        <span className="tag gold">Iluminación LED</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 28 }}>
                <button className="btn-gold" disabled={!cancha} onClick={() => setPaso(2)}>
                  Siguiente → Elegir fecha
                </button>
              </div>
            </div>
          )}

          {/* PASO 2 — Calendario */}
          {paso === 2 && (
            <div>
              <div style={{ maxWidth: 380 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontFamily: "var(--font-d)", fontSize: 18, color: "var(--cream)" }}>
                    {MESES[view.m]} {view.y}
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => puedeRetroceder && cambiarMes(-1)}
                      disabled={!puedeRetroceder}
                      style={navBtn(!puedeRetroceder)}
                    >
                      ‹
                    </button>
                    <button onClick={() => cambiarMes(1)} style={navBtn(false)}>
                      ›
                    </button>
                  </div>
                </div>
                <div className="cal-grid">
                  {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => (
                    <div key={i} className="cal-head">
                      {d}
                    </div>
                  ))}
                  {celdas.map((c, i) =>
                    !c ? (
                      <div key={i} className="cal-day empty" />
                    ) : (
                      <div
                        key={i}
                        className={`cal-day ${c.past ? "past" : ""} ${c.today ? "today" : ""} ${
                          fecha === c.iso ? "selected" : ""
                        }`}
                        onClick={() => !c.past && setFecha(c.iso)}
                      >
                        {c.dia}
                      </div>
                    ),
                  )}
                </div>
              </div>
              <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
                <button className="btn-outline" onClick={() => setPaso(1)}>
                  Atrás
                </button>
                <button className="btn-gold" disabled={!fecha} onClick={() => setPaso(3)}>
                  Siguiente → Elegir hora
                </button>
              </div>
            </div>
          )}

          {/* PASO 3 — Horarios */}
          {paso === 3 && (
            <div>
              <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 4 }}>
                {fechaTexto} · {cancha?.nombre}
              </p>
              <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 12, flexWrap: "wrap" }}>
                <span style={{ color: "var(--gold)" }}>● Valle — precio normal</span>
                <span style={{ color: "var(--red-lt)" }}>● Pico — precio alto</span>
                <span style={{ color: "var(--muted)", opacity: 0.5 }}>● Ocupado</span>
              </div>
              {cargandoSlots ? (
                <p className="muted">Cargando disponibilidad…</p>
              ) : (
                <div className="horarios-grid">
                  {slots.map((s) => {
                    const ocupado = !s.disponible;
                    const sel = slot?.horaInicio === s.horaInicio;
                    return (
                      <div
                        key={s.horaInicio}
                        className={`hora-slot ${s.tipo === "PICO" ? "pico" : ""} ${
                          ocupado ? "ocupado" : ""
                        } ${sel ? "selected" : ""}`}
                        onClick={() => !ocupado && setSlot(s)}
                      >
                        <div className="hora-time">{s.horaInicio}</div>
                        <div className="hora-price">{formatoCOP(s.precio || 0)}</div>
                        {ocupado ? (
                          <div className="hora-badge">Ocupado</div>
                        ) : s.tipo === "PICO" ? (
                          <div className="hora-badge">Pico</div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
                <button className="btn-outline" onClick={() => setPaso(2)}>
                  Atrás
                </button>
                <button className="btn-gold" disabled={!slot} onClick={() => setPaso(4)}>
                  Siguiente → Pago
                </button>
              </div>
            </div>
          )}

          {/* PASO 4 — Pago */}
          {paso === 4 && slot && (
            <div>
              <div className="pago-card">
                <div className="pago-row">
                  <span className="pago-label">Cancha</span>
                  <span className="pago-val">{cancha?.nombre}</span>
                </div>
                <div className="pago-row">
                  <span className="pago-label">Fecha</span>
                  <span className="pago-val">{fechaTexto}</span>
                </div>
                <div className="pago-row">
                  <span className="pago-label">Hora</span>
                  <span className="pago-val">
                    {slot.horaInicio} – {slot.horaFin}
                  </span>
                </div>
                <div className="pago-row">
                  <span className="pago-label">Tarifa</span>
                  <span className="pago-val" style={{ color: slot.tipo === "PICO" ? "var(--red-lt)" : "var(--gold)" }}>
                    {slot.tipo === "PICO" ? "Hora pico" : "Hora valle"}
                  </span>
                </div>
                <div className="pago-row pago-total">
                  <span className="pago-label">Total</span>
                  <span className="pago-val">{formatoCOP(total)}</span>
                </div>

                <div className="abono-toggle">
                  <button className={`abono-btn ${abono ? "active" : ""}`} onClick={() => setAbono(true)}>
                    Abonar 50% — {formatoCOP(Math.round(total / 2))}
                  </button>
                  <button className={`abono-btn ${!abono ? "active" : ""}`} onClick={() => setAbono(false)}>
                    Pago total — {formatoCOP(total)}
                  </button>
                </div>
                <div style={{ marginTop: 4, color: "var(--muted)", fontSize: 12, marginBottom: 16 }}>
                  El saldo se cancela en caja antes del partido.
                </div>

                <div className="form-group">
                  <div className="form-label">Nombre completo</div>
                  <input className="form-input" placeholder="Tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </div>
                <div className="form-group">
                  <div className="form-label">WhatsApp</div>
                  <input className="form-input" type="tel" placeholder="+57 300 000 0000" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                </div>

                <div style={{ border: "1px solid var(--border-g)", borderRadius: 10, padding: 14, marginBottom: 16, background: "rgba(212,160,23,.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontFamily: "var(--font-d)", fontSize: 14, color: "var(--gold)" }}>
                      🍺 ¿Post-partido en el sport bar?
                    </div>
                    <input type="checkbox" checked={mesa} onChange={(e) => setMesa(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--gold)" }} />
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>
                    Asegura tu mesa ahora y no te quedes sin puesto.
                  </div>
                  {mesa && (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 13, color: "var(--muted)" }}>Personas:</span>
                      <button className="btn-outline" style={{ padding: "2px 12px", fontSize: 16 }} onClick={() => setPersonas(Math.max(1, personas - 1))}>−</button>
                      <span style={{ fontFamily: "var(--font-d)", fontSize: 16 }}>{personas}</span>
                      <button className="btn-outline" style={{ padding: "2px 12px", fontSize: 16 }} onClick={() => setPersonas(personas + 1)}>+</button>
                    </div>
                  )}
                </div>

                {error && <div className="err" style={{ marginBottom: 12, fontSize: 14 }}>⚠️ {error}</div>}

                <button
                  className="btn-gold"
                  style={{ width: "100%", fontSize: 17, padding: 15 }}
                  disabled={!nombre || !telefono || enviando}
                  onClick={confirmar}
                >
                  {enviando ? "Procesando…" : `Confirmar y pagar ${formatoCOP(aPagar)}`}
                </button>
                <div style={{ textAlign: "center", marginTop: 10, color: "var(--muted)", fontSize: 12 }}>
                  Pago seguro con Wompi · Tarjeta · PSE · Nequi
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <button className="btn-outline" onClick={() => setPaso(3)}>
                  Atrás
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function navBtn(disabled: boolean): React.CSSProperties {
  return {
    background: "transparent",
    border: "1px solid var(--border)",
    color: "var(--muted)",
    width: 32,
    height: 32,
    borderRadius: 6,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.4 : 1,
  };
}
