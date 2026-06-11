import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

/**
 * Protege los endpoints de integración con n8n mediante una API key estática
 * enviada en el header `x-api-key`.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const key = req.headers["x-api-key"];
    const esperada = process.env.N8N_INTEGRATION_KEY;
    if (!esperada || key !== esperada) {
      throw new UnauthorizedException("API key inválida");
    }
    return true;
  }
}
