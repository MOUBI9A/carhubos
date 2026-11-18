import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const EXCEPTION_EXPIRY_UTC = '2026-12-02T23:59:59Z';
export const APPROVED_ADVISORY_ID = 'GHSA-fc5q-39xc-vjpf';
export const APPROVED_ADVISORY_SOURCE = 1247710;
export const EXPECTED_NODE_PATH = 'node_modules/@parcel/watcher/node_modules/picomatch';
export const EXPECTED_PARENT_NODE = 'node_modules/@parcel/watcher';

export function checkExpiry(nowMs = Date.now()) {
  const expiryMs = Date.parse(EXCEPTION_EXPIRY_UTC);
  if (Number.isNaN(expiryMs)) {
    throw new Error(`Invalid EXCEPTION_EXPIRY_UTC format: ${EXCEPTION_EXPIRY_UTC}`);
  }
  if (nowMs > expiryMs) {
    throw new Error(
      `Dependency exception expired at ${EXCEPTION_EXPIRY_UTC} (current: ${new Date(nowMs).toISOString()})`
    );
  }
}

export function checkNextConfig(content) {
  if (!content || typeof content !== 'string') {
    throw new Error('next.config.ts content is missing or unreadable');
  }
  if (/extract|messages/i.test(content)) {
    throw new Error(
      'Potential next-intl message extraction/watcher configuration detected in next.config.ts'
    );
  }
}

export function checkLockfile(lockfile) {
  if (!lockfile || typeof lockfile !== 'object' || !lockfile.packages) {
    throw new Error('Lockfile is invalid or missing packages property');
  }
  const nextIntl = lockfile.packages['node_modules/next-intl'];
  const parcelWatcher = lockfile.packages['node_modules/@parcel/watcher'];
  const picomatch =
    lockfile.packages['node_modules/@parcel/watcher/node_modules/picomatch'];

  if (!nextIntl || nextIntl.version !== '4.13.2') {
    throw new Error(
      `Lockfile version drift: expected next-intl@4.13.2, got ${nextIntl?.version}`
    );
  }
  if (!parcelWatcher || parcelWatcher.version !== '2.5.6') {
    throw new Error(
      `Lockfile version drift: expected @parcel/watcher@2.5.6, got ${parcelWatcher?.version}`
    );
  }
  if (!picomatch || picomatch.version !== '4.0.5') {
    throw new Error(
      `Lockfile version drift: expected picomatch@4.0.5, got ${picomatch?.version}`
    );
  }
}

