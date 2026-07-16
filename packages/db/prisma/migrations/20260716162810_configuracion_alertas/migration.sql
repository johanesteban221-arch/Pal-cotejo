-- CreateEnum
CREATE TYPE "TipoAlerta" AS ENUM ('CAJA_CERRADA', 'CONTEO_DIFERENCIAS', 'RESERVA_NUEVA', 'STOCK_BAJO', 'VENTA_ANULADA');

-- CreateTable
CREATE TABLE "configuracion_alertas" (
    "tipo" "TipoAlerta" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "modo" TEXT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_alertas_pkey" PRIMARY KEY ("tipo")
);

-- Filas base: una por cada tipo de alerta, todas desactivadas (el dueño las activa).
-- CAJA_CERRADA arranca en modo SOLO_DESCUADRE (el caso más útil); el resto sin modo.
INSERT INTO "configuracion_alertas" ("tipo", "activo", "modo", "actualizadoEn") VALUES
    ('CAJA_CERRADA',       false, 'SOLO_DESCUADRE', now()),
    ('CONTEO_DIFERENCIAS', false, NULL,             now()),
    ('RESERVA_NUEVA',      false, NULL,             now()),
    ('STOCK_BAJO',         false, NULL,             now()),
    ('VENTA_ANULADA',      false, NULL,             now())
ON CONFLICT ("tipo") DO NOTHING;
