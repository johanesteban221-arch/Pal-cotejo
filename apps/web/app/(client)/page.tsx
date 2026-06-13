import Link from "next/link";
import FieldBackground from "../../components/FieldBackground";

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="field-bg" />
        <FieldBackground />
        <div className="hero-noise" />
        <div className="hero-content">
          <div className="hero-eyebrow">Cancha de fútbol · Sport bar</div>
          <h1 className="hero-title">
            PAL COTEJO
            <span>Bogotá, Colombia</span>
          </h1>
          <p className="hero-sub">
            Reserva tu cancha sintética en segundos. Juega, celebra y quédate en el mejor sport
            bar de la ciudad.
          </p>
          <div className="hero-actions">
            <Link className="btn-gold" href="/reservar">
              Reservar cancha
            </Link>
            <Link className="btn-outline" href="/bar">
              Ver sport bar
            </Link>
          </div>
        </div>
        <div className="hero-stats">
          <div>
            <div className="stat-n">1</div>
            <div className="stat-l">Cancha</div>
          </div>
          <div>
            <div className="stat-n">500+</div>
            <div className="stat-l">Partidos al mes</div>
          </div>
          <div>
            <div className="stat-n">4.9★</div>
            <div className="stat-l">Calificación</div>
          </div>
          <div>
            <div className="stat-n">24/7</div>
            <div className="stat-l">Reservas online</div>
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-logo">PAL COTEJO</div>
        <div className="footer-tagline">Cancha de Fútbol &amp; Sport Bar · Bogotá, Colombia</div>
        <div className="footer-links">
          <Link href="/reservar">Reservar</Link>
          <Link href="/bar">Sport bar</Link>
          <a href="#">Instagram</a>
          <a href="#">WhatsApp</a>
        </div>
        <div className="footer-copy">© 2026 Pal Cotejo — Todos los derechos reservados</div>
      </footer>
    </>
  );
}
