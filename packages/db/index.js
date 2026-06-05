// Punto de entrada del paquete @sportbar/db.
// Exporta una unica instancia de PrismaClient reutilizable por el backend.
const { PrismaClient } = require("@prisma/client");

const prisma = global.__sportbarPrisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") global.__sportbarPrisma = prisma;

module.exports = { prisma, PrismaClient };
