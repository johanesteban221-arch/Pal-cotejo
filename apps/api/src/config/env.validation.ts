import * as Joi from "joi";

/**
 * Validación de variables de entorno al arranque. Si falta algo crítico, la API
 * falla de inmediato con un mensaje claro en vez de romperse en runtime.
 *
 * Adaptado a PAL COTEJO: solo DATABASE_URL y JWT_SECRET son obligatorias.
 * Wompi está en pausa (Fase 2) y no usamos Redis → esos campos son opcionales.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "production", "test").default("development"),
  PORT: Joi.number().optional(),
  API_PORT: Joi.number().optional(),

  // Obligatorias
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),

  // Opcionales (con valores por defecto donde aplica)
  JWT_EXPIRES_IN: Joi.string().optional(),
  DEFAULT_DEPOSIT_PERCENT: Joi.number().optional(),
  N8N_INTEGRATION_KEY: Joi.string().optional(),
  N8N_WEBHOOK_RESERVA_CONFIRMADA: Joi.string().uri().optional().allow(""),
  N8N_WEBHOOK_CAMPANA: Joi.string().uri().optional().allow(""),

  // Pasarela de pagos: opcionales hasta que el cliente defina la pasarela (Fase 2)
  WOMPI_PUBLIC_KEY: Joi.string().optional().allow(""),
  WOMPI_PRIVATE_KEY: Joi.string().optional().allow(""),
  WOMPI_EVENTS_SECRET: Joi.string().optional().allow(""),
  WOMPI_INTEGRITY_SECRET: Joi.string().optional().allow(""),
  WOMPI_BASE_URL: Joi.string().uri().optional().allow(""),
});
