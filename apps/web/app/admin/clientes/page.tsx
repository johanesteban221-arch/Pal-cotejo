"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClienteRow,
  ResumenSegmentos,
  Segmento,
  getClientes,
  getClientesResumen,
  descargarClientesCsv,
  recalcularSegmentos,
  lanzarCampana,
  formatoCOP,
} from "../../../lib/api";
import { NoAutorizado, logout } from "../../../lib/auth";
import ClienteModal from "./ClienteModal";

const SEGMENTOS: { key: Segmento | ""; label: string }[] = [
  { key: "", label: "Todos" },
  { key: "NUEVO", label: "Nuevo" },
  { key: "REGULAR", label: "Regular" },
  { key: "FRECUENTE", label: "Frecuente" },
  { key: "VIP", label: "VIP" },
  { key: "DORMIDO", label: "Dormido" },
  { key: "RECURRENTE", label: "Recurrente" },
];

function segPill(seg: Segmento): { cls: string; label: string } {
  switch (seg) {
    case "VIP": return { cls: "pill-gold", label: "VIP" };
    case "RECURRENTE": return { cls: "pill-gold", label: "Recurrente" };
    case "FRECUENTE": return { cls: "pill-green", label: "Frecuente" };
    case "DORMIDO": return { cls: "pill-red", label: "Dormido" };
    case "REGULAR": return { cls: "pill-gray", label: "Regular" };
    default: return { cls: "pill-gray", label: "Nuevo" };
  }
}

export default function ClientesAdmin() {
  const router = useRouter();
  const [resumen, setResumen] = useState<ResumenSegmentos | null>(null);
  const [filtro, setFiltro] = useState<Segmento | "">("");
  const [buscar, setBuscar] = useState("");
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  // Campaña
  const [campSeg, setCampSeg] = useState<Segmento | "">("DORMIDO");
  const [campMsg, setCampMsg] = useState("");

  const onErr = (e: unknown) => {
    if (e instanceof NoAutorizado) {
      logout();
      router.replace("/admin/login");
    } else setMsg("⚠️ " + (e as Error).message);
  };

  function cargar() {
    getClientes(filtro || undefined, buscar || undefined).then((p) => setClientes(p.items)).catch(onErr);
    getClientesResumen().then(setResumen).catch(onErr);
  }
  useEffect(() => {
    cargar(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  function aviso(t: string) {
    setMsg(t);
    setTimeout(() => setMsg(""), 4000);
  }

  return (
    <>
      <div className="admin-header">
        <div className="admin-title">Clientes (CRM)</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-outline" style={{ fontSize: 13, padding: "10px 16px" }}
            onClick={() => recalcularSegmentos().then((r) => { aviso(`✓ ${r.actualizados} segmentos actualizados`); cargar(); }).catch(onErr)}>
            ↻ Recalcular segmentos
          </button>
          <button className="btn-gold" style={{ fontSize: 13, padding: "10px 16px" }}
            onClick={() => descargarClientesCsv(filtro || undefined).catch(onErr)}>
            ⤓ Exportar CSV{filtro ? ` (${filtro})` : ""}
          </button>
        </div>
      </div>

      {msg && (
        <div className="admin-table-wrap" style={{ padding: "12px 20px", marginBottom: 16, color: msg.startsWith("✓") ? "#4CAF50" : "var(--red-lt)" }}>{msg}</div>
      )}

      {/* Filtros por segmento (pills con conteo) */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {SEGMENTOS.map((s) => {
          const n = s.key === "" ? resumen?.total : resumen?.porSegmento?.[s.key as Segmento];
          const activo = filtro === s.key;
          return (
            <button key={s.key} onClick={() => setFiltro(s.key)}
              className="status-pill"
              style={{
                cursor: "pointer", fontSize: 13, padding: "6px 14px",
                border: `1px solid ${activo ? "var(--gold)" : "var(--border)"}`,
                background: activo ? "rgba(212,160,23,.14)" : "transparent",
                color: activo ? "var(--gold)" : "var(--muted)",
              }}>
              {s.label} {n != null ? `· ${n}` : ""}
            </button>
          );
        })}
      </div>

      {/* Tabla */}
      <div className="admin-table-wrap" style={{ marginBottom: 24 }}>
        <div className="admin-table-header">
          <span className="admin-table-title">{filtro ? segPill(filtro as Segmento).label : "Todos los"} clientes</span>
          <input className="form-input" placeholder="Buscar nombre o teléfono…" value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && cargar()}
            style={{ width: 260 }} />
        </div>
        <table>
          <thead>
            <tr><th>Nombre</th><th>WhatsApp</th><th>Segmento</th><th>Reservas</th><th>Total gastado</th><th>Última visita</th></tr>
          </thead>
          <tbody>
            {clientes.map((c) => {
              const p = segPill(c.segmento);
              return (
                <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => setSel(c.id)}>
                  <td style={{ color: "var(--cream)", fontFamily: "var(--font-d)" }}>{c.nombre}</td>
                  <td>{c.telefono}</td>
                  <td><span className={`status-pill ${p.cls}`}>{p.label}</span></td>
                  <td>{c.totalReservas}</td>
                  <td style={{ color: "var(--gold)" }}>{formatoCOP(c.totalGastado)}</td>
                  <td>{c.ultimaVisita ?? "—"}</td>
                </tr>
              );
            })}
            {clientes.length === 0 && (
              <tr><td colSpan={6} className="muted" style={{ textAlign: "center" }}>Sin clientes en este filtro.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Campaña WhatsApp */}
      <div className="admin-table-wrap">
        <div className="admin-table-header"><span className="admin-table-title">📣 Campaña por WhatsApp (n8n)</span></div>
        <div style={{ padding: 20, display: "grid", gridTemplateColumns: "200px 1fr auto", gap: 16, alignItems: "end" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Segmento destino</label>
            <select className="form-select" value={campSeg} onChange={(e) => setCampSeg(e.target.value as Segmento)}>
              {SEGMENTOS.filter((s) => s.key).map((s) => (
                <option key={s.key} value={s.key}>{s.label} ({resumen?.porSegmento?.[s.key as Segmento] ?? 0})</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Mensaje</label>
            <input className="form-input" placeholder="Ej: ¡Te extrañamos! 20% en tu próxima reserva 🎁" value={campMsg} onChange={(e) => setCampMsg(e.target.value)} />
          </div>
          <button className="btn-gold" disabled={!campMsg}
            onClick={() => lanzarCampana(campSeg, campMsg).then((r) => aviso(r.ok ? `✓ Campaña enviada a ${r.destinatarios} clientes` : `⚠️ ${r.motivo} (${r.destinatarios} destinatarios)`)).catch(onErr)}>
            Enviar campaña
          </button>
        </div>
        <div className="muted" style={{ fontSize: 12, padding: "0 20px 16px" }}>
          Dispara el flujo n8n que envía el mensaje personalizado a cada cliente del segmento.
        </div>
      </div>

      {sel && <ClienteModal id={sel} onClose={() => setSel(null)} onSaved={() => { cargar(); }} onErr={onErr} />}
    </>
  );
}
