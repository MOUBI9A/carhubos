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

  /**
   * Liveness Probe: Quick check that the process is alive and taking traffic.
   */
  @Get('health')
  health() {
    return {
      status: 'ok',
      version: '1.0.0-pilot',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness Probe: Verifies core infrastructure dependencies (e.g. PostgreSQL)
   * before directing traffic from a load balancer / orchestrator.
   */
  @Get('health/readiness')
  async readiness() {
    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const dbLatencyMs = Date.now() - dbStart;

      const memoryUsage = process.memoryUsage();

      return {
        status: 'ok',
        database: {
          status: 'connected',
          latencyMs: dbLatencyMs,
        },
        memory: {
          heapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
          heapTotalMb: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
          rssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
        },
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      throw new ServiceUnavailableException({
        status: 'degraded',
        database: {
          status: 'disconnected',
          error: err?.message || 'Database unreachable',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
