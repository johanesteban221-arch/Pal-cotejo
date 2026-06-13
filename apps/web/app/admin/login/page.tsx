"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login, getToken } from "../../../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/admin");
  }, [router]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      await login(email, password);
      router.replace("/admin");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "var(--bg)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div className="footer-logo" style={{ marginBottom: 4 }}>
            PAL COTEJO
          </div>
          <div className="muted" style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-d)" }}>
            Panel administrativo
          </div>
        </div>
        <form onSubmit={entrar} className="pago-card" style={{ maxWidth: "none" }}>
          <div className="form-group">
            <label className="form-label">Correo</label>
            <input
              className="form-input"
              type="email"
              placeholder="admin@palcotejo.co"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <div className="err" style={{ fontSize: 13, marginBottom: 12, textAlign: "center" }}>
              ⚠️ {error}
            </div>
          )}
          <button className="btn-gold" type="submit" disabled={cargando} style={{ width: "100%" }}>
            {cargando ? "Entrando…" : "Iniciar sesión"}
          </button>
        </form>
        <div className="muted" style={{ textAlign: "center", marginTop: 16, fontSize: 12 }}>
          Acceso restringido · Solo personal autorizado
        </div>
      </div>
    </div>
  );
}
