// Sport bar — vista admin (mesas). Maqueta fiel al diseño aprobado.
// La gestión real de mesas por franja es parte de la Fase 5.
const MESAS = [
  { icon: "🪑", num: "Mesa 1", cap: "2–4 personas · Zona central", ocupadaPor: null },
  { icon: "🪑", num: "Mesa 2", cap: "4–6 personas · Frente a pantalla", ocupadaPor: null },
  { icon: "🪑", num: "Mesa 3", cap: "4–6 personas · Zona VIP", ocupadaPor: "Carlos R." },
  { icon: "🍺", num: "Mesa 4 — Barra", cap: "2–3 personas", ocupadaPor: null },
  { icon: "🍺", num: "Mesa 5 — VIP", cap: "6–10 personas", ocupadaPor: null },
  { icon: "🪑", num: "Mesa 6", cap: "2–4 personas · Terraza", ocupadaPor: "Liga FC" },
];

export default function BarAdmin() {
  return (
    <>
      <div className="admin-header">
        <div className="admin-title">Sport bar — Mesas</div>
        <button className="btn-gold" style={{ fontSize: 14, padding: "10px 20px" }}>+ Reservar mesa</button>
      </div>
      <div className="bar-grid">
        {MESAS.map((m) => {
          const ocupada = !!m.ocupadaPor;
          return (
            <div key={m.num} className={`mesa-card ${ocupada ? "ocupada" : "disponible"}`}>
              <div className="mesa-icon">{m.icon}</div>
              <div className="mesa-num">{m.num}</div>
              <div className="mesa-cap">{m.cap}</div>
              <div className={`mesa-status ${ocupada ? "status-no" : "status-ok"}`}>
                {ocupada ? `Reservada — ${m.ocupadaPor}` : "Disponible"}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
