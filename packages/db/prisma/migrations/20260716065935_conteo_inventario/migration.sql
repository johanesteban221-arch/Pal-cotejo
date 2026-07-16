-- CreateEnum
CREATE TYPE "EstadoConteo" AS ENUM ('ABIERTO', 'PENDIENTE_REVISION', 'CERRADO');

-- CreateTable
CREATE TABLE "conteos_inventario" (
    "id" TEXT NOT NULL,
    "usuarioAperturaId" TEXT NOT NULL,
    "abiertoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoConteo" NOT NULL DEFAULT 'ABIERTO',
    "usuarioRevisionId" TEXT,
    "revisadoEn" TIMESTAMP(3),
    "nota" TEXT,

    CONSTRAINT "conteos_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conteos_lineas" (
    "id" TEXT NOT NULL,
    "conteoId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "stockEsperado" INTEGER NOT NULL,
    "stockContado" INTEGER,
    "diferencia" INTEGER,
    "ajustado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "conteos_lineas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conteos_lineas_conteoId_idx" ON "conteos_lineas"("conteoId");

-- CreateIndex
CREATE UNIQUE INDEX "conteos_lineas_conteoId_productoId_key" ON "conteos_lineas"("conteoId", "productoId");

-- AddForeignKey
ALTER TABLE "conteos_lineas" ADD CONSTRAINT "conteos_lineas_conteoId_fkey" FOREIGN KEY ("conteoId") REFERENCES "conteos_inventario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteos_lineas" ADD CONSTRAINT "conteos_lineas_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
