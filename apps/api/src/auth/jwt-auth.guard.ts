import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { PrismaService } from "../prisma/prisma.service";

/** Exige un Bearer token JWT válido. Adjunta el payload a request.user. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Rutas marcadas como @Public() no requieren token
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const auth: string | undefined = req.headers["authorization"];
    if (!auth || !auth.startsWith("Bearer ")) {
      throw new UnauthorizedException("Token no proporcionado");
    }
    const token = auth.slice(7);
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException("Token inválido o expirado");
    }
    // Validacion en vivo: el rol y el estado se leen de la DB en cada request,
    // no del token. Asi, desactivar o cambiar el rol de un usuario tiene efecto
    // inmediato sin esperar a que expire el JWT.
    const usuario = await this.prisma.usuarioStaff.findUnique({
      where: { id: payload.sub },
      select: { id: true, nombre: true, email: true, rol: true, activo: true },
    });
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException("Usuario inactivo o inexistente");
    }
    req.user = {
      sub: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    };
    return true;
  }
}
