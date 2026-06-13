"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Cancha, Tarifa, getCanchas, getCanchaDetalle, formatoCOP } from "../../../lib/api";
import { NoAutorizado, logout } from "../../../lib/auth";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function TarifasAdmin() {
  const router = useRouter();
  const [filas, setFilas] = useState<{ cancha: string; t: Tarifa }[]>([]);

  useEffect(() => {
    const onErr = (e: unknown) => {
      if (e instanceof NoAutorizado) {
        logout();
        router.replace("/admin/login");
      }
    };
    getCanchas()
      .then(async (cs: Cancha[]) => {
        const out: { cancha: string; t: Tarifa }[] = [];
        for (const c of cs) {
          const det = await getCanchaDetalle(c.id);
          (det.tarifas || []).forEach((t) => out.push({ cancha: c.nombre, t }));
        }
        setFilas(out);
      })
      .catch(onErr);
  }, [router]);

  return (
    <>
      <div className="admin-header">
        <div className="admin-title">Configuración de tarifas</div>
      </div>
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
              <th>Precio/hora</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(({ cancha, t }) => (
              <tr key={t.id}>
                <td>{cancha}</td>
                <td>
                  <span className={`status-pill ${t.tipo === "PICO" ? "pill-red" : "pill-gray"}`}>
                    {t.tipo === "PICO" ? "Pico" : "Valle"}
                  </span>
                </td>
                <td>{t.horaInicio} – {t.horaFin}</td>
                <td>{t.diaSemana === null ? "Todos" : DIAS[t.diaSemana]}</td>
                <td style={{ color: "var(--gold)", fontFamily: "var(--font-d)" }}>{formatoCOP(t.precio)}</td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={5} className="muted" style={{ textAlign: "center" }}>Cargando tarifas…</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
        La edición de tarifas desde el panel se habilita en una próxima iteración.
      </p>
    </>
  );
}
