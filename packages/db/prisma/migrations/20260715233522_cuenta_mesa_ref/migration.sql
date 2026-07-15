-- AlterTable
ALTER TABLE "cuentas" ADD COLUMN     "mesaId" TEXT;

-- AddForeignKey
ALTER TABLE "cuentas" ADD CONSTRAINT "cuentas_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "mesas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
