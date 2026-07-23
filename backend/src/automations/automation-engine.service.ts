import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Context threaded from the trigger site into a dispatched action. */
export interface AutomationContext {
  /** Short subject appended to a generated task title (e.g. a licence plate). */
  subject?: string;
  /** Body for a generated task. */
  detail?: string;
}

/**
 * Actions the engine will auto-dispatch TODAY. Everything else in the
 * AUTOMATION_ACTIONS vocabulary is recognised but deliberately not executed:
 * SEND_WHATSAPP_NUDGE / SEND_EMAIL drive live external sends, and
 * NOTIFY_OWNER / GENERATE_INVOICE / HARD_LOCK_ASSET drive notifications with no
 * backing model or mutate financial/asset state. Firing those from user-authored
 * rules needs its own safety review (recipients, rate limits, idempotency on
 * money) that this first execution increment does not cover — so a rule that
 * references them is logged as "deferred", never silently dropped and never run.
 */
const AUTO_DISPATCHED_ACTIONS = new Set<string>(['CREATE_MAINTENANCE_TASK']);

/**
 * Executes user-defined AutomationRule rows when a trigger fires. Mirrors
 * webhooks.trigger's contract — load the agency's active rules for the trigger,
 * dispatch each action, and NEVER throw into the caller: a failing rule is
 * logged and the rest continue, so automation can never break the flow that
 * fired it.
 *
 * Depends only on PrismaService (a leaf), so it can be injected anywhere —
 * including request-path services later (e.g. bookings for BOOKING_CREATED) —
 * with no circular-dependency risk.
 */
@Injectable()
export class AutomationEngine {
  private readonly logger = new Logger(AutomationEngine.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluate one agency's active rules for `trigger` and dispatch their actions.
   * Tenant-scoped (agencyId is in the WHERE). Returns per-run counts so callers
   * and tests can assert what happened.
   */
  async runTrigger(
    agencyId: string,
    trigger: string,
    context: AutomationContext = {},
  ): Promise<{ matched: number; dispatched: number; deferred: number }> {
    const rules = await this.prisma.automationRule.findMany({
      where: { agencyId, trigger, isActive: true },
    });

    let dispatched = 0;
    let deferred = 0;

    for (const rule of rules) {
      try {
        if (AUTO_DISPATCHED_ACTIONS.has(rule.action)) {
          await this.dispatch(agencyId, rule, context);
          dispatched++;
        } else {
          this.logger.log(
            `Rule "${rule.name}" (${trigger} -> ${rule.action}) matched but ` +
              `${rule.action} is not auto-dispatched yet — deferred (no side effect).`,
          );
          deferred++;
        }
      } catch (err) {
        // One bad rule (or a transient DB error) must never break the caller's
        // flow — mirror webhooks.trigger: log and carry on.
        this.logger.error(
          `Automation rule "${rule.name}" failed: ${(err as Error).message}`,
        );
      }
    }

    return { matched: rules.length, dispatched, deferred };
  }

  private async dispatch(
    agencyId: string,
    rule: { name: string; action: string },
    context: AutomationContext,
  ): Promise<void> {
    switch (rule.action) {
      case 'CREATE_MAINTENANCE_TASK':
        await this.createTaskOnce(agencyId, rule, context);
        return;
      default:
        // Unreachable while AUTO_DISPATCHED_ACTIONS gates entry — guards a future
        // edit that adds an action to the set without a handler.
        this.logger.warn(`No dispatcher implemented for action ${rule.action}`);
    }
  }

  /**
   * Create a task for the rule, de-duplicated: if an open (PENDING/IN_PROGRESS)
   * task with the same title already exists for this agency, skip it — so a
   * daily/hourly cron re-firing the same rule doesn't stack identical tasks.
   */
  private async createTaskOnce(
    agencyId: string,
    rule: { name: string },
    context: AutomationContext,
  ): Promise<void> {
    const title = `Automation: ${rule.name}${
      context.subject ? ` — ${context.subject}` : ''
    }`;

    const existing = await this.prisma.task.findFirst({
      where: { agencyId, title, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      select: { id: true },
    });
    if (existing) {
      return;
    }

    await this.prisma.task.create({
      data: {
        title,
        description:
          context.detail ?? `Auto-created by automation rule "${rule.name}".`,
        priority: 'MEDIUM',
        status: 'PENDING',
        agencyId,
      },
    });
  }
}
