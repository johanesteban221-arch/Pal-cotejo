import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

/**
 * Rate limiting del login keyed por EMAIL (no por IP), para que varios cajeros
 * detras de la misma IP del local no se bloqueen entre si. Fallback a IP si el
 * email viene vacio/ausente. Mensaje 429 en espanol.
 */
@Injectable()
export class EmailThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const email =
      typeof req?.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    return email || req.ip;
  }

  protected async getErrorMessage(): Promise<string> {
    return "Demasiados intentos de inicio de sesión. Espera un momento e intenta de nuevo.";
  }
}
