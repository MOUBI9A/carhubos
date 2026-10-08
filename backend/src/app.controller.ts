import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private readonly prisma: PrismaService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
  @Get('ready')
  async ready() {
    try {
      // Both server-side timeout and interactive transaction bounds prevent a
      // stalled database probe from occupying connections indefinitely.
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '1000ms'");
        await tx.$queryRaw`SELECT 1`;
      }, { maxWait: 1000, timeout: 1500 });
      return { status: 'ok', database: 'up' };
    } catch {
      throw new ServiceUnavailableException({ status: 'unavailable', database: 'down' });
    }
  }
}
