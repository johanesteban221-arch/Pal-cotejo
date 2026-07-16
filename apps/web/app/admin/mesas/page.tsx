"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MesaAdmin, getMesasAdmin, cambiarEstadoMesa } from "../../../lib/api";
import { NoAutorizado, logout } from "../../../lib/auth";
import MesaModal from "./MesaModal";

export default function MesasAdminPage() {
  const router = useRouter();
  const [mesas, setMesas] = useState<MesaAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [msg, setMsg] = useState("");
  const [modal, setModal] = useState<{ mesa: MesaAdmin | null } | null>(null);
  const [procesando, setProcesando] = useState(false);

  const onErr = (e: unknown) => {
    if (e instanceof NoAutorizado) {
      logout();
      router.replace("/admin/login");
    } else {
      // Incluye el 409 del backend: "La mesa tiene una cuenta abierta; ciérrala antes de desactivarla"
      setMsg("⚠️ " + (e as Error).message);
    }
  };

  function cargar() {
    setCargando(true);
    getMesasAdmin()
      .then(setMesas)
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

  function toggle(m: MesaAdmin) {
    if (procesando) return;
    setProcesando(true);
    cambiarEstadoMesa(m.id, !m.activa)
      .then(() => {
        cargar();
        aviso(m.activa ? "✓ Mesa archivada." : "✓ Mesa reactivada.");
      })
      .catch(onErr)
      .finally(() => setProcesando(false));
  }

  return (
    <>
      <div className="admin-header">
        <div className="admin-title">Mesas del salón</div>
        <button
          className="btn-gold"
          style={{ fontSize: 13, padding: "10px 16px" }}
          onClick={() => setModal({ mesa: null })}
        >
          ＋ Nueva mesa
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

      {cargando && (
        <div className="admin-table-wrap">
          <div className="muted" style={{ padding: 40, textAlign: "center" }}>Cargando mesas…</div>
        </div>
      )}

      {!cargando && (
        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <span className="admin-table-title">Mesas ({mesas.length})</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Capacidad</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {mesas.map((m) => (
                <tr key={m.id} style={{ opacity: m.activa ? 1 : 0.5 }}>
                  <td style={{ color: "var(--cream)", fontFamily: "var(--font-d)" }}>{m.nombre}</td>
                  <td>{m.capacidad}</td>
                  <td>
                    <span className={`status-pill ${m.activa ? "pill-green" : "pill-gray"}`}>
                      {m.activa ? "Activa" : "Archivada"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button
                        className="btn-outline"
                        style={{ fontSize: 12, padding: "6px 12px" }}
                        onClick={() => setModal({ mesa: m })}
                      >
                        Editar
                      </button>
                      <button
                        className={m.activa ? "btn-outline" : "btn-gold"}
                        style={{ fontSize: 12, padding: "6px 12px" }}
                        disabled={procesando}
                        onClick={() => toggle(m)}
                      >
                        {m.activa ? "Archivar" : "Reactivar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {mesas.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted" style={{ textAlign: "center" }}>
                    Aún no hay mesas. Crea la primera con “＋ Nueva mesa”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <MesaModal
          mesa={modal.mesa}
          onClose={() => setModal(null)}
          onSaved={() => {
            cargar();
            aviso(modal.mesa ? "✓ Mesa actualizada." : "✓ Mesa creada.");
          }}
          onErr={onErr}
        />
      )}
    </>
  );
}
