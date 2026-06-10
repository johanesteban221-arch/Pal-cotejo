// Manejo de sesión del staff en el frontend (token JWT en localStorage).
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const TOKEN_KEY = "pal_cotejo_token";
const USER_KEY = "pal_cotejo_user";

export interface StaffUser {
  id: string;
  nombre: string;
  email: string;
  rol: "ADMIN" | "CAJA";
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): StaffUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as StaffUser) : null;
}

export function setSession(token: string, usuario: StaffUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** Llama al endpoint de login. Lanza error si las credenciales son inválidas. */
export async function login(email: string, password: string): Promise<StaffUser> {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const msg = res.status === 401 ? "Correo o contraseña incorrectos" : "Error al iniciar sesión";
    throw new Error(msg);
  }
  const data = await res.json();
  setSession(data.access_token, data.usuario);
  return data.usuario;
}

// Error especial para sesión expirada/ausente
export class NoAutorizado extends Error {
  constructor() {
    super("No autorizado");
    this.name = "NoAutorizado";
  }
}
