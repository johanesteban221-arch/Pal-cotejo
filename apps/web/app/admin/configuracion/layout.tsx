"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "../../../lib/auth";

// Guard de UX (no de seguridad): solo ADMIN ve la sección Configuración.
// La API ya bloquea con 403 pase lo que pase aquí. Cubre esta y futuras sub-pantallas.
export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (getUser()?.rol === "ADMIN") setOk(true);
    else router.replace("/admin");
  }, [router]);

  if (!ok) return null;
  return <>{children}</>;
}
