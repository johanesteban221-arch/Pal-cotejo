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

  // Si ya hay sesión, ir directo al panel
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
    <main className="phone-wrap" style={{ paddingTop: 60 }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div className="success-ring" style={{ background: "none" }}>
          <div
            style={{
              width: 64, height: 64, borderRadius: 16,
              background: "linear-gradient(135deg, var(--green), var(--green-2))",
              display: "grid", placeItems: "center", fontSize: 30,
              boxShadow: "0 8px 30px var(--green-glow)",
            }}
          >
            🔐
          </div>
        </div>
        <div className="h1" style={{ marginTop: 8 }}>Panel PAL COTEJO</div>
        <div className="sub">Acceso para el personal</div>
      </div>

      <form onSubmit={entrar} className="card">
        <label className="sub" style={{ display: "block", marginBottom: 6 }}>Correo</label>
        <input
          className="campo"
          type="email"
          placeholder="admin@palcotejo.co"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <label className="sub" style={{ display: "block", margin: "10px 0 6px" }}>Contraseña</label>
        <input
          className="campo"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />

        {error && (
          <div style={{ color: "#f87171", fontSize: 13, marginTop: 12, textAlign: "center" }}>
            ⚠️ {error}
          </div>
        )}

        <button className="btn" type="submit" disabled={cargando} style={{ marginTop: 18 }}>
          {cargando ? "Entrando…" : "Iniciar sesión"}
        </button>
      </form>

      <div className="sub" style={{ textAlign: "center", marginTop: 16, fontSize: 12 }}>
        Acceso restringido · Solo personal autorizado
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 13,
  borderRadius: 12,
  border: "1px solid var(--border-2)",
  background: "var(--bg-2)",
  color: "var(--text)",
  fontSize: 15,
  outline: "none",
};
