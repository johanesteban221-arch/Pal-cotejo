"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ValorInventario,
  Movimiento,
  getValorInventario,
  getMovimientos,
  formatoCOP,
  formatoCorto,
} from "../../../lib/api";
import { NoAutorizado, logout } from "../../../lib/auth";

const TIPO: Record<string, { cls: string; label: string }> = {
  ENTRADA: { cls: "pill-green", label: "Entrada" },
  SALIDA: { cls: "pill-red", label: "Venta" },
  AJUSTE: { cls: "pill-gray", label: "Ajuste" },
};

export default function Inventario() {
  const router = useRouter();
  const [val, setVal] = useState<ValorInventario | null>(null);
  const [movs, setMovs] = useState<Movimiento[]>([]);

  useEffect(() => {
    const onErr = (e: unknown) => {
      if (e instanceof NoAutorizado) {
        logout();
        router.replace("/admin/login");
      }
    };
    getValorInventario().then(setVal).catch(onErr);
    getMovimientos(150).then(setMovs).catch(onErr);
  }, [router]);

  function fmtFecha(iso: string) {
    return new Date(iso).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
  }

  return (
    <>
      <div className="admin-header">
        <div className="admin-title">Inventario — valor y movimientos</div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="kpi-label">Valor del inventario</div>
          <div className="kpi-val">{val ? formatoCorto(val.valorTotal) : "—"}</div>
          <div className="kpi-delta">a precio de venta</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Unidades en stock</div>
          <div className="kpi-val">{val?.unidadesTotales ?? "—"}</div>
          <div className="kpi-delta up">total productos base</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-label">Con stock bajo</div>
          <div className="kpi-val">{val?.productosBajos ?? "—"}</div>
          <div className="kpi-delta dn">reabastecer</div>
        </div>
      </div>

      {/* Valor por producto */}
      <div className="admin-table-wrap" style={{ marginBottom: 24 }}>
        <div className="admin-table-header">
          <span className="admin-table-title">Valor por producto</span>
          <span className="status-pill pill-gold">{val ? formatoCOP(val.valorTotal) : "—"}</span>
        </div>
        <table>
          <thead>
            <tr><th>Producto</th><th>Cat.</th><th>Stock</th><th>Precio</th><th>Valor</th></tr>
          </thead>
          <tbody>
            {val?.items.map((p) => (
              <tr key={p.id}>
                <td>{p.nombre}</td>
                <td><span className="status-pill pill-gray">{p.categoria}</span></td>
                <td><span className={`status-pill ${p.bajo ? "pill-red" : "pill-green"}`}>{p.stock}</span></td>
                <td>{formatoCOP(p.precio)}</td>
                <td style={{ color: "var(--gold)", fontFamily: "var(--font-d)" }}>{formatoCOP(p.valor)}</td>
              </tr>
            ))}
            {val && val.items.length === 0 && (
              <tr><td colSpan={5} className="muted" style={{ textAlign: "center" }}>Sin productos.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Kardex / movimientos */}
      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <span className="admin-table-title">Historial de movimientos (kardex)</span>
          <span className="muted" style={{ fontSize: 12 }}>últimos {movs.length}</span>
        </div>
        <table>
          <thead>
            <tr><th>Fecha</th><th>Producto</th><th>Movimiento</th><th>Cantidad</th><th>Detalle</th></tr>
          </thead>
          <tbody>
            {movs.map((m) => {
              const t = TIPO[m.tipo] ?? { cls: "pill-gray", label: m.tipo };
              const signo = m.tipo === "ENTRADA" ? "+" : m.tipo === "SALIDA" ? "−" : "±";
              return (
                <tr key={m.id}>
                  <td className="muted">{fmtFecha(m.fecha)}</td>
                  <td>{m.producto}</td>
                  <td><span className={`status-pill ${t.cls}`}>{t.label}</span></td>
                  <td style={{ fontFamily: "var(--font-d)", color: m.tipo === "ENTRADA" ? "#4CAF50" : m.tipo === "SALIDA" ? "var(--red-lt)" : "var(--cream)" }}>
                    {signo}{m.cantidad}
                  </td>
                  <td className="muted" style={{ fontSize: 12 }}>{m.motivo}</td>
                </tr>
              );
            })}
            {movs.length === 0 && (
              <tr><td colSpan={5} className="muted" style={{ textAlign: "center" }}>Aún no hay movimientos. Carga stock con "+ Entrada" o vende en el POS.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
