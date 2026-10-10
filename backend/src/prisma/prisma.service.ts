import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma connects lazily on the first database operation. Do not eagerly call
 * `$connect()` during Nest bootstrap: a temporary database outage (or missing
 * DATABASE_URL during infrastructure setup) must not prevent the process from
 * exposing its liveness endpoint. Database availability is checked explicitly
 * by `/api/ready`, which returns 503 when the database cannot be reached.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
