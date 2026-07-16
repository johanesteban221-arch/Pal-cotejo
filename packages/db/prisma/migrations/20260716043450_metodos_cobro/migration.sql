-- CreateEnum
CREATE TYPE "TipoVerificacion" AS ENUM ('CAJON', 'COMPROBANTE');

-- CreateTable
CREATE TABLE "metodos_cobro" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "verificacion" "TipoVerificacion" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER,

    CONSTRAINT "metodos_cobro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "metodos_cobro_codigo_key" ON "metodos_cobro"("codigo");

-- Seed de datos base (idempotente). EFECTIVO se cuadra por cajón; el resto por comprobante.
-- Los codigo coinciden con los valores ya guardados en cuentas.metodoPago (EFECTIVO, OTRO).
INSERT INTO "metodos_cobro" ("id", "nombre", "codigo", "verificacion", "activo", "orden") VALUES
    ('mcb_efectivo', 'Efectivo', 'EFECTIVO', 'CAJON',       true, 1),
    ('mcb_tarjeta',  'Tarjeta',  'TARJETA',  'COMPROBANTE', true, 2),
    ('mcb_otro',     'Otro',     'OTRO',     'COMPROBANTE', true, 3)
ON CONFLICT ("codigo") DO NOTHING;
