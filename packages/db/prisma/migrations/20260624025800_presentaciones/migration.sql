-- AlterTable
ALTER TABLE "productos" ADD COLUMN     "stockBaseId" TEXT,
ADD COLUMN     "unidades" INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_stockBaseId_fkey" FOREIGN KEY ("stockBaseId") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
