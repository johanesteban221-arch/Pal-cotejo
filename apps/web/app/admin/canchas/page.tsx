"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cancha, getCanchas } from "../../../lib/api";
import { NoAutorizado, logout } from "../../../lib/auth";

export default function CanchasAdmin() {
  const router = useRouter();
  const [canchas, setCanchas] = useState<Cancha[]>([]);

  useEffect(() => {
    getCanchas()
      .then(setCanchas)
      .catch((e) => {
        if (e instanceof NoAutorizado) {
          logout();
          router.replace("/admin/login");
        }
      });
  }, [router]);

  return (
    <>
      <div className="admin-header">
        <div className="admin-title">Canchas y bloqueos</div>
        <Link className="btn-gold" style={{ fontSize: 14, padding: "10px 20px" }} href="/admin/bloqueos">
          + Bloquear horario
        </Link>
      </div>
      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <span className="admin-table-title">Estado de canchas</span>
        </div>
        <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 16 }}>
          {canchas.map((c) => (
            <div key={c.id} style={{ border: "1px solid var(--border-g)", borderRadius: 10, padding: 20, background: "rgba(212,160,23,.04)" }}>
              <div style={{ fontFamily: "var(--font-d)", fontSize: 18, color: "var(--cream)" }}>{c.nombre}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>{c.tipo} · Sintético</div>
              <div style={{ fontSize: 13, color: "#4CAF50" }}>● Activa</div>
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <Link className="btn-outline" style={{ fontSize: 12, padding: "6px 12px" }} href="/admin/bloqueos">Bloquear</Link>
                <Link className="btn-gold" style={{ fontSize: 12, padding: "6px 12px" }} href="/admin/reservas">Reservar</Link>
              </div>
            </div>
          ))}
          {canchas.length === 0 && <div className="muted">Cargando canchas…</div>}
        </div>
      </div>
    </>
  );
}
