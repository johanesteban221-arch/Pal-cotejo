"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UsuarioStaffRow, getUsuarios } from "../../../../lib/api";
import { NoAutorizado, Rol, logout } from "../../../../lib/auth";
import UsuarioModal from "./UsuarioModal";

function rolPill(rol: Rol): { cls: string; label: string } {
  switch (rol) {
    case "ADMIN":
      return { cls: "pill-gold", label: "Admin" };
    case "SUPERVISOR":
      return { cls: "pill-green", label: "Supervisor" };
    default:
      return { cls: "pill-gray", label: "Caja" };
  }
}

export default function UsuariosAdmin() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<UsuarioStaffRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [msg, setMsg] = useState("");
  const [modal, setModal] = useState<{ usuario: UsuarioStaffRow | null } | null>(null);

  const onErr = (e: unknown) => {
    if (e instanceof NoAutorizado) {
      logout();
      router.replace("/admin/login");
    } else {
      setMsg("⚠️ " + (e as Error).message);
    }
  };

  function cargar() {
    setCargando(true);
    getUsuarios()
      .then(setUsuarios)
      .catch(onErr)
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    cargar(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="admin-header">
        <div className="admin-title">Usuarios</div>
        <button
          className="btn-gold"
          style={{ fontSize: 13, padding: "10px 16px" }}
          onClick={() => setModal({ usuario: null })}
        >
          ＋ Nuevo usuario
        </button>
      </div>

      {msg && (
        <div
          className="admin-table-wrap"
          style={{ padding: "12px 20px", marginBottom: 16, color: "var(--red-lt)" }}
        >
          {msg}
        </div>
      )}

      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <span className="admin-table-title">Staff del sistema</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Creado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const p = rolPill(u.rol);
              return (
                <tr key={u.id}>
                  <td style={{ color: "var(--cream)", fontFamily: "var(--font-d)" }}>{u.nombre}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`status-pill ${p.cls}`}>{p.label}</span>
                  </td>
                  <td>
                    <span className={`status-pill ${u.activo ? "pill-green" : "pill-red"}`}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>{u.creadoEn.slice(0, 10)}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn-outline"
                      style={{ fontSize: 12, padding: "6px 12px" }}
                      onClick={() => setModal({ usuario: u })}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              );
            })}
            {cargando && (
              <tr>
                <td colSpan={6} className="muted" style={{ textAlign: "center" }}>
                  Cargando…
                </td>
              </tr>
            )}
            {!cargando && usuarios.length === 0 && (
              <tr>
                <td colSpan={6} className="muted" style={{ textAlign: "center" }}>
                  Aún no hay usuarios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <UsuarioModal
          usuario={modal.usuario}
          onClose={() => setModal(null)}
          onSaved={cargar}
          onErr={onErr}
        />
      )}
    </>
  );
}
