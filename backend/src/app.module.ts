import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AgenciesModule } from './agencies/agencies.module';
import { CarsModule } from './cars/cars.module';
import { BookingsModule } from './bookings/bookings.module';
import { CustomersModule } from './customers/customers.module';
import { TasksModule } from './tasks/tasks.module';
import { DocumentsModule } from './documents/documents.module';
import { AutomationsModule } from './automations/automations.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PublicModule } from './public/public.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SaasAdminModule } from './saas-admin/saas-admin.module';
import { ContractsModule } from './contracts/contracts.module';
import { InspectionsModule } from './inspections/inspections.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { RefusalLogsModule } from './refusal-logs/refusal-logs.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { HubModule } from './hub/hub.module';
import { PdfEngineModule } from './pdf-engine/pdf-engine.module';
import { StripeModule } from './integrations/stripe/stripe.module';
import { TwilioModule } from './integrations/twilio/twilio.module';
import { PaymentsModule } from './payments/payments.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { AiVisionModule } from './ai-vision/ai-vision.module';
import { ExpensesModule } from './expenses/expenses.module';
import { SearchModule } from './common/search/search.module';
import { TrustModule } from './trust/trust.module';
import { AgencyStaffModule } from './agency-staff/agency-staff.module';
import { ConsentModule } from './consent/consent.module';
import { PortalModule } from './portal/portal.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    AgenciesModule,
    CarsModule,
    BookingsModule,
    CustomersModule,
    TasksModule,
    DocumentsModule,
    AutomationsModule,
    AnalyticsModule,
    PublicModule,
    NotificationsModule,
    SaasAdminModule,
    ContractsModule,
    InspectionsModule,
    AuditLogsModule,
    RefusalLogsModule,
    MaintenanceModule,
    HubModule,
    PdfEngineModule,
    StripeModule,
    TwilioModule,
    PaymentsModule,
    WebhooksModule,
    AiVisionModule,
    ExpensesModule,
    SearchModule,
    TrustModule,
    AgencyStaffModule,
    ConsentModule,
    PortalModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
