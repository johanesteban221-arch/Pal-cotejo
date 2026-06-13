"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getToken, getUser, logout, StaffUser } from "../../lib/auth";

const ITEMS = [
  { seccion: "Principal" },
  { href: "/admin", icon: "📊", label: "Dashboard" },
  { href: "/admin/reservas", icon: "📋", label: "Reservas" },
  { href: "/admin/canchas", icon: "⚽", label: "Canchas" },
  { href: "/admin/bar", icon: "🍺", label: "Sport bar" },
  { seccion: "Gestión" },
  { href: "/admin/clientes", icon: "👥", label: "Clientes" },
  { href: "/admin/tarifas", icon: "💰", label: "Tarifas", soloAdmin: true },
  { href: "/admin/bloqueos", icon: "🔒", label: "Bloqueos", soloAdmin: true },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const esLogin = path === "/admin/login";
  const [usuario, setUsuario] = useState<StaffUser | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (esLogin) {
      setListo(true);
      return;
    }
    if (!getToken()) {
      router.replace("/admin/login");
      return;
    }
    setUsuario(getUser());
    setListo(true);
  }, [esLogin, router]);

  // La pantalla de login no lleva sidebar
  if (esLogin) return <>{children}</>;
  if (!listo) return null;

  function salir() {
    logout();
    router.replace("/admin/login");
  }

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span>PAL COTEJO</span>
          <small>Panel admin</small>
        </div>
        {ITEMS.map((it, i) =>
          "seccion" in it ? (
            <div key={i} className="sidebar-section">
              {it.seccion}
            </div>
          ) : it.soloAdmin && usuario?.rol !== "ADMIN" ? null : (
            <Link
              key={i}
              href={it.href!}
              className={`sidebar-item ${path === it.href ? "active" : ""}`}
            >
              <span className="sidebar-icon">{it.icon}</span>
              {it.label}
            </Link>
          ),
        )}
        <div className="sidebar-section">Sistema</div>
        <Link href="/" className="sidebar-item">
          <span className="sidebar-icon">↩</span>Ver sitio
        </Link>
        <div onClick={salir} className="sidebar-item" style={{ marginTop: "auto", cursor: "pointer" }}>
          <span className="sidebar-icon">⎋</span>
          Salir{usuario ? ` (${usuario.rol})` : ""}
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
