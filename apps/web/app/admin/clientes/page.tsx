"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopCliente, getTopClientes } from "../../../lib/api";
import { NoAutorizado, logout } from "../../../lib/auth";

export default function ClientesAdmin() {
  const router = useRouter();
  const [clientes, setClientes] = useState<TopCliente[]>([]);

  useEffect(() => {
    getTopClientes()
      .then(setClientes)
      .catch((e) => {
        if (e instanceof NoAutorizado) {
          logout();
          router.replace("/admin/login");
        }
      });
  }, [router]);

  return (
    <>
      <div className="admin-header">
        <div className="admin-title">Clientes</div>
      </div>
      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <span className="admin-table-title">Top clientes por reservas</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>WhatsApp</th>
              <th>Reservas</th>
              <th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c, i) => (
              <tr key={c.telefono}>
                <td>{c.nombre}</td>
                <td>{c.telefono}</td>
                <td>{c.reservas}</td>
                <td>
                  <span className={`status-pill ${i === 0 ? "pill-gold" : c.reservas >= 10 ? "pill-green" : "pill-gray"}`}>
                    {i === 0 ? "Top" : c.reservas >= 10 ? "Frecuente" : "Regular"}
                  </span>
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td colSpan={4} className="muted" style={{ textAlign: "center" }}>Sin clientes aún.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
