-- CreateEnum
CREATE TYPE "CategoriaProducto" AS ENUM ('BEBIDA', 'COMIDA', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoCuenta" AS ENUM ('ABIERTA', 'PAGADA', 'ANULADA');

-- AlterTable
ALTER TABLE "clientes" ALTER COLUMN "actualizadoEn" DROP DEFAULT;

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" "CategoriaProducto" NOT NULL DEFAULT 'BEBIDA',
    "precio" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuentas" (
    "id" TEXT NOT NULL,
    "mesa" TEXT,
    "reservaId" TEXT,
    "clienteId" TEXT,
    "estado" "EstadoCuenta" NOT NULL DEFAULT 'ABIERTA',
    "total" INTEGER NOT NULL DEFAULT 0,
    "metodoPago" TEXT,
    "abiertaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradaEn" TIMESTAMP(3),

    CONSTRAINT "cuentas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items_cuenta" (
    "id" TEXT NOT NULL,
    "cuentaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "precioUnit" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,

    CONSTRAINT "items_cuenta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "productos_categoria_idx" ON "productos"("categoria");

-- CreateIndex
CREATE INDEX "cuentas_estado_idx" ON "cuentas"("estado");

-- CreateIndex
CREATE INDEX "cuentas_abiertaEn_idx" ON "cuentas"("abiertaEn");

-- CreateIndex
CREATE INDEX "items_cuenta_cuentaId_idx" ON "items_cuenta"("cuentaId");

-- AddForeignKey
ALTER TABLE "cuentas" ADD CONSTRAINT "cuentas_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "reservas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas" ADD CONSTRAINT "cuentas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_cuenta" ADD CONSTRAINT "items_cuenta_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "cuentas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_cuenta" ADD CONSTRAINT "items_cuenta_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
