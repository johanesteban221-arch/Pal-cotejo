-- CreateEnum
CREATE TYPE "EstadoSesionCaja" AS ENUM ('ABIERTA', 'CERRADA');

-- AlterTable
ALTER TABLE "cuentas" ADD COLUMN     "sesionCajaId" TEXT;

-- CreateTable
CREATE TABLE "sesiones_caja" (
    "id" TEXT NOT NULL,
    "usuarioAperturaId" TEXT NOT NULL,
    "abiertaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montoInicial" INTEGER NOT NULL,
    "estado" "EstadoSesionCaja" NOT NULL DEFAULT 'ABIERTA',
    "cerradaEn" TIMESTAMP(3),
    "usuarioCierreId" TEXT,
    "montoEsperado" INTEGER,
    "montoContado" INTEGER,
    "diferencia" INTEGER,
    "nota" TEXT,

    CONSTRAINT "sesiones_caja_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sesiones_caja_estado_idx" ON "sesiones_caja"("estado");

-- AddForeignKey
ALTER TABLE "cuentas" ADD CONSTRAINT "cuentas_sesionCajaId_fkey" FOREIGN KEY ("sesionCajaId") REFERENCES "sesiones_caja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
