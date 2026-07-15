import { Body, Controller, Get, Post, Req, UseGuards, HttpCode } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { Public } from "./public.decorator";
import { Throttle } from "@nestjs/throttler";
import { EmailThrottlerGuard } from "./email-throttler.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  // Rate limit SOLO aqui: 5 intentos / 60s por email; al superar, 429 y bloqueo 5 min.
  @UseGuards(EmailThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000, blockDuration: 300000 } })
  @Post("login")
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  /** Devuelve el usuario del token actual (para validar sesión en el frontend). */
  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@Req() req: any) {
    return req.user;
  }
}