export function validateAuditReport(auditJson) {
  if (!auditJson || typeof auditJson !== 'object') {
    throw new Error('Malformed audit output: not a JSON object');
  }
  if (auditJson.auditReportVersion !== 2) {
    throw new Error(
      `Unsupported audit report version: ${auditJson.auditReportVersion}`
    );
  }
  const meta = auditJson.metadata?.vulnerabilities;
  if (!meta) {
    throw new Error('Malformed audit output: missing metadata.vulnerabilities');
  }
  if (meta.critical > 0) {
    throw new Error(
      `Audit failed: ${meta.critical} critical vulnerability found`
    );
  }
  if (meta.high !== 2) {
    throw new Error(
      `Audit failed: expected exactly 2 high vulnerabilities (picomatch + @parcel/watcher), got ${meta.high}`
    );
  }

  const vulns = auditJson.vulnerabilities;
  if (!vulns || typeof vulns !== 'object') {
    throw new Error('Malformed audit output: missing vulnerabilities object');
  }

  const packageNames = Object.keys(vulns);
  for (const pkg of packageNames) {
    if (pkg !== 'picomatch' && pkg !== '@parcel/watcher') {
      throw new Error(`Unexpected vulnerability in package ${pkg}`);
    }
  }

  const pico = vulns['picomatch'];
  if (!pico || pico.severity !== 'high') {
    throw new Error('Missing or invalid picomatch vulnerability entry');
  }
  if (!Array.isArray(pico.nodes) || !pico.nodes.includes(EXPECTED_NODE_PATH)) {
    throw new Error(
      `picomatch node path drift: expected ${EXPECTED_NODE_PATH}, got ${JSON.stringify(pico.nodes)}`
    );
  }
  if (!Array.isArray(pico.via) || pico.via.length !== 1) {
    throw new Error(
      `Unexpected picomatch via entries: ${JSON.stringify(pico.via)}`
    );
  }
  const via = pico.via[0];
  if (
    typeof via !== 'object' ||
    (via.source !== APPROVED_ADVISORY_SOURCE &&
      via.url !== `https://github.com/advisories/${APPROVED_ADVISORY_ID}`)
  ) {
    throw new Error(
      `Unapproved advisory for picomatch: ${JSON.stringify(via)}`
    );
  }

  const watcher = vulns['@parcel/watcher'];
  if (!watcher || watcher.severity !== 'high') {
    throw new Error('Missing or invalid @parcel/watcher vulnerability entry');
  }
  if (
    !Array.isArray(watcher.nodes) ||
    !watcher.nodes.includes(EXPECTED_PARENT_NODE)
  ) {
    throw new Error(
      `@parcel/watcher node path drift: expected ${EXPECTED_PARENT_NODE}, got ${JSON.stringify(watcher.nodes)}`
    );
  }
  if (
    !Array.isArray(watcher.via) ||
    watcher.via.length !== 1 ||
    watcher.via[0] !== 'picomatch'
  ) {
    throw new Error(
      `Unexpected @parcel/watcher via entries: ${JSON.stringify(watcher.via)}`
    );
  }

  return {
    allowed: true,
    advisory: APPROVED_ADVISORY_ID,
    expiry: EXCEPTION_EXPIRY_UTC,
    matchedPackages: ['picomatch', '@parcel/watcher'],
  };
}

export function runAudit(options = {}) {
  const cwd = options.cwd || process.cwd();
  checkExpiry(options.nowMs);

  const nextConfigPath = resolve(cwd, 'next.config.ts');
  const nextConfigContent =
    options.nextConfigContent ?? readFileSync(nextConfigPath, 'utf8');
  checkNextConfig(nextConfigContent);

  const lockfilePath = resolve(cwd, 'package-lock.json');
  const lockfile =
    options.lockfile ?? JSON.parse(readFileSync(lockfilePath, 'utf8'));
  checkLockfile(lockfile);

  // Capture dependency tree evidence
  const treeResult = spawnSync('npm', ['ls', 'picomatch', '--omit=dev', '--json'], {
    cwd,
    encoding: 'utf8',
  });
  if (treeResult.stdout) {
    const treeOutPath = resolve(cwd, 'dependency-tree.json');
    writeFileSync(treeOutPath, treeResult.stdout, 'utf8');
  }

  // Run audit with --omit=dev --json
  const auditResult = spawnSync('npm', ['audit', '--omit=dev', '--json'], {
    cwd,
    encoding: 'utf8',
  });

  if (auditResult.error) {
    throw new Error(`Failed to execute npm audit: ${auditResult.error.message}`);
  }

  if (!auditResult.stdout || !auditResult.stdout.trim()) {
    throw new Error(
      `npm audit produced empty stdout. stderr: ${auditResult.stderr || 'none'}`
    );
  }

  const auditOutPath = resolve(cwd, 'audit-report.json');
  writeFileSync(auditOutPath, auditResult.stdout, 'utf8');

  let auditJson;
  try {
    auditJson = JSON.parse(auditResult.stdout);
  } catch (err) {
    throw new Error(`Malformed audit output (JSON parse error): ${err.message}`);
  }

  const validation = validateAuditReport(auditJson);
  console.log(
    `[AUDIT-WRAPPER] Approved exception ${validation.advisory} active until ${validation.expiry}. Production audit passed.`
  );
  return validation;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === resolve(currentFile)) {
  try {
    runAudit();
    process.exit(0);
  } catch (err) {
    console.error(`[AUDIT-WRAPPER ERROR] ${err.message}`);
    process.exit(1);
  }
}
