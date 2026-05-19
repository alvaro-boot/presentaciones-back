import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const corsFromEnv = config.get<string>('CORS_ORIGIN', '*').trim();
  const allowAllOrigins =
    corsFromEnv === '*' || corsFromEnv.toLowerCase() === 'all';

  if (allowAllOrigins) {
    // Refleja el Origin de cada petición (compatible con credentials; no usar origin: '*').
    app.enableCors({ origin: true, credentials: true });
  } else {
    const corsOrigins = corsFromEnv
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    if (config.get<string>('NODE_ENV') !== 'production') {
      for (const port of ['3000', '3002', '3003']) {
        const o = `http://localhost:${port}`;
        if (!corsOrigins.includes(o)) corsOrigins.push(o);
      }
    }
    app.enableCors({
      origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
      credentials: true,
    });
  }

  const port = config.get<number>('PORT', 3001);
  await app.listen(port);
  console.log(`API COOTRAVIR propuestas en http://localhost:${port}`);
}
bootstrap();
