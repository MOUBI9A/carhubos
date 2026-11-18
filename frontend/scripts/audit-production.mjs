import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EXCEPTION_EXPIRY_UTC = '2026-12-02T23:59:59Z';
export const APPROVED_ADVISORY_ID = 'GHSA-fc5q-39xc-vjpf';
export const APPROVED_ADVISORY_SOURCE = 1247710;
export const EXPECTED_NODE_PATH = 'node_modules/@parcel/watcher/node_modules/picomatch';
export const EXPECTED_PARENT_NODE = 'node_modules/@parcel/watcher';
export const EXPECTED_NEXT_INTL_VERSION = '4.13.2';
export const EXPECTED_WATCHER_VERSION = '2.5.6';
export const EXPECTED_PICOMATCH_VERSION = '4.0.5';

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
  const root = lockfile.packages[''];
  const nextIntl = lockfile.packages['node_modules/next-intl'];
  const parcelWatcher = lockfile.packages['node_modules/@parcel/watcher'];
  const picomatch =
    lockfile.packages['node_modules/@parcel/watcher/node_modules/picomatch'];

  if (!root?.dependencies || root.dependencies['next-intl'] !== '^4.13.2') {
    throw new Error(
      `Lockfile root drift: expected next-intl@^4.13.2, got ${root?.dependencies?.['next-intl']}`
    );
  }
  if (root.dependencies['@parcel/watcher'] || root.dependencies.picomatch) {
    throw new Error(
      'Lockfile path drift: watcher or picomatch became a direct dependency'
    );
  }
  if (!nextIntl || nextIntl.version !== EXPECTED_NEXT_INTL_VERSION) {
    throw new Error(
      `Lockfile version drift: expected next-intl@${EXPECTED_NEXT_INTL_VERSION}, got ${nextIntl?.version}`
    );
  }
  if (nextIntl.dependencies?.['@parcel/watcher'] !== '^2.4.1') {
    throw new Error(
      `Lockfile path drift: expected next-intl -> @parcel/watcher@^2.4.1, got ${nextIntl.dependencies?.['@parcel/watcher']}`
    );
  }
  if (!parcelWatcher || parcelWatcher.version !== EXPECTED_WATCHER_VERSION) {
    throw new Error(
      `Lockfile version drift: expected @parcel/watcher@${EXPECTED_WATCHER_VERSION}, got ${parcelWatcher?.version}`
    );
  }
  if (parcelWatcher.dependencies?.picomatch !== '^4.0.3') {
    throw new Error(
      `Lockfile path drift: expected @parcel/watcher -> picomatch@^4.0.3, got ${parcelWatcher.dependencies?.picomatch}`
    );
  }
  if (!picomatch || picomatch.version !== EXPECTED_PICOMATCH_VERSION) {
    throw new Error(
      `Lockfile version drift: expected picomatch@${EXPECTED_PICOMATCH_VERSION}, got ${picomatch?.version}`
    );
  }
}

export function checkDependencyTree(tree) {
  const rootDependencies = tree?.dependencies;
  if (!rootDependencies || typeof rootDependencies !== 'object') {
    throw new Error('Dependency tree is invalid or missing dependencies');
  }
  const rootNames = Object.keys(rootDependencies);
  if (rootNames.length !== 1 || rootNames[0] !== 'next-intl') {
    throw new Error(
      `Dependency path drift: expected only next-intl at root, got ${JSON.stringify(rootNames)}`
    );
  }

  const nextIntl = rootDependencies['next-intl'];
  const nextIntlDependencies = nextIntl?.dependencies;
  if (
    nextIntl?.version !== EXPECTED_NEXT_INTL_VERSION ||
    !nextIntlDependencies ||
    Object.keys(nextIntlDependencies).length !== 1 ||
    !nextIntlDependencies['@parcel/watcher']
  ) {
    throw new Error('Dependency path drift: expected next-intl -> @parcel/watcher');
  }

  const watcher = nextIntlDependencies['@parcel/watcher'];
  const watcherDependencies = watcher?.dependencies;
  if (
    watcher?.version !== EXPECTED_WATCHER_VERSION ||
    !watcherDependencies ||
    Object.keys(watcherDependencies).length !== 1 ||
    !watcherDependencies.picomatch
  ) {
    throw new Error('Dependency path drift: expected @parcel/watcher -> picomatch');
  }

  const picomatch = watcherDependencies.picomatch;
  if (picomatch?.version !== EXPECTED_PICOMATCH_VERSION) {
    throw new Error(
      `Dependency version drift: expected picomatch@${EXPECTED_PICOMATCH_VERSION}, got ${picomatch?.version}`
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
  if (
    !Array.isArray(pico.nodes) ||
    pico.nodes.length !== 1 ||
    pico.nodes[0] !== EXPECTED_NODE_PATH
  ) {
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
    via.source !== APPROVED_ADVISORY_SOURCE ||
    via.url !== `https://github.com/advisories/${APPROVED_ADVISORY_ID}` ||
    via.name !== 'picomatch' ||
    via.dependency !== 'picomatch' ||
    via.severity !== 'high'
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
    watcher.nodes.length !== 1 ||
    watcher.nodes[0] !== EXPECTED_PARENT_NODE
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
  const spawn = options.spawnImpl || spawnSync;
  const writeFile = options.writeFileImpl || writeFileSync;
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
  const treeResult = spawn('npm', ['ls', 'picomatch', '--omit=dev', '--json'], {
    cwd,
    encoding: 'utf8',
  });
  if (treeResult.error) {
    throw new Error(`Failed to execute npm ls: ${treeResult.error.message}`);
  }
  if (treeResult.status !== 0) {
    throw new Error(
      `npm ls failed with status ${treeResult.status}. stderr: ${treeResult.stderr || 'none'}`
    );
  }
  if (!treeResult.stdout || !treeResult.stdout.trim()) {
    throw new Error('npm ls produced empty stdout');
  }
  const treeOutPath = resolve(cwd, 'dependency-tree.json');
  writeFile(treeOutPath, treeResult.stdout, 'utf8');
  let dependencyTree;
  try {
    dependencyTree = JSON.parse(treeResult.stdout);
  } catch (err) {
    throw new Error(`Malformed dependency tree (JSON parse error): ${err.message}`);
  }
  checkDependencyTree(dependencyTree);

  // Run audit with --omit=dev --json
  const auditResult = spawn('npm', ['audit', '--omit=dev', '--json'], {
    cwd,
    encoding: 'utf8',
  });

  if (auditResult.error) {
    throw new Error(`Failed to execute npm audit: ${auditResult.error.message}`);
  }
  if (auditResult.status !== 1) {
    throw new Error(
      `Unexpected npm audit status ${auditResult.status}; expected 1 for the approved finding. stderr: ${auditResult.stderr || 'none'}`
    );
  }

  if (!auditResult.stdout || !auditResult.stdout.trim()) {
    throw new Error(
      `npm audit produced empty stdout. stderr: ${auditResult.stderr || 'none'}`
    );
  }

  const auditOutPath = resolve(cwd, 'audit-report.json');
  writeFile(auditOutPath, auditResult.stdout, 'utf8');

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
