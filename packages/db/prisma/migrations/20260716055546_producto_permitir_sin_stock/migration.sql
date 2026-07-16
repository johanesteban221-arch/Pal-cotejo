-- AlterTable
ALTER TABLE "productos" ADD COLUMN     "permitirSinStock" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: los productos EXISTENTES conservan el comportamiento actual (permisivo,
-- se puede vender aunque el stock quede negativo). Los productos NUEVOS nacen con el
-- default false (estrictos: bloquean sin stock).
UPDATE "productos" SET "permitirSinStock" = true;
