"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AgendaDia, getAgendaDia, formatoCOP } from "../../../lib/api";
import { NoAutorizado, logout } from "../../../lib/auth";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const toMin = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};
const pad = (n: number) => String(n).padStart(2, "0");

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
// Aritmética de fechas TZ-safe (en UTC) para no desplazar el día.
function addDias(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
function etiqueta(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${DIAS[dt.getUTCDay()]} ${d} ${MESES[m - 1]}`;
}

const ROW_H = 56; // px por hora
const HEADER_H = 54;

const COLOR: Record<string, { bg: string; bd: string }> = {
  CONFIRMADA: { bg: "rgba(76,175,80,.20)", bd: "#4CAF50" },
  COMPLETADA: { bg: "rgba(76,175,80,.12)", bd: "#4CAF50" },
  PENDIENTE: { bg: "rgba(212,160,23,.20)", bd: "var(--gold)" },
  NO_SHOW: { bg: "rgba(200,60,60,.16)", bd: "var(--red-lt)" },
};

export default function AgendaAdmin() {
  const router = useRouter();
  const [fecha, setFecha] = useState(hoyISO());
  const [data, setData] = useState<AgendaDia | null>(null);
  const [cargando, setCargando] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const onErr = (e: unknown) => {
      if (e instanceof NoAutorizado) {
        logout();
        router.replace("/admin/login");
      } else setMsg("⚠️ " + (e as Error).message);
    };
    setCargando(true);
    setMsg("");
    getAgendaDia(fecha).then(setData).catch(onErr).finally(() => setCargando(false));
  }, [fecha, router]);

  const recursos = data?.recursos ?? [];
  const apertura = data?.horaApertura ? toMin(data.horaApertura) : null;
  const cierre = data?.horaCierre ? toMin(data.horaCierre) : null;
  const startMin = apertura != null ? Math.floor(apertura / 60) * 60 : null;
  const endMin = cierre != null ? Math.ceil(cierre / 60) * 60 : null;
  const horas: number[] = [];
  if (startMin != null && endMin != null) for (let m = startMin; m < endMin; m += 60) horas.push(m);
  const bodyH = startMin != null && endMin != null ? ((endMin - startMin) / 60) * ROW_H : 0;

  const reservasDe = (id: string) => (data?.reservas ?? []).filter((r) => r.canchaId === id);
  const bloqueosDe = (id: string) => (data?.bloqueos ?? []).filter((b) => b.canchaId === id);
  const topDe = (hhmm: string) => ((toMin(hhmm) - (startMin ?? 0)) / 60) * ROW_H;
  const altoDe = (ini: string, fin: string, min: number) => Math.max(((toMin(fin) - toMin(ini)) / 60) * ROW_H, min);

  return (
    <>
      <div className="admin-header">
        <div className="admin-title">Agenda</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn-outline" style={btnNav} onClick={() => setFecha(addDias(fecha, -1))}>‹</button>
          <div style={{ minWidth: 120, textAlign: "center", color: "var(--cream)", fontFamily: "var(--font-d)" }}>{etiqueta(fecha)}</div>
          <button className="btn-outline" style={btnNav} onClick={() => setFecha(addDias(fecha, 1))}>›</button>
          <button className="btn-outline" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => setFecha(hoyISO())}>Hoy</button>
          <input className="form-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={{ width: "auto" }} />
        </div>
      </div>

      {msg && <div className="admin-table-wrap" style={{ padding: "12px 20px", marginBottom: 16, color: "var(--red-lt)" }}>{msg}</div>}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12, fontSize: 12, color: "var(--muted)" }}>
        <Leyenda c="#4CAF50" t="Confirmada / Completada" />
        <Leyenda c="var(--gold)" t="Pendiente" />
        <Leyenda c="var(--red-lt)" t="No show" />
        <Leyenda c="#8a8a8a" t="Bloqueo" />
      </div>

      <div className="admin-table-wrap" style={{ padding: 0, overflow: "hidden" }}>
        {cargando ? (
          <div className="muted" style={{ padding: 40, textAlign: "center" }}>Cargando agenda…</div>
        ) : recursos.length === 0 ? (
          <div className="muted" style={{ padding: 40, textAlign: "center" }}>Sin recursos activos.</div>
        ) : startMin == null ? (
          <div className="muted" style={{ padding: 40, textAlign: "center" }}>Sin horarios configurados para este día.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "flex", minWidth: 64 + recursos.length * 170 }}>
              {/* Columna de horas */}
              <div style={{ width: 64, flexShrink: 0, borderRight: "1px solid var(--border-g)" }}>
                <div style={{ height: HEADER_H, borderBottom: "1px solid var(--border-g)" }} />
                <div style={{ position: "relative", height: bodyH }}>
                  {horas.map((m) => (
                    <div key={m} style={{ position: "absolute", top: ((m - startMin) / 60) * ROW_H - 6, right: 6, fontSize: 11, color: "var(--muted)" }}>
                      {pad(Math.floor(m / 60))}:00
                    </div>
                  ))}
                </div>
              </div>
              {/* Columnas de recursos */}
              {recursos.map((rec) => (
                <div key={rec.id} style={{ flex: "1 0 170px", minWidth: 170, borderRight: "1px solid var(--border-g)" }}>
                  <div style={{ height: HEADER_H, borderBottom: "1px solid var(--border-g)", padding: "8px 10px", overflow: "hidden" }}>
                    <div style={{ color: "var(--cream)", fontFamily: "var(--font-d)", fontSize: 14, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{rec.nombre}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{rec.tipo || "Sin tipo"}</div>
                  </div>
                  <div style={{ position: "relative", height: bodyH }}>
                    {horas.map((m) => (
                      <div key={m} style={{ position: "absolute", top: ((m - startMin) / 60) * ROW_H, left: 0, right: 0, borderTop: "1px solid rgba(255,255,255,.05)" }} />
                    ))}
                    {bloqueosDe(rec.id).map((b) => (
                      <div key={b.id} title={b.nota ?? b.motivo}
                        style={{ position: "absolute", top: topDe(b.horaInicio), height: altoDe(b.horaInicio, b.horaFin, 16), left: 3, right: 3, borderRadius: 6, background: "repeating-linear-gradient(45deg, rgba(138,138,138,.20), rgba(138,138,138,.20) 6px, rgba(138,138,138,.07) 6px, rgba(138,138,138,.07) 12px)", border: "1px solid rgba(138,138,138,.4)", padding: "3px 6px", fontSize: 10, color: "var(--muted)", overflow: "hidden" }}>
                        🔒 {b.motivo}
                      </div>
                    ))}
                    {reservasDe(rec.id).map((r) => {
                      const c = COLOR[r.estado] ?? { bg: "rgba(150,150,150,.18)", bd: "#8a8a8a" };
                      return (
                        <div key={r.id} title={`${r.cliente} · ${r.horaInicio}–${r.horaFin} · ${formatoCOP(r.montoTotal)}`}
                          style={{ position: "absolute", top: topDe(r.horaInicio) + 1, height: altoDe(r.horaInicio, r.horaFin, 20) - 2, left: 3, right: 3, borderRadius: 6, background: c.bg, borderLeft: `3px solid ${c.bd}`, padding: "4px 8px", fontSize: 11, color: "var(--cream)", overflow: "hidden" }}>
                          <div style={{ fontWeight: 600, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{r.cliente}</div>
                          <div className="muted" style={{ fontSize: 10 }}>{r.horaInicio}–{r.horaFin}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Leyenda({ c, t }: { c: string; t: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: c, display: "inline-block" }} />
      {t}
    </span>
  );
}

const btnNav: React.CSSProperties = { fontSize: 16, padding: "6px 12px", lineHeight: 1 };
