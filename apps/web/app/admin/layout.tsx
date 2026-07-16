"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getToken, getUser, logout, Rol, StaffUser } from "../../lib/auth";

type MenuLink = { href: string; icon: string; label: string; roles?: Rol[] };
type MenuSection = { seccion: string };
type MenuEntry = MenuSection | MenuLink;

// `roles` ausente = visible para todos los roles;
// `roles` presente = visible solo si el rol del usuario está en la lista.
const ITEMS: MenuEntry[] = [
  { seccion: "Principal" },
  { href: "/admin", icon: "📊", label: "Dashboard" },
  { href: "/admin/reservas", icon: "📋", label: "Reservas" },
  { href: "/admin/agenda", icon: "📅", label: "Agenda" },
  { href: "/admin/canchas", icon: "⚽", label: "Canchas" },
  { href: "/admin/mesas", icon: "🪑", label: "Mesas", roles: ["ADMIN"] },
  { href: "/admin/bar", icon: "🍺", label: "Sport bar" },
  { seccion: "Gestión" },
  { href: "/admin/clientes", icon: "👥", label: "Clientes" },
  { href: "/admin/productos", icon: "🍔", label: "Productos", roles: ["ADMIN"] },
  { href: "/admin/inventario", icon: "📦", label: "Inventario", roles: ["ADMIN"] },
  { href: "/admin/inventario/conteo", icon: "🧮", label: "Conteo", roles: ["ADMIN", "SUPERVISOR", "CAJA"] },
  { href: "/admin/inventario/conteo/revision", icon: "🔍", label: "Revisar conteo", roles: ["ADMIN", "SUPERVISOR"] },
  { href: "/admin/tarifas", icon: "💰", label: "Tarifas", roles: ["ADMIN"] },
  { href: "/admin/bloqueos", icon: "🔒", label: "Bloqueos", roles: ["ADMIN", "SUPERVISOR"] },
];

// Sección "Configuración" (solo ADMIN). Lista para colgar más sub-pantallas.
const CONFIG_ITEMS: MenuLink[] = [
  { href: "/admin/configuracion/usuarios", icon: "👤", label: "Usuarios" },
  { href: "/admin/configuracion/metodos-pago", icon: "💳", label: "Métodos de pago" },
  { href: "/admin/configuracion/alertas", icon: "🔔", label: "Alertas" },
];

function puedeVer(rol: Rol | undefined, roles?: Rol[]) {
  return !roles || (rol != null && roles.includes(rol));
}

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
          ) : !puedeVer(usuario?.rol, it.roles) ? null : (
            <Link
              key={i}
              href={it.href}
              className={`sidebar-item ${path === it.href ? "active" : ""}`}
            >
              <span className="sidebar-icon">{it.icon}</span>
              {it.label}
            </Link>
          ),
        )}

        {/* Configuración — solo ADMIN (se oculta también el encabezado) */}
        {usuario?.rol === "ADMIN" && (
          <>
            <div className="sidebar-section">Configuración</div>
            {CONFIG_ITEMS.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={`sidebar-item ${path === it.href ? "active" : ""}`}
              >
                <span className="sidebar-icon">{it.icon}</span>
                {it.label}
              </Link>
            ))}
          </>
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
