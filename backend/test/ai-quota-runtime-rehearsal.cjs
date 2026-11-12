/**
 * Manual isolated-database concurrency rehearsal.
 * DANGER GUARD: refuses any URL that does not explicitly name this scratch DB.
 *
 * Never point at a real agency, staging or production DB.
 * The script expects the scratch DB schema created by the documented runbook.
 * Usage: AI_QUOTA_TEST_DATABASE_URL=postgres://.../carhub_ai_phase1d_scratch_20261112
 *        node -r ts-node/register/transpile-only test/ai-quota-runtime-rehearsal.cjs
 */
const assert = require('node:assert/strict');

const uri = process.env.AI_QUOTA_TEST_DATABASE_URL || '';
const parsed = new URL(uri);
if (parsed.pathname !== '/carhub_ai_phase1d_scratch_20261112') {
  throw new Error('Only the disposable, exact-name AI quota scratch database is permitted');
}
process.env.DATABASE_URL = uri;

const { PrismaClient } = require('@prisma/client');
const { AiQuotaService } = require('../src/ai-operations/ai-quota.service');

async function main() {
  const prisma = new PrismaClient();
  const governance = { getSettings: async () => ({
    effectiveEnabled: true,
    revision: 1,
  }) };
  const quota = new AiQuotaService(prisma, governance);
  try {
    const now = new Date();
    const A = 'tenant-a';
    const B = 'tenant-b';

    // Real database row-lock serializes a pair of concurrent same-key retries.
    const repeat = await Promise.all([
      quota.reserveInternal(A, 'same-key-00001', 4000, now),
      quota.reserveInternal(A, 'same-key-00001', 4000, now),
    ]);
    assert.equal(repeat[0].id, repeat[1].id);
    assert.equal((await quota.getSummary(A, now)).heldRequests, 1);

    // Parallel requests contend on the same monthly row and quota.
    const contested = await Promise.allSettled([
      quota.reserveInternal(A, 'parallel-00002', 5000, now),
      quota.reserveInternal(A, 'parallel-00003', 5000, now),
    ]);
    assert.equal(contested.filter((value) => value.status === 'fulfilled').length, 1);
    assert.equal(contested.filter((value) => value.status === 'rejected').length, 1);
    let summary = await quota.getSummary(A, now);
    assert.equal(summary.heldRequests, 2);
    assert.equal(summary.heldCostUsdMicros, 9000);
    assert.ok(summary.heldCostUsdMicros <= summary.monthlyBudgetUsdMicros);

    const winningKey = contested[0].status === 'fulfilled'
      ? 'parallel-00002' : 'parallel-00003';

    // Exactly one record is created by a settled, future provider receipt.
    const details = {
      provider: 'synthetic-test-provider',
      model: 'synthetic-test-model',
      actualCostUsdMicros: 3000,
      inputTokens: 20,
      outputTokens: 10,
    };
    await quota.commitVerifiedInternal(A, 'same-key-00001', details, now);
    await quota.commitVerifiedInternal(A, 'same-key-00001', details, now);
    summary = await quota.getSummary(A, now);
    assert.equal(summary.heldRequests, 1);
    assert.equal(summary.committedRequests, 1);
    assert.equal(summary.heldCostUsdMicros, 5000);
    assert.equal(summary.committedCostUsdMicros, 3000);

    // Releasing an unspent hold is idempotent and doesn't erase actual spend.
    await quota.releaseInternal(A, winningKey, now);
    await quota.releaseInternal(A, winningKey, now);
    summary = await quota.getSummary(A, now);
    assert.equal(summary.heldRequests, 0);
    assert.equal(summary.committedRequests, 1);
    assert.equal(summary.committedCostUsdMicros, 3000);

    // Same request key from another tenant is an independent record.
    await quota.reserveInternal(B, 'same-key-00001', 4000, now);
    assert.equal((await quota.getSummary(B, now)).heldRequests, 1);
    assert.equal((await quota.getSummary(A, now)).heldRequests, 0);

    // Never accept requests via the real, still-disabled provider gate.
    const blocked = new AiQuotaService(prisma, {
      getSettings: async () => ({ effectiveEnabled: false, revision: 1 }),
    });
    await assert.rejects(
      () => blocked.reserveInternal(A, 'disabled-00001', 1000, now),
      /not enabled/,
    );

    const recorded = await prisma.aiUsageRecord.findMany({
      where: { agencyId: A },
    });
    assert.equal(recorded.length, 1);
    assert.equal(recorded[0].costUsdMicros, 3000);
    assert.ok(recorded.every((r) => r.requestKey === 'same-key-00001'));
    console.log('PASS: real PostgreSQL concurrency, idempotency, tenant isolation, caps, settlement, release and off-gate');
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((err) => {
  console.error('FAIL: isolated quota rehearsal:', err.message);
  process.exitCode = 1;
});
