import { PrismaService } from '../prisma/prisma.service';
import { VaultStorageService } from '../vault/vault-storage.service';
import { GuardianVideoCleanupService } from './guardian-video-cleanup.service';

/**
 * Standalone, privileged cleanup command for a *dedicated scheduled runner*.
 * This is never exposed as an HTTP route and is disabled unless explicitly
 * enabled. Dry-run is the default even after enablement.
 *
 *   GUARDIAN_ORPHAN_SWEEP_ENABLED=true node dist/guardian/guardian-video-cleanup.cli.js
 *   GUARDIAN_ORPHAN_SWEEP_ENABLED=true node dist/guardian/guardian-video-cleanup.cli.js --apply
 */
async function main() {
  if (process.env.GUARDIAN_ORPHAN_SWEEP_ENABLED !== 'true') {
    console.log('Guardian orphan cleanup: disabled (no changes).');
    return;
  }
  const apply = process.argv.includes('--apply');
  if (
    !process.env.DATABASE_URL ||
    !process.env.SUPABASE_URL ||
    !(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
  ) {
    throw new Error('Guardian cleanup requires explicit database and private storage configuration.');
  }

  const db = new PrismaService();
  try {
    await db.$connect();
    const cleanup = new GuardianVideoCleanupService(db, new VaultStorageService());
    const summary = await cleanup.sweep({ dryRun: !apply });
    console.log('Guardian orphan cleanup', JSON.stringify(summary));
    if (summary.failed) process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  main().catch(() => {
    // Avoid printing provider errors, environment variables, tokens or paths.
    console.error('Guardian orphan cleanup failed. Inspect secure runner diagnostics.');
    process.exitCode = 1;
  });
}
