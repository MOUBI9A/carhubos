import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /** Liveness probe: proves the Nest process can answer HTTP. */
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'fider-api',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe: proves the API can also reach its primary database.
   * Orchestrators should gate traffic on this endpoint rather than /health.
   */
  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ready',
        service: 'fider-api',
        database: 'reachable',
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        service: 'fider-api',
        database: 'unreachable',
      });
    }
  }
}
