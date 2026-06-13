// Sport bar — vista cliente. Maqueta fiel al diseño aprobado.
// (La disponibilidad real de mesas por franja es parte de la Fase 5.)
const MESAS = [
  { icon: "🪑", num: "Mesa 1", cap: "2–4 personas · Zona central", ok: true },
  { icon: "🪑", num: "Mesa 2", cap: "4–6 personas · Frente a pantalla", ok: true },
  { icon: "🪑", num: "Mesa 3", cap: "4–6 personas · Zona VIP", ok: false },
  { icon: "🍺", num: "Mesa 4 — Barra", cap: "2–3 personas · Barra principal", ok: true },
  { icon: "🍺", num: "Mesa 5 — VIP", cap: "6–10 personas · Pantalla privada", ok: true },
  { icon: "🪑", num: "Mesa 6", cap: "2–4 personas · Terraza", ok: false },
];

export default function Bar() {
  return (
    <div className="page pt-nav">
      <section>
        <div className="container">
          <div className="section-eyebrow">Sport bar</div>
          <h2 className="section-title">
            Reserva tu <em>mesa post-partido</em>
          </h2>
          <p className="section-sub">
            Asegura un puesto en el mejor sport bar. Transmisiones en vivo, carta completa y
            ambiente de campeones.
          </p>
          <div className="bar-grid">
            {MESAS.map((m) => (
              <div key={m.num} className={`mesa-card ${m.ok ? "disponible" : "ocupada"}`}>
                <div className="mesa-icon">{m.icon}</div>
                <div className="mesa-num">{m.num}</div>
                <div className="mesa-cap">{m.cap}</div>
                <div className={`mesa-status ${m.ok ? "status-ok" : "status-no"}`}>
                  {m.ok ? "Disponible" : "Reservada"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
