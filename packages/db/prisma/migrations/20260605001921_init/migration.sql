-- CreateEnum
CREATE TYPE "TipoTarifa" AS ENUM ('PICO', 'VALLE');

-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'COMPLETADA', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "OrigenReserva" AS ENUM ('WEB', 'MANUAL');

-- CreateEnum
CREATE TYPE "FrecuenciaRecurrencia" AS ENUM ('SEMANAL', 'MENSUAL');

-- CreateEnum
CREATE TYPE "MotivoBloqueo" AS ENUM ('MANTENIMIENTO', 'TORNEO', 'EVENTO_PRIVADO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'REEMBOLSADO');

-- CreateEnum
CREATE TYPE "TipoPago" AS ENUM ('ABONO', 'TOTAL', 'SALDO_CAJA');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('WOMPI_TARJETA', 'WOMPI_PSE', 'WOMPI_NEQUI', 'EFECTIVO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoReservaMesa" AS ENUM ('SOLICITADA', 'CONFIRMADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "RolStaff" AS ENUM ('ADMIN', 'CAJA');

-- CreateTable
CREATE TABLE "canchas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT,
    "descripcion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canchas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarifas" (
    "id" TEXT NOT NULL,
    "canchaId" TEXT NOT NULL,
    "diaSemana" INTEGER,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "precio" INTEGER NOT NULL,
    "tipo" "TipoTarifa" NOT NULL DEFAULT 'VALLE',
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarifas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT,
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservas" (
    "id" TEXT NOT NULL,
    "canchaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "estado" "EstadoReserva" NOT NULL DEFAULT 'PENDIENTE',
    "origen" "OrigenReserva" NOT NULL DEFAULT 'WEB',
    "montoTotal" INTEGER NOT NULL,
    "montoAbonado" INTEGER NOT NULL DEFAULT 0,
    "saldo" INTEGER NOT NULL DEFAULT 0,
    "recurrenteId" TEXT,
    "canceladaEn" TIMESTAMP(3),
    "motivoCancelacion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservas_recurrentes" (
    "id" TEXT NOT NULL,
    "canchaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "frecuencia" "FrecuenciaRecurrencia" NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "fechaInicio" DATE NOT NULL,
    "fechaFin" DATE,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservas_recurrentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bloqueos" (
    "id" TEXT NOT NULL,
    "canchaId" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "motivo" "MotivoBloqueo" NOT NULL DEFAULT 'OTRO',
    "nota" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bloqueos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" TEXT NOT NULL,
    "reservaId" TEXT NOT NULL,
    "monto" INTEGER NOT NULL,
    "tipo" "TipoPago" NOT NULL,
    "metodo" "MetodoPago" NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "referenciaPasarela" TEXT,
    "payloadPasarela" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mesas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "capacidad" INTEGER NOT NULL DEFAULT 4,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mesas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservas_mesa" (
    "id" TEXT NOT NULL,
    "mesaId" TEXT,
    "reservaId" TEXT,
    "clienteId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "hora" TEXT NOT NULL,
    "personas" INTEGER NOT NULL DEFAULT 2,
    "estado" "EstadoReservaMesa" NOT NULL DEFAULT 'SOLICITADA',
    "nota" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservas_mesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_staff" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "RolStaff" NOT NULL DEFAULT 'CAJA',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tarifas_canchaId_diaSemana_idx" ON "tarifas"("canchaId", "diaSemana");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_telefono_key" ON "clientes"("telefono");

-- CreateIndex
CREATE INDEX "reservas_canchaId_fecha_idx" ON "reservas"("canchaId", "fecha");

-- CreateIndex
CREATE INDEX "reservas_estado_idx" ON "reservas"("estado");

-- CreateIndex
CREATE INDEX "reservas_fecha_idx" ON "reservas"("fecha");

-- CreateIndex
CREATE INDEX "reservas_recurrentes_canchaId_diaSemana_idx" ON "reservas_recurrentes"("canchaId", "diaSemana");

-- CreateIndex
CREATE INDEX "bloqueos_canchaId_inicio_idx" ON "bloqueos"("canchaId", "inicio");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_referenciaPasarela_key" ON "pagos"("referenciaPasarela");

-- CreateIndex
CREATE INDEX "pagos_reservaId_idx" ON "pagos"("reservaId");

-- CreateIndex
CREATE INDEX "pagos_estado_idx" ON "pagos"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "reservas_mesa_reservaId_key" ON "reservas_mesa"("reservaId");

-- CreateIndex
CREATE INDEX "reservas_mesa_fecha_idx" ON "reservas_mesa"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_staff_email_key" ON "usuarios_staff"("email");

-- AddForeignKey
ALTER TABLE "tarifas" ADD CONSTRAINT "tarifas_canchaId_fkey" FOREIGN KEY ("canchaId") REFERENCES "canchas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_canchaId_fkey" FOREIGN KEY ("canchaId") REFERENCES "canchas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_recurrenteId_fkey" FOREIGN KEY ("recurrenteId") REFERENCES "reservas_recurrentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas_recurrentes" ADD CONSTRAINT "reservas_recurrentes_canchaId_fkey" FOREIGN KEY ("canchaId") REFERENCES "canchas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas_recurrentes" ADD CONSTRAINT "reservas_recurrentes_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueos" ADD CONSTRAINT "bloqueos_canchaId_fkey" FOREIGN KEY ("canchaId") REFERENCES "canchas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "reservas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas_mesa" ADD CONSTRAINT "reservas_mesa_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "mesas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas_mesa" ADD CONSTRAINT "reservas_mesa_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "reservas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas_mesa" ADD CONSTRAINT "reservas_mesa_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
