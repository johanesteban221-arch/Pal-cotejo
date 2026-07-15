"use client";

import { useState } from "react";
import { UsuarioStaffRow, actualizarUsuario, cambiarPasswordUsuario, crearUsuario } from "../../../../lib/api";
import { NoAutorizado, Rol } from "../../../../lib/auth";

const ROLES: { value: Rol; label: string }[] = [
  { value: "ADMIN", label: "Administrador" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "CAJA", label: "Caja" },
];

// Regla de contraseña dependiente del rol (espejo del backend).
function reglaPassword(rol: Rol) {
  if (rol === "CAJA") {
    return {
      label: "PIN de 4 dígitos",
      ayuda: "La caja ingresa con un PIN de 4 dígitos.",
      valida: (v: string) => /^\d{4}$/.test(v),
      error: "El PIN debe ser exactamente 4 dígitos numéricos.",
      numeric: true,
    };
  }
  return {
    label: "Contraseña (mín. 6 caracteres)",
    ayuda: "Mínimo 6 caracteres.",
    valida: (v: string) => v.length >= 6,
    error: "La contraseña debe tener al menos 6 caracteres.",
    numeric: false,
  };
}

export default function UsuarioModal({
  usuario,
  onClose,
  onSaved,
  onErr,
}: {
  usuario: UsuarioStaffRow | null; // null = crear
  onClose: () => void;
  onSaved: () => void;
  onErr: (e: unknown) => void;
}) {
  const editando = usuario != null;
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [rol, setRol] = useState<Rol>(usuario?.rol ?? "CAJA");
  const [password, setPassword] = useState("");
  const [activo, setActivo] = useState(usuario?.activo ?? true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [mostrarPass, setMostrarPass] = useState(false);
  const [nuevaPass, setNuevaPass] = useState("");
  const [reseteando, setReseteando] = useState(false);

  const regla = reglaPassword(rol);
  // Regla del reset: basada en el rol GUARDADO del usuario editado (usuario.rol).
  const reglaReset = usuario ? reglaPassword(usuario.rol) : null;

  function cambiarPass() {
    if (!usuario || !reglaReset) return;
    setError("");
    setOkMsg("");
    if (!reglaReset.valida(nuevaPass)) {
      setError(reglaReset.error);
      return;
    }
    setReseteando(true);
    cambiarPasswordUsuario(usuario.id, nuevaPass)
      .then(() => {
        setOkMsg("Contraseña actualizada.");
        setNuevaPass("");
        setMostrarPass(false);
      })
      .catch((e) => {
        if (e instanceof NoAutorizado) onErr(e);
        else setError((e as Error).message);
      })
      .finally(() => setReseteando(false));
  }

  function guardar() {
    setError("");
    // Validación en cliente ANTES de enviar (el backend igual revalida).
    if (nombre.trim().length < 2) {
      setError("El nombre es obligatorio (mín. 2 caracteres).");
      return;
    }
    if (!editando) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
        setError("Email inválido.");
        return;
      }
      if (!regla.valida(password)) {
        setError(regla.error);
        return;
      }
    }

    setGuardando(true);
    const req = editando
      ? actualizarUsuario(usuario!.id, { nombre: nombre.trim(), rol, activo })
      : crearUsuario({ nombre: nombre.trim(), email: email.trim(), rol, password });

    req
      .then(() => {
        onSaved();
        onClose();
      })
      .catch((e) => {
        // 401 → sesión caída: lo maneja el padre (logout). El resto se muestra aquí.
        if (e instanceof NoAutorizado) onErr(e);
        else setError((e as Error).message);
      })
      .finally(() => setGuardando(false));
  }

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modal}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div className="admin-title" style={{ fontSize: 22 }}>
            {editando ? "Editar usuario" : "Nuevo usuario"}
          </div>
          <button className="btn-outline" style={{ padding: "6px 12px", fontSize: 13 }} onClick={onClose}>
            Cerrar ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(200,60,60,.12)",
              color: "var(--red-lt)",
              fontSize: 14,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {okMsg && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(76,175,80,.12)",
              color: "#4CAF50",
              fontSize: 14,
            }}
          >
            ✓ {okMsg}
          </div>
        )}

        <div style={{ display: "grid", gap: 14 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Nombre</label>
            <input className="form-input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del staff" />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Email{editando ? " (no editable)" : ""}</label>
            <input
              className="form-input"
              value={email}
              readOnly={editando}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@palcotejo.co"
              style={editando ? { opacity: 0.6 } : undefined}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Rol</label>
            <select
              className="form-select"
              value={rol}
              onChange={(e) => {
                setRol(e.target.value as Rol);
                setPassword(""); // empezar de cero con la regla del nuevo rol (modo crear)
              }}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Contraseña: solo al crear. En editar, el reset es el paso 5. */}
          {!editando && (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{regla.label}</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                inputMode={regla.numeric ? "numeric" : undefined}
                maxLength={regla.numeric ? 4 : undefined}
              />
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                {regla.ayuda}
              </div>
            </div>
          )}

          {/* Activo: solo al editar */}
          {editando && (
            <div className="form-group" style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <input id="activo-chk" type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
              <label htmlFor="activo-chk" className="form-label" style={{ margin: 0 }}>
                Usuario activo
              </label>
            </div>
          )}
        </div>

        {/* Reset de contraseña — solo en edición (colapsado por defecto) */}
        {editando && reglaReset && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            {!mostrarPass ? (
              <button
                className="btn-outline"
                style={{ fontSize: 13, padding: "8px 14px" }}
                onClick={() => {
                  setMostrarPass(true);
                  setError("");
                  setOkMsg("");
                }}
              >
                🔑 Cambiar contraseña
              </button>
            ) : (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Nueva {reglaReset.label.toLowerCase()}</label>
                <input
                  className="form-input"
                  type="password"
                  value={nuevaPass}
                  onChange={(e) => setNuevaPass(e.target.value)}
                  inputMode={reglaReset.numeric ? "numeric" : undefined}
                  maxLength={reglaReset.numeric ? 4 : undefined}
                />
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                  {reglaReset.ayuda}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button className="btn-gold" style={{ fontSize: 13, padding: "8px 14px" }} disabled={reseteando} onClick={cambiarPass}>
                    {reseteando ? "Guardando…" : "Guardar contraseña"}
                  </button>
                  <button
                    className="btn-outline"
                    style={{ fontSize: 13, padding: "8px 14px" }}
                    disabled={reseteando}
                    onClick={() => {
                      setMostrarPass(false);
                      setNuevaPass("");
                      setError("");
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <button className="btn-gold" style={{ width: "100%", marginTop: 20 }} disabled={guardando} onClick={guardar}>
          {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear usuario"}
        </button>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.6)",
  backdropFilter: "blur(3px)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: 24,
  zIndex: 200,
  overflowY: "auto",
};
const modal: React.CSSProperties = {
  width: "100%",
  maxWidth: 480,
  background: "var(--bg2)",
  border: "1px solid var(--border-g)",
  borderRadius: 14,
  padding: 24,
  margin: "auto",
};
