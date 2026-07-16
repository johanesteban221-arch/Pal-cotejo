// Módulos futuros (roadmap visible en el panel). Puro contenido informativo:
// NO hay backend ni datos detrás — solo pantallas "En desarrollo" para ADMIN.
export interface ModuloFuturo {
  slug: string;
  icono: string;
  titulo: string;
  descripcion: string;
  features: string[];
}

export const MODULOS_FUTUROS: ModuloFuturo[] = [
  {
    slug: "contabilidad",
    icono: "📊",
    titulo: "Contabilidad",
    descripcion: "Reportes financieros y control de ingresos y gastos.",
    features: [
      "Estado de resultados (ingresos vs gastos)",
      "Control de gastos del negocio",
      "Conciliación con la caja del POS",
      "Exportar a Excel",
      "Cálculo de impuestos",
    ],
  },
  {
    slug: "reportes",
    icono: "📈",
    titulo: "Reportes y Análisis",
    descripcion: "Inteligencia de negocio para decisiones.",
    features: [
      "Ventas por día, producto y hora",
      "Rentabilidad por producto",
      "Ocupación de canchas",
      "Horas pico del negocio",
      "Comparativas entre períodos",
    ],
  },
  {
    slug: "chatbot",
    icono: "💬",
    titulo: "Chatbot WhatsApp",
    descripcion: "Atención y reservas automáticas por WhatsApp.",
    features: [
      "Responde dudas 24/7",
      "Toma reservas por chat",
      "Confirma disponibilidad en tiempo real",
      "Envía recordatorios de juego",
      "Comparte la carta del bar",
    ],
  },
  {
    slug: "reservas-online",
    icono: "🌐",
    titulo: "Reservas Online",
    descripcion: "Portal para que los clientes reserven cancha desde su celular.",
    features: [
      "Ver disponibilidad en vivo",
      "Reservar y pagar online",
      "Elegir horario desde el celular",
      "Confirmación automática",
    ],
  },
  {
    slug: "fidelizacion",
    icono: "⭐",
    titulo: "Fidelización",
    descripcion: "Programa de puntos y clientes frecuentes.",
    features: [
      "Puntos por consumo",
      "Recompensas canjeables",
      "Promociones automáticas",
      "Saludo y promo de cumpleaños",
      "Niveles de cliente",
    ],
  },
  {
    slug: "compras",
    icono: "🛒",
    titulo: "Compras y Proveedores",
    descripcion: "Gestión de compras y control de costos.",
    features: [
      "Órdenes de compra",
      "Entrada de mercancía al inventario",
      "Directorio de proveedores",
      "Costos por producto",
      "Márgenes reales de ganancia",
    ],
  },
];

export function moduloPorSlug(slug: string): ModuloFuturo | undefined {
  return MODULOS_FUTUROS.find((m) => m.slug === slug);
}
