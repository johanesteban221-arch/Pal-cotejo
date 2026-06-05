import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  app.enableCors(); // ajustar origenes en produccion
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // En la nube (Render/Railway) el puerto llega por PORT; en local usamos API_PORT.
  const port = process.env.PORT || process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`API escuchando en http://localhost:${port}/api`);
}
bootstrap();
