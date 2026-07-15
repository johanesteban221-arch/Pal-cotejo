import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, RolStaff } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { ActualizarUsuarioDto, CrearUsuarioDto } from "./dto";

// Campos seguros a devolver SIEMPRE. Nunca incluye passwordHash.
const SAFE_SELECT = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  activo: true,
  creadoEn: true,
} as const;

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  /** Regla de contrasena dependiente del rol. Fuente unica (crear + reset). */
  private validarPassword(rol: RolStaff, password: string) {
    if (rol === "CAJA") {
      if (!/^\d{4}$/.test(password)) {
        throw new BadRequestException("La caja usa un PIN de 4 digitos numericos");
      }
    } else if (password.length < 6) {
      throw new BadRequestException("La contrasena debe tener al menos 6 caracteres");
    }
  }

  listar() {
    return this.prisma.usuarioStaff.findMany({
      select: SAFE_SELECT,
      orderBy: { creadoEn: "asc" },
    });
  }

  async obtener(id: string) {
    const u = await this.prisma.usuarioStaff.findUnique({ where: { id }, select: SAFE_SELECT });
    if (!u) throw new NotFoundException("Usuario no encontrado");
    return u;
  }

  async crear(dto: CrearUsuarioDto) {
    this.validarPassword(dto.rol, dto.password);
    const existe = await this.prisma.usuarioStaff.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existe) throw new ConflictException("Ya existe un usuario con ese correo");
    try {
      return await this.prisma.usuarioStaff.create({
        data: {
          nombre: dto.nombre,
          email: dto.email,
          rol: dto.rol,
          passwordHash: bcrypt.hashSync(dto.password, 10),
        },
        select: SAFE_SELECT,
      });
    } catch (e) {
      // Red de seguridad ante carreras: colision de email @unique -> 409, no 500.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException("Ya existe un usuario con ese correo");
      }
      throw e;
    }
  }

  async actualizar(id: string, dto: ActualizarUsuarioDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const objetivo = await tx.usuarioStaff.findUnique({
        where: { id },
        select: { id: true, rol: true, activo: true },
      });
      if (!objetivo) throw new NotFoundException("Usuario no encontrado");

      const desactivando = dto.activo === false && objetivo.activo;
      const degradando = dto.rol !== undefined && dto.rol !== "ADMIN" && objetivo.rol === "ADMIN";

      // Auto-proteccion: no puedes desactivarte ni degradarte a ti mismo.
      if (id === actorId && (desactivando || degradando)) {
        throw new ForbiddenException(
          "No puedes desactivarte ni cambiar tu propio rol de administrador",
        );
      }

      // Ultimo admin: la operacion no puede dejar el sistema sin admins activos.
      if ((desactivando || degradando) && objetivo.rol === "ADMIN") {
        const adminsActivos = await tx.usuarioStaff.count({ where: { rol: "ADMIN", activo: true } });
        if (adminsActivos <= 1) {
          throw new ConflictException("No puedes dejar el sistema sin administradores activos");
        }
      }

      return tx.usuarioStaff.update({
        where: { id },
        data: { nombre: dto.nombre, rol: dto.rol, activo: dto.activo },
        select: SAFE_SELECT,
      });
    });
  }

  async cambiarPassword(id: string, password: string) {
    const objetivo = await this.prisma.usuarioStaff.findUnique({
      where: { id },
      select: { rol: true },
    });
    if (!objetivo) throw new NotFoundException("Usuario no encontrado");
    this.validarPassword(objetivo.rol, password);
    await this.prisma.usuarioStaff.update({
      where: { id },
      data: { passwordHash: bcrypt.hashSync(password, 10) },
    });
    return { ok: true };
  }
}
