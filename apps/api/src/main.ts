import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet()); // headers de seguridad HTTP
  app.setGlobalPrefix("api");
  // CORS: allowlist por variable de entorno. CORS_ORIGINS = lista de origenes
  // separados por comas. VACIO/no definida => modo ABIERTO (refleja cualquier
  // origen) para no romper ningun front durante la transicion. La auth es
  // Bearer token (sin cookies), por eso NO habilitamos credentials.
  const corsOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const corsMethods = ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"];
  if (corsOrigins.length > 0) {
    app.enableCors({ origin: corsOrigins, methods: corsMethods });
  } else {
    console.warn(
      "⚠️  CORS en modo ABIERTO: CORS_ORIGINS no definida; se permiten TODOS los origenes. " +
        "Define CORS_ORIGINS (lista separada por comas) en produccion para restringir.",
    );
    app.enableCors({ origin: true, methods: corsMethods });
  }
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new LoggingInterceptor()); // logs estructurados
  // En la nube (Render/Railway) el puerto llega por PORT; en local usamos API_PORT.
  const port = process.env.PORT || process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`API escuchando en http://localhost:${port}/api`);
}
bootstrap();
