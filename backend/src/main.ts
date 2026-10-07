import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { DecimalToNumberInterceptor } from './common/interceptors/decimal-to-number.interceptor';

async function bootstrap() {
  console.log('[Bootstrap] 1. Initializing Nest application...');
  const app = await NestFactory.create(AppModule, { rawBody: true });
  console.log('[Bootstrap] 2. Nest application created.');

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new DecimalToNumberInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  console.log('[Bootstrap] 3. Global middleware & pipes configured.');

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
    ],
    credentials: true,
  });
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 5406;
  console.log(`[Bootstrap] 4. Starting HTTP server on port ${port}...`);
  await app.listen(port);
  console.log(`🚀 CarHub OS Backend listening on http://localhost:${port}/api`);
}
bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
