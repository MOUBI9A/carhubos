import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { DecimalToNumberInterceptor } from './common/interceptors/decimal-to-number.interceptor';
import {
  requestIdMiddleware,
  RequestWithId,
} from './common/middleware/request-id.middleware';

async function bootstrap() {
  // rawBody: true captures the raw request body (req.rawBody) alongside the
  // normal parsed body — required to verify payment-gateway webhook signatures
  // (e.g. Stripe). Additive: existing @Body() parsing is unaffected.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const requestLogger = new Logger('HTTP');

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.use(requestIdMiddleware);
  app.use((req: RequestWithId, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      requestLogger.log(
        JSON.stringify({
          event: 'http_request',
          requestId: req.requestId,
          method: req.method,
          // Express `path` intentionally excludes the query string. Query
          // parameters can contain credentials/tokens (for example Vercel's
          // `_vercel_share` bypass token) and must never be copied into logs.
          path: req.path,
          statusCode: res.statusCode,
          durationMs: Date.now() - startedAt,
        }),
      );
    });
    next();
  });
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
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3002',
    ],
    credentials: true,
  });
  app.setGlobalPrefix('api');

  // Vercel Containers send SIGTERM during scale-down and replacement. Let
  // Nest close providers/connections cleanly instead of looking like a crash.
  app.enableShutdownHooks(['SIGTERM', 'SIGINT']);

  await app.listen(process.env.PORT ?? 5406);
}
bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
