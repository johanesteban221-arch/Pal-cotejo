"use client";

import { useParams } from "next/navigation";
import { moduloPorSlug } from "../modulos";

// Pantalla informativa "En desarrollo" — puro frontend, sin backend ni datos.
export default function ProximamentePage() {
  const params = useParams<{ slug: string }>();
  const mod = moduloPorSlug(params.slug);

  if (!mod) {
    return (
      <div className="admin-table-wrap" style={{ padding: 40, textAlign: "center" }}>
        <div className="muted">Módulo no encontrado.</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "24px auto" }}>
      <div className="admin-table-wrap" style={{ padding: "48px 40px", textAlign: "center" }}>
        <div style={{ fontSize: 64, lineHeight: 1 }}>{mod.icono}</div>
        <h1 className="admin-title" style={{ fontSize: 32, margin: "16px 0 10px" }}>{mod.titulo}</h1>
        <span className="status-pill pill-gold" style={{ fontSize: 13 }}>🚧 En desarrollo · Próximamente</span>
        <p className="muted" style={{ fontSize: 15, marginTop: 16, marginBottom: 0 }}>{mod.descripcion}</p>
      </div>

      <div className="admin-table-wrap" style={{ marginTop: 16, padding: "24px 32px" }}>
        <div className="admin-table-title" style={{ display: "block", marginBottom: 16 }}>Qué incluirá</div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
          {mod.features.map((f) => (
            <li key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "var(--cream)", fontSize: 14 }}>
              <span style={{ color: "var(--gold)", fontFamily: "var(--font-d)" }}>✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <span className="muted" style={{ fontSize: 12 }}>Este módulo hace parte del roadmap de PAL COTEJO.</span>
      </div>
    </div>
  );
}
