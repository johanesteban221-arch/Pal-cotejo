"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Cancha, getCanchasAdmin, cambiarEstadoCancha } from "../../../lib/api";
import { NoAutorizado, logout } from "../../../lib/auth";
import RecursoModal from "./RecursoModal";

const SIN_TIPO = "__SIN_TIPO__";

// Agrupa los recursos por tipo. Grupos ordenados por nombre de tipo (Sin tipo al
// final); dentro de cada grupo por `orden` (nulls al final) luego nombre.
function agrupar(canchas: Cancha[]) {
  const map = new Map<string, Cancha[]>();
  for (const c of canchas) {
    const key = c.tipo && c.tipo.trim() ? c.tipo.trim() : SIN_TIPO;
    (map.get(key) ?? map.set(key, []).get(key)!).push(c);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => {
      const oa = a.orden ?? Infinity;
      const ob = b.orden ?? Infinity;
      return oa !== ob ? oa - ob : a.nombre.localeCompare(b.nombre);
    });
  }
  const keys = [...map.keys()].sort((a, b) => {
    if (a === SIN_TIPO) return 1;
    if (b === SIN_TIPO) return -1;
    return a.localeCompare(b);
  });
  return keys.map((k) => ({ tipo: k === SIN_TIPO ? "Sin tipo" : k, recursos: map.get(k)! }));
}

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
          const txt = `Este recurso tiene ${r.reservasFuturas ?? ""} reserva(s) futura(s). Archivarlo lo ocultará pero NO las cancela.\n\n¿Archivar de todos modos?`;
          if (window.confirm(txt)) {
            return cambiarEstadoCancha(c.id, false, true).then(() => {
              cargar();
              aviso("✓ Recurso archivado.");
            });
          }
          return;
        }
        cargar();
        aviso(c.activa ? "✓ Recurso archivado." : "✓ Recurso reactivado.");
      })
      .catch(onErr)
      .finally(() => setProcesando(false));
  }

  const grupos = agrupar(canchas);

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

      {cargando && (
        <div className="admin-table-wrap">
          <div className="muted" style={{ padding: 40, textAlign: "center" }}>Cargando recursos…</div>
        </div>
      )}

      {!cargando && grupos.length === 0 && (
        <div className="admin-table-wrap">
          <div className="muted" style={{ padding: 40, textAlign: "center" }}>
            Aún no hay recursos. Crea el primero con “＋ Nuevo recurso”.
          </div>
        </div>
      )}

      {grupos.map((g) => (
        <div key={g.tipo} className="admin-table-wrap" style={{ marginBottom: 16 }}>
          <div className="admin-table-header">
            <span className="admin-table-title">
              {g.tipo.toUpperCase()} ({g.recursos.length})
            </span>
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
              {g.recursos.map((c) => (
                <tr key={c.id} style={{ opacity: c.activa ? 1 : 0.5 }}>
                  <td style={{ color: "var(--cream)", fontFamily: "var(--font-d)" }}>{c.nombre}</td>
                  <td>{c.capacidad != null ? c.capacidad : "—"}</td>
                  <td>
                    <span className={`status-pill ${c.activa ? "pill-green" : "pill-gray"}`}>
                      {c.activa ? "Activo" : "Archivado"}
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
                        {c.activa ? "Archivar" : "Reactivar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

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
