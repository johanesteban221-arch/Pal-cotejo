// Campo de fútbol SVG que se "dibuja" al cargar (elemento signature del diseño).
// Copiado exacto de pal-cotejo-ui.html.
export default function FieldBackground() {
  return (
    <svg className="field-svg" viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice">
      <rect className="field-line" x="120" y="80" width="1200" height="640" rx="4" />
      <line className="field-line" x1="720" y1="80" x2="720" y2="720" />
      <circle className="field-line" cx="720" cy="400" r="90" />
      <circle className="field-line" cx="720" cy="400" r="6" />
      <rect className="field-line" x="120" y="270" width="140" height="260" />
      <rect className="field-line" x="1180" y="270" width="140" height="260" />
      <rect className="field-line" x="120" y="320" width="60" height="160" />
      <rect className="field-line" x="1260" y="320" width="60" height="160" />
      <path className="field-line" d="M260,270 A 120 120 0 0 0 260,530" />
      <path className="field-line" d="M1180,270 A 120 120 0 0 1 1180,530" />
    </svg>
  );
}
