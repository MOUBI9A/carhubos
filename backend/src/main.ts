import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { validateEnvironment } from './config/environment';
import { DecimalToNumberInterceptor } from './common/interceptors/decimal-to-number.interceptor';

async function bootstrap() {
  validateEnvironment(process.env);
  // rawBody: true captures the raw request body (req.rawBody) alongside the
  // normal parsed body — required to verify payment-gateway webhook signatures
  // (e.g. Stripe). Additive: existing @Body() parsing is unaffected.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.enableShutdownHooks();
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());
  // Serialise Prisma.Decimal money fields as JS numbers (preserve API contract).
  app.useGlobalInterceptors(new DecimalToNumberInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()) || [
      'http://localhost:3000',
      'http://localhost:3002',
    ],
    credentials: true,
  });
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 5406);
}
bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
