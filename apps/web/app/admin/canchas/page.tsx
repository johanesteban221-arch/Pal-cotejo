"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Cancha, getCanchasAdmin, cambiarEstadoCancha } from "../../../lib/api";
import { NoAutorizado, logout } from "../../../lib/auth";
import RecursoModal from "./RecursoModal";

export default function RecursosAdmin() {
  const router = useRouter();
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [cargando, setCargando] = useState(true);
  const [msg, setMsg] = useState("");
  const [modal, setModal] = useState<{ recurso: Cancha | null } | null>(null);
  const [procesando, setProcesando] = useState(false);

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
    getCanchasAdmin()
      .then(setCanchas)
      .catch(onErr)
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    cargar(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function aviso(t: string) {
    setMsg(t);
    setTimeout(() => setMsg(""), 3500);
  }

  function toggle(c: Cancha) {
    if (procesando) return;
    setProcesando(true);
    cambiarEstadoCancha(c.id, !c.activa)
      .then((r) => {
        if (r.requiereConfirmacion) {
          if (window.confirm(`${r.mensaje}\n\n¿Desactivar de todos modos?`)) {
            return cambiarEstadoCancha(c.id, false, true).then(() => {
              cargar();
              aviso("✓ Recurso desactivado.");
            });
          }
          return;
        }
        cargar();
        aviso(c.activa ? "✓ Recurso desactivado." : "✓ Recurso activado.");
      })
      .catch(onErr)
      .finally(() => setProcesando(false));
  }

  return (
    <>
      <div className="admin-header">
        <div className="admin-title">Recursos</div>
        <button
          className="btn-gold"
          style={{ fontSize: 13, padding: "10px 16px" }}
          onClick={() => setModal({ recurso: null })}
        >
          ＋ Nuevo recurso
        </button>
      </div>

      {msg && (
        <div
          className="admin-table-wrap"
          style={{ padding: "12px 20px", marginBottom: 16, color: msg.startsWith("✓") ? "#4CAF50" : "var(--red-lt)" }}
        >
          {msg}
        </div>
      )}

      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <span className="admin-table-title">Recursos reservables</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Capacidad</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {canchas.map((c) => (
              <tr key={c.id} style={{ opacity: c.activa ? 1 : 0.5 }}>
                <td style={{ color: "var(--cream)", fontFamily: "var(--font-d)" }}>{c.nombre}</td>
                <td>{c.tipo || <span className="muted">Sin tipo</span>}</td>
                <td>{c.capacidad != null ? c.capacidad : "—"}</td>
                <td>
                  <span className={`status-pill ${c.activa ? "pill-green" : "pill-red"}`}>
                    {c.activa ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button
                      className="btn-outline"
                      style={{ fontSize: 12, padding: "6px 12px" }}
                      onClick={() => setModal({ recurso: c })}
                    >
                      Editar
                    </button>
                    <button
                      className={c.activa ? "btn-outline" : "btn-gold"}
                      style={{ fontSize: 12, padding: "6px 12px" }}
                      disabled={procesando}
                      onClick={() => toggle(c)}
                    >
                      {c.activa ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {cargando && (
              <tr>
                <td colSpan={5} className="muted" style={{ textAlign: "center" }}>
                  Cargando recursos…
                </td>
              </tr>
            )}
            {!cargando && canchas.length === 0 && (
              <tr>
                <td colSpan={5} className="muted" style={{ textAlign: "center" }}>
                  Aún no hay recursos. Crea el primero con “＋ Nuevo recurso”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <RecursoModal
          recurso={modal.recurso}
          onClose={() => setModal(null)}
          onSaved={() => {
            cargar();
            aviso(modal.recurso ? "✓ Recurso actualizado." : "✓ Recurso creado.");
          }}
          onErr={onErr}
        />
      )}
    </>
  );
}
