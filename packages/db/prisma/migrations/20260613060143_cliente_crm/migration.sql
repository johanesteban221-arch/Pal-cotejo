/*
  Warnings:

  - Added the required column `actualizadoEn` to the `clientes` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Segmento" AS ENUM ('NUEVO', 'REGULAR', 'FRECUENTE', 'VIP', 'DORMIDO', 'RECURRENTE');

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "canchaFavorita" TEXT,
ADD COLUMN     "cumpleanos" TIMESTAMP(3),
ADD COLUMN     "equipo" TEXT,
ADD COLUMN     "horarioHabitual" TEXT,
ADD COLUMN     "segmento" "Segmento" NOT NULL DEFAULT 'NUEVO';

-- CreateIndex
CREATE INDEX "clientes_segmento_idx" ON "clientes"("segmento");
