"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Cancha, TarifaAdmin, getCanchas, getTarifas, actualizarTarifa, cambiarEstadoTarifa, formatoCOP } from "../../../lib/api";
import NuevaTarifaModal from "./NuevaTarifaModal";
import EditarFranjaModal from "./EditarFranjaModal";
import { NoAutorizado, logout } from "../../../lib/auth";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function TarifasAdmin() {
  const router = useRouter();
  const [tarifas, setTarifas] = useState<TarifaAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [msg, setMsg] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [valor, setValor] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [franjaSel, setFranjaSel] = useState<TarifaAdmin | null>(null);

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
    getTarifas()
      .then(setTarifas)
      .catch(onErr)
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    cargar();
    getCanchas().then(setCanchas).catch(onErr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirEdicion(t: TarifaAdmin) {
    setEditId(t.id);
    setValor(String(t.precio));
    setMsg("");
  }

  function guardar(id: string) {
    const n = Number(valor);
    if (!Number.isInteger(n) || n < 0) {
      setMsg("⚠️ El precio debe ser un número entero ≥ 0.");
      return;
    }
    setGuardando(true);
    actualizarTarifa(id, { precio: n })
      .then(() => {
        setEditId(null);
        cargar();
        setMsg("✓ Precio actualizado.");
        setTimeout(() => setMsg(""), 3000);
      })
      .catch(onErr)
      .finally(() => setGuardando(false));
  }

  function aviso(t: string) {
    setMsg(t);
    setTimeout(() => setMsg(""), 3500);
  }

  function toggleEstado(t: TarifaAdmin) {
    if (procesando) return;
    setProcesando(true);
    cambiarEstadoTarifa(t.id, !t.activa)
      .then((r) => {
        if (r.requiereConfirmacion) {
          if (window.confirm(`${r.mensaje}\n\n¿Desactivar de todos modos?`)) {
            return cambiarEstadoTarifa(t.id, false, true).then(() => {
              cargar();
              aviso("✓ Tarifa desactivada.");
            });
          }
          return;
        }
        cargar();
        aviso(t.activa ? "✓ Tarifa desactivada." : "✓ Tarifa activada.");
      })
      .catch(onErr)
      .finally(() => setProcesando(false));
  }

  return (
    <>
      <div className="admin-header">
        <div className="admin-title">Configuración de tarifas</div>
        <button
          className="btn-gold"
          style={{ fontSize: 13, padding: "10px 16px" }}
          onClick={() => setModalNuevo(true)}
        >
          ＋ Nueva tarifa
        </button>
      </div>

      {msg && (
        <div
          className="admin-table-wrap"
          style={{
            padding: "12px 20px",
            marginBottom: 16,
            color: msg.startsWith("✓") ? "#4CAF50" : "var(--red-lt)",
          }}
        >
          {msg}
        </div>
      )}

      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <span className="admin-table-title">Tarifas por cancha y horario</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Cancha</th>
              <th>Tipo</th>
              <th>Horario</th>
              <th>Días</th>
              <th>Estado</th>
              <th>Precio/hora</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tarifas.map((t) => (
              <tr key={t.id} style={{ opacity: t.activa ? 1 : 0.5 }}>
                <td>{t.cancha.nombre}</td>
                <td>
                  <span className={`status-pill ${t.tipo === "PICO" ? "pill-red" : "pill-gray"}`}>
                    {t.tipo === "PICO" ? "Pico" : "Valle"}
                  </span>
                </td>
                <td>
                  {t.horaInicio} – {t.horaFin}
                </td>
                <td>{t.diaSemana === null ? "Todos" : DIAS[t.diaSemana]}</td>
                <td>
                  <span className={`status-pill ${t.activa ? "pill-green" : "pill-red"}`}>
                    {t.activa ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td style={{ color: "var(--gold)", fontFamily: "var(--font-d)" }}>
                  {editId === t.id ? (
                    <input
                      className="form-input"
                      type="number"
                      min={0}
                      step={1}
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      style={{ width: 130 }}
                      autoFocus
                    />
                  ) : (
                    formatoCOP(t.precio)
                  )}
                </td>
                <td style={{ textAlign: "right" }}>
                  {editId === t.id ? (
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button
                        className="btn-gold"
                        style={{ fontSize: 12, padding: "6px 12px" }}
                        disabled={guardando}
                        onClick={() => guardar(t.id)}
                      >
                        {guardando ? "…" : "Guardar"}
                      </button>
                      <button
                        className="btn-outline"
                        style={{ fontSize: 12, padding: "6px 12px" }}
                        disabled={guardando}
                        onClick={() => setEditId(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button
                        className="btn-outline"
                        style={{ fontSize: 12, padding: "6px 12px" }}
                        onClick={() => abrirEdicion(t)}
                      >
                        Editar precio
                      </button>
                      <button
                        className="btn-outline"
                        style={{ fontSize: 12, padding: "6px 12px" }}
                        onClick={() => setFranjaSel(t)}
                      >
                        Editar franja
                      </button>
                      <button
                        className={t.activa ? "btn-outline" : "btn-gold"}
                        style={{ fontSize: 12, padding: "6px 12px" }}
                        disabled={procesando}
                        onClick={() => toggleEstado(t)}
                      >
                        {t.activa ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {cargando && (
              <tr>
                <td colSpan={7} className="muted" style={{ textAlign: "center" }}>
                  Cargando tarifas…
                </td>
              </tr>
            )}
            {!cargando && tarifas.length === 0 && (
              <tr>
                <td colSpan={7} className="muted" style={{ textAlign: "center" }}>
                  No hay tarifas configuradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {franjaSel && (
        <EditarFranjaModal
          tarifa={franjaSel}
          onClose={() => setFranjaSel(null)}
          onSaved={() => {
            cargar();
            aviso("✓ Franja actualizada.");
          }}
          onErr={onErr}
        />
      )}

      {modalNuevo && (
        <NuevaTarifaModal
          canchas={canchas}
          onClose={() => setModalNuevo(false)}
          onSaved={() => {
            cargar();
            aviso("✓ Tarifa creada.");
          }}
          onErr={onErr}
        />
      )}
    </>
  );
}
